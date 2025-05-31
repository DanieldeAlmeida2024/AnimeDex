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
exports.getDarkMahouAnimePageUrl = getDarkMahouAnimePageUrl;
exports.searchAnimeTorrents = searchAnimeTorrents;
const url_1 = require("../constants/url");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const realDebridApi_1 = require("../../../utils/realDebridApi");
const DARKMAHOU_BASE_URL = url_1.TORRENT_ANIME_URL;
/**
 * Raspa os links de torrents de uma página de conteúdo de anime no DarkMahou.
 * Esta é uma função auxiliar interna.
 * @param contentPageUrl A URL da página do anime que lista os episódios/filmes.
 * @param animeTitle O título do anime para contexto de log.
 * @param requestedSeason (Opcional) A temporada específica a ser filtrada.
 * @param requestedEpisode (Opcional) O episódio específico a ser filtrado.
 * @returns Uma Promise que resolve para um array de ScrapedTorrentStream.

async function scrapeTorrentsFromDarkMahouContentPage(
    contentPageUrl: string,
    animeTitle: string,
    requestedSeason?: number,
    requestedEpisode?: number
): Promise<ScrapedTorrentStream[]> {
    const torrents: ScrapedTorrentStream[] = [];
    console.log(`[DarkMahouScraper] Raspando página de conteúdo: ${contentPageUrl}`);

    try {
        const { data } = await axios.get(contentPageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        // --- Lógica para encontrar links de torrents na página de conteúdo ---
        // Esta parte é um PALPITE baseado em estruturas comuns de sites de animes.
        // Você precisará INSPECIONAR O HTML REAL da página de conteúdo do DarkMahou
        // para encontrar os seletores corretos para os links de torrents.

        // Tentativa 1: Links diretos para torrents (magnet ou .torrent)
        // Procure por links que contenham 'magnet:?' ou terminem com '.torrent'
        $('div.soraddl').each((i, element) => {
            $(element).find('a[href*="magnet:?"], a[href$=".torrent"]').each((j, linkElement) => {
                const magnetLink = $(linkElement).attr('href');
                const linkText = $(element).text().trim();

                if (magnetLink) {
                    // Tente inferir o título do episódio/qualidade do texto do link ou de elementos próximos
                    const inferredTitle = linkText || animeTitle; // Use o texto do link ou o título do anime
                    let resolution = '';
                    const resMatch = inferredTitle.match(/(\d{3,4}[pPiP])/i);
                    if (resMatch) resolution = ` [${resMatch[1].toUpperCase()}]`;

                    let audioLang = '';
                    if (inferredTitle.match(/\[(dub|dublado)\]/i)) audioLang = ' [DUBLADO]';
                    else if (inferredTitle.match(/\[(sub|legendado)\]/i) || inferredTitle.match(/\[(jpn|jap)\]/i)) audioLang = ' [LEGENDADO]';
                    // Para DarkMahou, pode haver elementos específicos para seeders/size se eles listarem.
                    // Por enquanto, vamos assumir que não estão diretamente no link.
                    const seeders = 0; // DarkMahou pode não exibir seeders na página de conteúdo
                    const size = 'Desconhecido';

                    // Filtragem por episódio e temporada se solicitado
                    let isEpisodeMatch = true;
                    if (requestedSeason && requestedEpisode) {
                        const seasonPadded = String(requestedSeason).padStart(2, '0');
                        const episodePadded = String(requestedEpisode).padStart(2, '0');
                        const episodeRegex = new RegExp(
                            `s${seasonPadded}e${episodePadded}|${seasonPadded}x${episodePadded}|Season ${seasonPadded} - 0${episodePadded}|ep${episodePadded}|s ${seasonPadded} x 0${requestedEpisode}\\b|season ${seasonPadded} episode ${episodePadded}|${animeTitle} - ${seasonPadded}x${episodePadded}|${animeTitle} - S${seasonPadded}E${episodePadded}`,
                            'i'
                        );
                        if (!inferredTitle.match(episodeRegex) && !animeTitle.match(episodeRegex)) {
                            isEpisodeMatch = false;
                        }
                    }

                    if (isEpisodeMatch) {
                        torrents.push({
                            url: magnetLink,
                            name: `${animeTitle}${resolution}${audioLang} (${seeders} S) - DarkMahou`,
                            seeders: seeders,
                            size: size
                        });
                    } else {
                        console.log(`[DarkMahouScraper] Descartando torrent "${inferredTitle}" (não corresponde ao S${requestedSeason}E${requestedEpisode})`);
                    }
                }
            });
        });

        // Tentativa 2: Lista de episódios/arquivos de torrent em uma tabela ou lista
        // Exemplo: se houver uma tabela com links para download de episódios
        // Procure por seletores como 'table.episodes-list tr', 'div.episode-item a', etc.
        // Você precisará adaptar isso ao HTML real do DarkMahou.
        // Exemplo hipotético:
        // $('div.episode-list-item').each((idx, epElement) => {
        //     const epTitle = $(epElement).find('.episode-title').text().trim();
        //     const epMagnetLink = $(epElement).find('a.download-magnet').attr('href');
        //     // ... extrair seeders/size se disponível ...
        //     // ... aplicar a mesma lógica de filtragem e push ...
        // });

    } catch (error: any) {
        console.error(`[DarkMahouScraper] Erro ao raspar página de conteúdo ${contentPageUrl}:`, error.message);
    }

    return torrents;
}
 */
