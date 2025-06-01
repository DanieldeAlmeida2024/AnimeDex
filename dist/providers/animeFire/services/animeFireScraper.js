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
exports.scrapeTopAnimes = scrapeTopAnimes;
exports.scrapeAtualizadosAnimes = scrapeAtualizadosAnimes;
exports.scrapeDubladosAnimes = scrapeDubladosAnimes;
exports.scrapeLegendadosAnimes = scrapeLegendadosAnimes;
exports.searchAnimes = searchAnimes;
exports.scrapeAnimeDetails = scrapeAnimeDetails;
exports.scrapeStreamsFromContentPage = scrapeStreamsFromContentPage;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const url_1 = require("../constants/url");
// import { encode } from 'punycode'; // Não é necessário para este contexto e pode ser removido
const BASE_URL = url_1.PROVIDER_URL;
function scrapeRecentAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}${url_1.RECENT_SERIES_URL}/${page}`;
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
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (inferredType === type) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                    }
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
function scrapeTopAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}${url_1.SERIES_TOP_URL}/${page}`;
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
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (inferredType === type) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                        console.log(`[scrapeRecentAnimes] Descartando "${title}" (tipo ${inferredType}, esperado ${type})`);
                    }
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
function scrapeAtualizadosAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}${url_1.SERIES_UPGRADED_URL}/${page}`;
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
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (inferredType === type) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                        console.log(`[scrapeRecentAnimes] Descartando "${title}" (tipo ${inferredType}, esperado ${type})`);
                    }
                }
                else {
                    console.warn(`Skipping incomplete anime data: Title=${title}, URL=${animefireUrl}, Poster=${poster}`);
                }
            });
            console.log(`[SCRAPER ATUALIZADOS] ${animes}`);
            return animes;
        }
        catch (error) {
            console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
            return [];
        }
    });
}
function scrapeDubladosAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}${type === 'series' ? url_1.SERIES_BR_URL : url_1.MOVIES_BR_URL}/${page}`;
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
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (inferredType === type) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                        console.log(`[scrapeRecentAnimes] Descartando "${title}" (tipo ${inferredType}, esperado ${type})`);
                    }
                }
                else {
                    console.warn(`Skipping incomplete anime data: Title=${title}, URL=${animefireUrl}, Poster=${poster}`);
                }
            });
            console.log(`[SCRAPER DUBLADOS] ${animes}`);
            return animes;
        }
        catch (error) {
            console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
            return [];
        }
    });
}
function scrapeLegendadosAnimes(type_1) {
    return __awaiter(this, arguments, void 0, function* (type, page = 1) {
        const url = `${BASE_URL}/${type === 'series' ? url_1.SERIES_SUBTITLED_URL : url_1.MOVIES_SUBTITLED_URL}/${page}`;
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
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (inferredType === type) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                        console.log(`[scrapeRecentAnimes] Descartando "${title}" (tipo ${inferredType}, esperado ${type})`);
                    }
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
function searchAnimes(query, requestedType) {
    return __awaiter(this, void 0, void 0, function* () {
        const formattedQueryForUrl = query.trim().replace(/\s+/g, '-').toLowerCase();
        const url = `${BASE_URL}${url_1.SEARCH_URL}/${formattedQueryForUrl}`;
        const animes = [];
        try {
            const { data } = yield axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            $('div.divCardUltimosEps').each((i, element) => {
                const articleLink = $(element).find('article > a');
                const titleElement = articleLink.find('div.text-block > h3.animeTitle');
                const title = titleElement.text().trim();
                const animefireUrl = articleLink.attr('href');
                const poster = articleLink.find('img.imgAnimes').attr('data-src');
                if (title && animefireUrl && poster) {
                    const fullAnimefireUrl = animefireUrl.startsWith('http') ? animefireUrl : `${BASE_URL}${animefireUrl}`;
                    const normalizedTitle = title.toLowerCase();
                    const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : 'series';
                    if (!requestedType || inferredType === requestedType) {
                        animes.push({
                            title: title,
                            poster: poster,
                            animefireUrl: fullAnimefireUrl,
                            type: inferredType,
                        });
                    }
                    else {
                        console.log(`[searchAnimes] Descartando "${title}" (tipo ${inferredType}, esperado ${requestedType}) na busca.`);
                    }
                }
            });
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
            const description = $('div.desc_anime > p').text().trim();
            const genres = $('div.categorias_box > a').map((i, el) => $(el).text().trim()).get();
            const releaseYear = $('div.anime_info_principal_ep > span:nth-child(2)').text().trim();
            const poster = $('div.anime_image > img').attr('src');
            const background = $('div.anime_capa > img').attr('data-src');
            const title = $('div.anime_info_principal > h1').text().trim();
            const initialTypeFromUrl = animefireUrl.includes('filmes') ? 'movie' : 'series';
            const normalizedTitle = title.toLowerCase();
            const inferredType = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : initialTypeFromUrl;
            const episodes = [];
            if (inferredType === 'series') {
                const animeSlug = animefireUrl.replace('-todos-os-episodios', '');
                if (!animeSlug) {
                    console.error(`[SCRAPER] Could not extract anime slug from URL: ${animefireUrl}`);
                }
                $('div.div_video_list > a').each((i, el) => {
                    const epUrlFromHref = $(el).attr('href');
                    const epTitle = $(el).find('span.epT').text().trim() || $(el).text().trim().replace(/Episódio \d+:\s*/, '');
                    let episodeNumber;
                    const epNumberMatch = epUrlFromHref === null || epUrlFromHref === void 0 ? void 0 : epUrlFromHref.match(/\/(\d+)$/);
                    if (epNumberMatch) {
                        episodeNumber = parseInt(epNumberMatch[1]);
                    }
                    else {
                        episodeNumber = i + 1;
                    }
                    const fullEpisodeUrl = `${animeSlug}/${episodeNumber}`;
                    if (fullEpisodeUrl) {
                        episodes.push({
                            id: `${encodeURIComponent(animefireUrl)}:${episodeNumber}`,
                            title: epTitle,
                            season: 1,
                            episode: episodeNumber,
                            episodeUrl: fullEpisodeUrl,
                            released: undefined
                        });
                    }
                });
            }
            const scrapedDetails = {
                animefireUrl: animefireUrl,
                title: title,
                description: description,
                genres: genres,
                releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
                poster: poster,
                background: poster,
                type: inferredType,
                episodes: episodes.length > 0 ? episodes : undefined,
            };
            return scrapedDetails;
        }
        catch (error) {
            console.error(`Erro ao raspar detalhes de ${animefireUrl}:`, error.message);
            return null;
        }
    });
}
function scrapeStreamsFromContentPage(contentUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        let partes = contentUrl.split("/");
        const episode = (parseInt(partes[partes.length - 1])).toString();
        partes[partes.length - 1] = episode;
        let novoUrl = partes.join("/");
        const streams = [];
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                headless: true
            });
            const page = yield browser.newPage();
            yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            yield page.goto(novoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            yield page.waitForSelector('#my-video_html5_api', { timeout: 15000 });
            const streamUrl = yield page.$eval('#my-video_html5_api', videoElement => {
                const src = videoElement.getAttribute('src');
                const dataSrc = videoElement.getAttribute('data-video-src');
                return src || dataSrc;
            });
            if (streamUrl && streamUrl.startsWith('https')) {
                const streamUrlFHD = streamUrl.replace('sd/', 'fhd/');
                const streamUrlHD = streamUrl.replace('sd/', 'hd/');
                try {
                    yield axios_1.default.head(streamUrlFHD);
                    streams.push({ url: streamUrlFHD, name: 'AnimeFire Player 1080p' });
                }
                catch (err) {
                }
                try {
                    yield axios_1.default.head(streamUrlHD);
                    streams.push({ url: streamUrlHD, name: 'AnimeFire Player 720p' });
                }
                catch (err) {
                }
                streams.push({ url: streamUrl, name: 'AnimeFire Player SD' });
            }
            else {
                console.warn(`[STREAM_SCRAPER] Nenhuma URL de stream válida encontrada para ${contentUrl}. URL: ${streamUrl}`);
            }
        }
        catch (error) {
            console.error(`[STREAM_SCRAPER] Erro ao fazer scraping de streams com Puppeteer (${contentUrl}):`, error.message);
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
        return streams;
    });
}
