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
exports.scrapeRecentAnimes = scrapeRecentAnimes;
exports.searchAnimes = searchAnimes;
exports.scrapeAnimeDetails = scrapeAnimeDetails;
exports.scrapeStreamsFromContentPage = scrapeStreamsFromContentPage;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const BASE_URL = 'https://animefire.plus';
function scrapeRecentAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}/${type === 'series' ? 'top-animes' : 'lista-de-filmes-dublados'}/${page}`;
        try {
            const { data } = yield axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const animes = [];
            $('div.divCardUltimosEps').each((i, element) => {
                const articleLink = $(element).find('article > a');
                const titleElement = articleLink.find('div.text-block > h3.animeTitle');
                const title = titleElement.text().trim();
                const animefireUrl = articleLink.attr('href');
                const poster = articleLink.find('img.imgAnimes').attr('data-src');
                if (title && animefireUrl && poster) {
                    const fullAnimefireUrl = animefireUrl.startsWith('http') ? animefireUrl : `${BASE_URL}${animefireUrl}`;
                    animes.push({
                        title: title,
                        poster: poster,
                        animefireUrl: fullAnimefireUrl,
                        type: type,
                    });
                }
                else {
                    console.warn(`Skipping incomplete anime data: Title=${title}, URL=${animefireUrl}, Poster=${poster}`);
                }
            });
            return animes;
        }
        catch (error) {
            console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
            return [];
        }
    });
}
function searchAnimes(query_1) {
    return __awaiter(this, arguments, void 0, function* (query, page = 1) {
        const encodedQuery = encodeURIComponent(query);
        const url = `${BASE_URL}/pesquisar/${encodedQuery}/${page}`;
        console.log(`Searching animes for "${query}" at: ${url}`);
        try {
            const { data } = yield axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const animes = [];
            $('div.card_anime').each((i, element) => {
                const articleLink = $(element).find('article > a');
                const titleElement = articleLink.find('div.text-block > h3.animeTitle');
                const title = titleElement.text().trim();
                const animefireUrl = articleLink.attr('href');
                const poster = articleLink.find('img.transitioning_src').attr('data-src');
                if (title && animefireUrl && poster) {
                    const type = animefireUrl.includes('/filme/') ? 'movie' : 'series';
                    animes.push({
                        title: title,
                        poster: poster,
                        animefireUrl: `${BASE_URL}${animefireUrl}`,
                        type: type,
                    });
                }
            });
            console.log(`Found ${animes.length} animes for query "${query}".`);
            return animes;
        }
        catch (error) {
            console.error(`Erro ao fazer scraping de busca (${query}):`, error.message);
            return [];
        }
    });
}
function scrapeAnimeDetails(animefireUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield axios_1.default.get(animefireUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const description = $('div.divSinopse > span.spanAnimeInfo').text().trim();
            const genres = $('div.animeInfo a.spanGeneros').map((i, el) => $(el).text().trim()).get();
            const releaseYearMatch = $('div.divAnimePageInfo div.animeInfo:nth-child(8) > span.spanAnimeInfo').text().match(/\d{4}/);
            const releaseYear = releaseYearMatch ? parseInt(releaseYearMatch[0]) : undefined;
            const poster = $('img.capa-anime-poster').attr('src');
            let background = $('div.sub_animepage_img > img').attr('data-src');
            const type = animefireUrl.includes('/filme/') ? 'movie' : 'series';
            const episodes = [];
            if (type === 'series') {
                $('div.div_video_list > a').each((i, el) => {
                    const epUrl = $(el).attr('href');
                    const epTitle = $(el).find('span.epT').text().trim() || $(el).text().trim().replace(/Episódio \d+:\s*/, '');
                    const epNumberMatch = epUrl === null || epUrl === void 0 ? void 0 : epUrl.match(/\/(\d+)$/);
                    const episodeNumber = epNumberMatch ? parseInt(epNumberMatch[0]) : (i + 1);
                    console.log("epNumberMatch: " + episodeNumber);
                    if (epUrl) {
                        const fullEpisodeUrl = epUrl.startsWith('http') ? epUrl : `${BASE_URL}${epUrl}`;
                        episodes.push({
                            id: `${encodeURIComponent(animefireUrl)}:${episodeNumber}`,
                            title: epTitle,
                            season: 1,
                            episode: episodeNumber,
                            episodeUrl: fullEpisodeUrl,
                        });
                    }
                });
                console.log(`Found ${episodes.length} episodes for series: ${animefireUrl}`);
            }
            return {
                type: type,
                animefireUrl: animefireUrl,
                description: description,
                genres: genres,
                releaseYear: releaseYear,
                background: background,
                poster: poster,
                episodes: episodes.length > 0 ? episodes : undefined,
            };
        }
        catch (error) {
            console.error(`Erro ao fazer scraping de detalhes do anime (${animefireUrl}):`, error.message);
            return null;
        }
    });
}
function scrapeStreamsFromContentPage(contentUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const streams = [];
        try {
            const { data } = yield axios_1.default.get(contentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // Estratégia Principal: Usar o ID fornecido para a tag <video>
            const videoElement = $("video");
            if (videoElement && videoElement.length > 0) {
                console.log(`[STREAM_SCRAPER] Found <video> tag with ID #my-video_html5_api.`);
                // 1. Tentar pegar o src diretamente da tag <video>
                let videoSrc = videoElement.attr("src");
                if (videoSrc && videoSrc.startsWith('https')) {
                    streams.push({ url: videoSrc, name: 'AnimeFire Direct (MP4)' });
                    console.log(`[STREAM_SCRAPER] Added direct video src: ${videoSrc}`);
                }
                // 2. Tentar pegar o 'data-video-src' como alternativa (pode ser um redirecionador ou outra fonte)
                if (streams.length === 0) { // Adiciona apenas se 'src' não forneceu um stream
                    const dataVideoSrc = $("video").attr("src");
                    if (dataVideoSrc && dataVideoSrc.startsWith('https')) {
                        // O 'data-video-src' às vezes precisa de um request adicional para obter a URL final.
                        // Para simplicidade, vamos adicioná-lo diretamente. O Stremio tentará abrir.
                        streams.push({ url: dataVideoSrc, name: 'AnimeFire (Data Stream)' });
                        console.log(`[STREAM_SCRAPER] Added data-video-src: ${dataVideoSrc}`);
                    }
                }
            }
            else {
                console.log(`[STREAM_SCRAPER] <video> tag with ID #my-video_html5_api not found. Trying iframe.`);
                // Estratégia Secundária: Procurar por iframes de players externos (fallback)
                const playerIframe = $('iframe.player-iframe');
                if (playerIframe.length > 0) {
                    const iframeSrc = playerIframe.attr('src');
                    if (iframeSrc) {
                        streams.push({ url: iframeSrc, name: 'Player Externo (Iframe)' });
                        console.log(`[STREAM_SCRAPER] Added iframe stream: ${iframeSrc}`);
                    }
                }
                else {
                    $('iframe').each((i, el) => {
                        const genericIframeSrc = $(el).attr('src');
                        if (genericIframeSrc && (genericIframeSrc.includes('player') || genericIframeSrc.includes('embed') || genericIframeSrc.includes('video'))) {
                            streams.push({ url: genericIframeSrc, name: `Player Externo (Iframe Genérico ${i + 1})` });
                            console.log(`[STREAM_SCRAPER] Added generic iframe stream: ${genericIframeSrc}`);
                        }
                    });
                }
            }
            console.log(`[STREAM_SCRAPER] Found ${streams.length} streams for ${contentUrl}.`);
            return streams;
        }
        catch (error) {
            console.error(`[STREAM_SCRAPER] Erro ao fazer scraping de streams (${contentUrl}):`, error.message);
            return [];
        }
    });
}