/**
 * Busca torrents de anime no DarkMahou.org.
 * @param animeTitle O título do anime a ser buscado.
 * @param season (Opcional) A temporada específica a ser filtrada.
 * @param episode (Opcional) O episódio específico a ser filtrado.
 * @returns Uma Promise que resolve para um array de ScrapedTorrentStream.
 */
function getDarkMahouAnimePageUrl(animeTitle, season, episode) {
    return __awaiter(this, void 0, void 0, function* () {
        let serieUrl = '';
        const encodedTitle = encodeURIComponent(animeTitle);
        const searchUrl = `${DARKMAHOU_BASE_URL}/?s=${encodedTitle}`;
        try {
            const { data } = yield axios_1.default.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const article = $('article.bs');
            const pageUrl = article.find('div > a').attr('href');
            serieUrl = pageUrl !== null && pageUrl !== void 0 ? pageUrl : '';
        }
        catch (error) {
            console.error(`[DarkMahouScraper] Erro ao fazer busca em DarkMahou.org para "${animeTitle}":`, error.message);
        }
        // Return an array of URLs (magnet links) from the ScrapedTorrentStream objects
        return serieUrl;
    });
}
function searchAnimeTorrents(animeTitle, targetSeason, targetEpisode) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const streams = [];
        const animePageUrl = yield getDarkMahouAnimePageUrl(animeTitle);
        if (!animePageUrl) {
            console.warn(`[DarkMahouScraper] Não foi possível encontrar a URL do anime no DarkMahou para: ${animeTitle}`);
            return [];
        }
        try {
            const { data } = yield axios_1.default.get(animePageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
                timeout: 20000
            });
            const $ = cheerio.load(data);
            const processingPromises = [];
            const divSeparators = $('div.soraddl');
            console.log(`[DarkMahouScraper] Encontrados ${divSeparators.length} div.soraddl elementos.`);
            // Mudar para um loop for...of para processar sequencialmente com atraso
            for (let i = 0; i < divSeparators.length; i++) {
                const divEl = divSeparators.get(i); // Obter o elemento JQuery
                console.log(`[DarkMahouScraper] Processando div.soraddl #${i}`);
                const torrentLinksInDiv = $(divEl).find('a[href*="magnet:"]');
                console.log(`[DarkMahouScraper] Encontrados ${torrentLinksInDiv.length} links magnet na div.soraddl #${i}.`);
                for (let j = 0; j < torrentLinksInDiv.length; j++) {
                    const linkEl = torrentLinksInDiv.get(j); // Obter o elemento JQuery
                    // **ADICIONAR ATRASO AQUI, ANTES DE CADA CHAMA AO REAL-DEBRID**
                    // Isso garante que não atingimos o rate limit do Real-Debrid
                    if (j > 0 || i > 0) { // Não atrasar o primeiro torrent da primeira div
                        const delayBetweenTorrents = 2000; // 2 segundos de atraso entre as chamadas ao Real-Debrid
                        console.log(`[DarkMahouScraper] Atrasando ${delayBetweenTorrents}ms antes de processar o próximo torrent.`);
                        yield new Promise(resolve => setTimeout(resolve, delayBetweenTorrents));
                    }
                    console.log(`[DarkMahouScraper] Processando link magnet #${j} na div #${i}`);
                    const magnetLink = $(linkEl).attr('href');
                    let displayTitle = '';
                    const dnMatch = magnetLink ? magnetLink.match(/&dn=([^&]+)/) : null;
                    if (dnMatch && dnMatch[1]) {
                        displayTitle = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
                    }
                    if (!displayTitle || displayTitle.length < 10) {
                        displayTitle = $(linkEl).text().trim().split('\n')[0].trim();
                    }
                    if (!displayTitle || displayTitle.length < 10) {
                        displayTitle = $(linkEl).find('span').text().trim().split('\n')[0].trim();
                    }
                    if (!displayTitle || displayTitle.length < 10) {
                        displayTitle = $(linkEl).find('strong').text().trim().split('\n')[0].trim();
                    }
                    if (!displayTitle || displayTitle.length < 10) {
                        displayTitle = ($(linkEl).parent().text().trim().split('\n')[0].trim() || displayTitle);
                    }
                    displayTitle = displayTitle.split('\n')[0].trim();
                    console.log(`[DarkMahouScraper] Final displayTitle para link #${j} div #${i}: "${displayTitle}"`);
                    if (!magnetLink || !displayTitle) {
                        console.warn(`[DarkMahouScraper] Link magnet ou displayTitle é vazio para link #${j} div #${i}. Pulando.`);
                        continue; // Usar 'continue' em vez de 'return' dentro do loop
                    }
                    const { season, episode, isBatch } = parseSeasonEpisode(displayTitle);
                    console.log(`[DarkMahouScraper] Parsed: Season: ${season}, Episode: ${episode}, Batch: ${isBatch} para "${displayTitle}"`);
                    let isRelevant = false;
                    let targetFilePattern;
                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        if (season === targetSeason && episode === targetEpisode && !isBatch) {
                            targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                            isRelevant = true;
                            console.log(`[DarkMahouScraper] Marcado como relevante: Episódio exato S${targetSeason}E${targetEpisode}.`);
                        }
                        else if (season === targetSeason && isBatch) {
                            targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`; // Passa o episódio para a seleção de arquivo do RD
                            isRelevant = true;
                            console.log(`[DarkMahouScraper] Marcado como relevante: Batch da temporada S${targetSeason} para requisição de episódio E${targetEpisode}.`);
                        }
                        else {
                            console.log(`[DarkMahouScraper] Ignorando torrent (não relevante para S${targetSeason}E${targetEpisode}): ${displayTitle}`);
                        }
                    }
                    else if (targetSeason !== undefined) {
                        if (season === targetSeason && isBatch) {
                            targetFilePattern = `S${String(targetSeason).padStart(2, '0')}`;
                            isRelevant = true;
                            console.log(`[DarkMahouScraper] Marcado como relevante: Batch da temporada S${targetSeason}.`);
                        }
                        else {
                            console.log(`[DarkMahouScraper] Ignorando torrent (não relevante para S${targetSeason} - não é batch ou temporada incorreta): ${displayTitle}`);
                        }
                    }
                    else {
                        if (isBatch) {
                            isRelevant = true;
                            console.log(`[DarkMahouScraper] Marcado como relevante: Batch para requisição geral.`);
                        }
                        else {
                            console.log(`[DarkMahouScraper] Ignorando torrent (não relevante para requisição geral - não é batch): ${displayTitle}`);
                        }
                    }
                    if (isRelevant) {
                        console.log(`[DarkMahouScraper] Tentando Real-Debrid para: ${displayTitle}`);
                        const directUrl = yield (0, realDebridApi_1.processMagnetForStreaming)(magnetLink, targetFilePattern); // Agora é um 'await'
                        if (directUrl) {
                            let streamTitle = `RD: DarkMahou `;
                            let streamName = `DarkMahou - ${displayTitle}`;
                            if (season && episode) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            else if (season && isBatch) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            else if (isBatch) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            streams.push({
                                name: streamName,
                                title: streamTitle,
                                url: directUrl,
                            });
                            console.log(`[DarkMahouScraper] Stream adicionado com sucesso (RD): ${displayTitle}`);
                        }
                        else {
                            console.warn(`[DarkMahouScraper] Falha ao obter link Real-Debrid para: ${displayTitle}.`);
                            console.log(`[DarkMahouScraper] Adicionando magnet link original como fallback para: ${displayTitle}.`);
                            /*
                            streams.push({
                                name: `Magnet: DarkMahou `,
                                title: `Magnet: DarkMahou - ${displayTitle}`,
                                url: magnetLink,
                            });
                            */
                        }
                    }
                } // Fim do loop torrentLinksInDiv
            } // Fim do loop divSeparators
            // Removemos o Promise.all, então não precisamos mais disso
            // await Promise.all(processingPromises);
            yield Promise.all(processingPromises);
        }
        catch (error) {
            console.error(`[DarkMahouScraper] Erro fatal ao raspar DarkMahou para ${animeTitle}:`, error);
            if (axios_1.default.isAxiosError(error)) {
                console.error(`Status: ${(_a = error.response) === null || _a === void 0 ? void 0 : _a.status}`);
                console.error(`Dados da Resposta:`, (_b = error.response) === null || _b === void 0 ? void 0 : _b.data);
            }
            return [];
        }
        return streams;
    });
}
function parseSeasonEpisode(title) {
    let season = 1; // Default para temporada 1 se não for especificado
    let episode;
    let isBatch = false;
    // Converte o título para minúsculas para facilitar a regex case-insensitive
    const lowerTitle = title.toLowerCase();
    // Regex para encontrar padrões de episódio (e opcionalmente temporada)
    // Ex: S01E01, [01], Ep. 01, - 01 -, (01)
    const episodeRegex = /(?:s(\d+))?\s*(?:e(\d+)|\[(\d+)\]|ep\.?\s*(\d+)|-\s*(\d+)\s*-|\((\d+)\)|episode\.?\s*(\d+)|episódio\.?\s*(\d+)|episodio\.?\s*(\d+))/i;
    let episodeMatch = lowerTitle.match(episodeRegex);
    if (episodeMatch) {
        season = parseInt(episodeMatch[1]) || 1; // Temporada (se presente, senão undefined)
        episode = parseInt(episodeMatch[2] || episodeMatch[3] || episodeMatch[4] || episodeMatch[5] || episodeMatch[6]);
        // Se encontramos um número de episódio, geralmente não é um batch, a menos que...
        if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    }
    else {
        // Se não encontrou padrão de episódio, procurar por padrões de temporada completa/batch
        const seasonBatchRegex = /(?:season\s*(\d+)|s(\d+))\s*(?:batch|completa|completo|Completa|Completo|full\s*season)?/i;
        let seasonBatchMatch = lowerTitle.match(seasonBatchRegex);
        if (seasonBatchMatch) {
            season = parseInt(seasonBatchMatch[1] || seasonBatchMatch[2]);
            isBatch = true; // É um batch de temporada
        }
        else if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            // Se tem palavras-chave de batch, mas sem número de temporada/episódio explícito
            isBatch = true;
            // Pode tentar inferir season=1 ou deixar undefined se não houver contexto
        }
    }
    return { season, episode, isBatch };
}
const BASE_TORRENT_ANIME_URL = url_1.TORRENT_ANIME_URL;
