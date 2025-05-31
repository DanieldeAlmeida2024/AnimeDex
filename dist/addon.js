"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
//import { TMDB } from 'tmdb-ts';
const dotenv = __importStar(require("dotenv")); // Para carregar variáveis de ambiente
const addon_1 = require("./providers/animefire/addon"); // Caminho para o seu handler do AnimeFire
const manifest_1 = require("./utils/manifest"); // Seu arquivo de manifesto
const darkmahouScraper_1 = require("./providers/darkmahou/services/darkmahouScraper"); // Seu scraper do DarkMahou
const realDebridApi_1 = require("./utils/realDebridApi");
dotenv.config();
const tmdb = require('moviedb')('07a3487ea23ce152789ad52a20a5a97f');
const MY_REALDEBRID_API_TOKEN = 'DZHL5NLGHSBKG7NTDUHSBY5LUPOJ4MFRAHSTSQFE2JA2YJGPUS5A';
(0, realDebridApi_1.setRealDebridAuthToken)(MY_REALDEBRID_API_TOKEN);
const builder = addonBuilder(manifest_1.manifest);
// --- Handler para Catálogo ---
builder.defineCatalogHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ type, id, extra, }) {
    try {
        const result = yield (0, addon_1.animefireCatalogHandler)(type, id, extra || {});
        // Adiciona cacheMaxAge conforme o SDK espera
        return { metas: result.metas, cacheMaxAge: 3600 }; // Cache de 1 hora
    }
    catch (error) {
        console.error(`Erro no catalog handler para ${id}:`, error);
        return { metas: [], cacheMaxAge: 300 }; // Retorna vazio em caso de erro, com cache curto
    }
}));
// --- Handler para Metadados ---
builder.defineMetaHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    try {
        const result = yield (0, addon_1.animefireMetaHandler)(id, type);
        // Adiciona cacheMaxAge conforme o SDK espera
        return { meta: result.meta, cacheMaxAge: 3600 }; // Cache de 1 hora
    }
    catch (error) {
        console.error(`Erro no meta handler para ${id}:`, error);
        // Retorne um objeto meta vazio ou um erro, dependendo de como você quer que o Stremio se comporte.
        // Para evitar o TypeError, deve retornar um objeto com 'meta' e 'cacheMaxAge'.
        return { meta: null, cacheMaxAge: 300 }; // Retorna meta nulo com cache curto
    }
}));
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    let streams = [];
    let animeTitleForTorrentSearch;
    let season;
    let episode;
    const idParts = id.split(':');
    if (id.startsWith('tt')) {
        const imdbId = idParts[0].replace('tt', '');
        if (type === 'series' && idParts.length >= 3) {
            season = parseInt(idParts[1]);
            episode = parseInt(idParts[2]);
        }
        try {
            let foundInTmdb = false; // Flag para saber se achamos o título no TMDB
            // Tentar buscar pelo ID externo (IMDb ID) primeiro
            // Use 'any' para evitar problemas de tipo com 'findResults'
            const findResults = yield new Promise((resolve, reject) => {
                tmdb.find({ id: imdbId, external_source: 'imdb_id' }, (err, res) => {
                    if (err)
                        reject(err);
                    else
                        resolve(res);
                });
            });
            if (type === 'movie' && findResults.movie_results && findResults.movie_results.length > 0) {
                const movieDetails = findResults.movie_results[0];
                animeTitleForTorrentSearch = movieDetails.title || movieDetails.original_title;
                foundInTmdb = true;
            }
            else if (type === 'series' && findResults.tv_results && findResults.tv_results.length > 0) {
                // Isso é o que gostaríamos que funcionasse para Frieren!
                const tvDetails = findResults.tv_results[0];
                animeTitleForTorrentSearch = tvDetails.name || tvDetails.original_name;
                foundInTmdb = true;
            }
            else {
                console.warn(`[StreamHandler] moviedb.find() não encontrou resultados diretos para IMDb ID: ${imdbId} (tipo: ${type}).`);
            }
            // **NOVA LÓGICA: Fallback para busca por nome se 'find' falhar para séries**
            if (!foundInTmdb && type === 'series') {
                // Precisamos de um nome para pesquisar. Como não temos, teremos que chutar ou mapear.
                // Esta é a parte mais tricky: como saber o nome da série só com o IMDb ID?
                // Idealmente, você teria um DB local para mapear.
                // Como último recurso, se você sabe que é ANIME, podemos tentar um nome genérico
                // ou um nome popular conhecido para testar.
                // Para o seu caso, "Frieren" seria o nome.
                // **ESTA É A PARTE QUE VOCÊ PRECISA AJUSTAR:**
                // Se você não pode obter o nome do anime via TMDB.find,
                // e o Stremio não te dá o nome diretamente no stream handler,
                // você precisará de uma forma de mapear o IMDb ID para um nome.
                // Sem um DB local ou outra API, é quase impossível.
                // Por enquanto, vamos assumir que você PODE ter um mapeamento local
                // ou que o nome pode ser inferido de alguma forma (mas não é escalável).
                // Para TESTAR, vamos simular que sabemos que tt22248376 é "Frieren".
                let fallbackAnimeName;
                if (imdbId === '22248376') { // APENAS PARA TESTE COM FRIEREN
                    fallbackAnimeName = 'Frieren';
                }
                // Adicione outros mapeamentos conhecidos se quiser, ou uma função que consulte seu DB local
                if (fallbackAnimeName) {
                    const searchResults = yield new Promise((resolve, reject) => {
                        // Use MDB.searchTv para séries
                        tmdb.searchTv({ query: fallbackAnimeName }, (err, res) => {
                            if (err)
                                reject(err);
                            else
                                resolve(res);
                        });
                    });
                    if (searchResults.results && searchResults.results.length > 0) {
                        // Iterar pelos resultados e verificar se algum deles corresponde ao IMDb ID original
                        // Isso é crucial para evitar pegar o anime errado!
                        const matchingResult = searchResults.results.find((result) => result.external_ids && result.external_ids.imdb_id === imdbId
                        // A API de busca por nome não retorna external_ids por padrão.
                        // Isso significa que esta verificação acima NÃO vai funcionar.
                        // Você teria que chamar MDB.tvInfo(result.id, { append_to_response: 'external_ids' })
                        // para CADA resultado, o que é muito ineficiente.
                        // A única forma de verificar o IMDb ID aqui é se searchTv já retornasse.
                        // Ou, se a sua instância de moviedb tem um método que faz isso.
                        // Dado isso, a busca por nome como fallback direto é arriscada sem um ID para comparação.
                        // A melhor aposta para o fallback é:
                        // Se MDB.find() falha para séries, então não há forma fácil de obter o nome via TMDB
                        // só com o IMDb ID no stream handler.
                        );
                        // O que podemos fazer é pegar o primeiro resultado que *parece* ser o correto.
                        // MUITO CUIDADO com isso, pode pegar o anime errado!
                        const firstSearchResult = searchResults.results[0];
                        animeTitleForTorrentSearch = firstSearchResult.name || firstSearchResult.original_name;
                        foundInTmdb = true; // Achamos pelo fallback
                    }
                    else {
                        console.warn(`[StreamHandler] moviedb.searchTv não encontrou resultados para "${fallbackAnimeName}".`);
                    }
                }
                else {
                    console.warn(`[StreamHandler] Nenhum nome de fallback definido para IMDb ID: ${imdbId}.`);
                }
            }
        }
        catch (error) {
            console.error(`[StreamHandler] Erro na API moviedb ou fallback para IMDb ID ${imdbId}:`, error);
            if (error.response) {
                console.error(`Status do Erro moviedb: ${error.response.status}`);
                console.error(`Dados do Erro moviedb:`, error.response.data);
            }
            else if (error.message) {
                console.error(`Mensagem de Erro moviedb:`, error.message);
            }
        }
    }
    else if (id.startsWith('kitsu:')) {
        console.warn(`[StreamHandler] ID Kitsu não suportado para busca de título: ${id}`);
    }
    else if (id.startsWith('animefire_')) {
        try {
            const afStreams = yield (0, addon_1.animefireStreamHandler)(id, type);
            streams.push(...afStreams.streams.map((s) => {
                var _a;
                return (Object.assign(Object.assign({}, s), { name: (_a = s.name) !== null && _a !== void 0 ? _a : 'Stream' }));
            }));
            if (!animeTitleForTorrentSearch) {
                const decodedAnimefireUrl = decodeURIComponent(id.split(':')[0].replace(`animefire_${type}_`, ''));
                console.warn(`[StreamHandler] Título para busca de torrents não inferido de ID animefire: ${id}.`);
            }
        }
        catch (error) {
            console.error(`[StreamHandler] Erro ao buscar streams do AnimeFire.plus para ${id}:`, error);
        }
    }
    else {
        console.warn(`[StreamHandler] ID de stream desconhecido: ${id}.`);
    }
    // 2. Buscar torrents do DarkMahou se tivermos um título
    if (animeTitleForTorrentSearch) {
        try {
            // Passe season e episode para ajudar o RD a encontrar o arquivo correto
            // Se for um batch, targetFilePattern será um padrão como "S01"
            let targetFilePattern;
            if (season && episode) {
                targetFilePattern = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
            }
            else if (season) {
                targetFilePattern = `S${String(season).padStart(2, '0')}`;
            }
            // searchAnimeTorrents agora lida com a lógica de RD internamente.
            const torrents = yield (0, darkmahouScraper_1.searchAnimeTorrents)(animeTitleForTorrentSearch, season, episode);
            streams.push(...torrents);
            // ... (log de sucesso) ...
        }
        catch (torrentError) {
            console.error(`[StreamHandler] Erro ao buscar torrents via DarkMahou/Real-Debrid para "${animeTitleForTorrentSearch}":`, torrentError);
        }
    }
    else {
    }
    if (streams.length === 0) {
        return { streams: [], cacheMaxAge: 300 };
    }
    return { streams: streams, cacheMaxAge: 3600 };
}));
// Inicia o servidor HTTP do addon
const app = (0, express_1.default)();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Stremio Addon rodando na porta 7000');
console.log('Manifest URL: http://localhost:7000/manifest.json');
