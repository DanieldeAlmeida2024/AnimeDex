"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExistingStremioMetaByTitleAndType = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Tenta obter informações de meta do Stremio existentes consultando o catálogo do Cinemeta.
 *
 * AVISO: Esta abordagem é experimental e pode ser frágil!
 * - Depende da estrutura da API pública do Cinemeta, que pode mudar.
 * - Pode ser bloqueada por CORS ou rate limiting.
 * - É ineficiente para chamadas em massa.
 * - Idealmente, você armazenaria os stremioIds em sua própria DB após a primeira correspondência.
 *
 * @param {string} title O título do anime a ser pesquisado.
 * @param {'movie' | 'series'} type O tipo de conteúdo (filme ou série).
 * @returns {Promise<any | null>} Um objeto com as informações da meta do Stremio se encontrado, ou null.
 */
async function getExistingStremioMetaByTitleAndType(title, type) {
    console.log(`[ADDON ANIMEFIRE] Tentando buscar meta no Cinemeta para: "${title}" (Tipo: ${type})`);
    const CINEMETA_URL = 'https://v3.stremio.com'; // URL base do Cinemeta v3
    // Cinemeta usa 'imdb_id' ou 'tmdb_id' para meta requests diretos.
    // Para buscar por título, precisaríamos usar o catálogo e filtrar.
    // A Cinemeta geralmente oferece catálogos como '/catalog/movie/top.json' ou '/catalog/series/popular.json'.
    // A busca por título não é um endpoint direto como '/meta/movie/byTitle.json?title=...'
    // Precisaríamos pegar um catálogo inteiro e filtrar, o que é ineficiente.
    // **Alternativa mais realista (mas ainda assim uma estimativa):**
    // Tentaremos simular uma busca por uma parte do título em um catálogo genérico.
    // Isso é um palpite e pode não funcionar como esperado.
    const searchCatalogPath = `/catalog/${type}/top.json`; // Ex: /catalog/series/top.json
    const searchRequestUrl = `${CINEMETA_URL}${searchCatalogPath}?search=${encodeURIComponent(title)}`;
    try {
        const response = await axios_1.default.get(searchRequestUrl, {
            headers: {
                // Cinemeta pode ter headers específicos ou ignorar alguns
                'User-Agent': 'Stremio-Addon-Animefire-Bot/1.0' // Boa prática para identificar seu bot
            }
        });
        if (response.status === 200 && response.data && response.data.metas) {
            // Filtrar os resultados. A Cinemeta retorna muitos, você precisa encontrar o mais relevante.
            const matchingMeta = response.data.metas.find((meta) => meta.name && meta.name.toLowerCase() === title.toLowerCase() && meta.type === type);
            if (matchingMeta) {
                console.log(`[ADDON ANIMEFIRE] Meta Stremio existente encontrada no Cinemeta para: "${title}" (ID: ${matchingMeta.id})`);
                // Retorna um objeto formatado para ser compatível com saveAnimesToDatabase e a construção da meta.
                // Note que o Cinemeta pode não ter todos os campos que você precisa (ex: releaseYear diretamente no catálogo meta).
                return {
                    stremioId: matchingMeta.id,
                    title: matchingMeta.name,
                    type: matchingMeta.type,
                    poster: matchingMeta.poster,
                    background: matchingMeta.background || matchingMeta.poster,
                    description: matchingMeta.description || '',
                    genres: matchingMeta.genres ? JSON.stringify(matchingMeta.genres) : '[]',
                    releaseYear: matchingMeta.releaseInfo ? parseInt(matchingMeta.releaseInfo.substring(0, 4)) : undefined, // Tenta extrair ano
                    // Outros campos podem ser necessários dependendo do seu 'savedAnimeRecord'
                };
            }
        }
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error(`[ADDON ANIMEFIRE] Erro ao buscar meta no Cinemeta para "${title}" (Status: ${error.response.status}):`, error.response.data);
        }
        else {
            console.error(`[ADDON ANIMEFIRE] Erro desconhecido ao buscar meta no Cinemeta para "${title}":`, error);
        }
    }
    console.log(`[ADDON ANIMEFIRE] Nenhuma meta Stremio existente encontrada no Cinemeta para: "${title}"`);
    return null;
}
exports.getExistingStremioMetaByTitleAndType = getExistingStremioMetaByTitleAndType;
