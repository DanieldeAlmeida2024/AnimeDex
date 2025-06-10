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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeStreamsFromContentPage = exports.scrapeAnimeDetails = exports.searchAnimes = exports.scrapeLegendadosAnimes = exports.scrapeDubladosAnimes = exports.scrapeAtualizadosAnimes = exports.scrapeTopAnimes = exports.scrapeRecentAnimes = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const url_1 = require("../constants/url");
// import { encode } from 'punycode'; // Não é necessário para este contexto e pode ser removido
const BASE_URL = url_1.PROVIDER_URL;
async function scrapeRecentAnimes(type, page = 1) {
    const url = `${BASE_URL}${url_1.RECENT_SERIES_URL}/${page}`;
    return await getAnimes(url, type, page);
}
exports.scrapeRecentAnimes = scrapeRecentAnimes;
async function scrapeTopAnimes(type, page = 1) {
    const url = `${BASE_URL}${url_1.SERIES_TOP_URL}/${page}`;
    return await getAnimes(url, type, page);
}
exports.scrapeTopAnimes = scrapeTopAnimes;
async function scrapeAtualizadosAnimes(type, page = 1) {
    const url = `${BASE_URL}${url_1.SERIES_UPGRADED_URL}/${page}`;
    return await getAnimes(url, type, page);
}
exports.scrapeAtualizadosAnimes = scrapeAtualizadosAnimes;
async function scrapeDubladosAnimes(type, page = 1) {
    const url = `${BASE_URL}${type === 'series' ? url_1.SERIES_BR_URL : url_1.MOVIES_BR_URL}/${page}`;
    return await getAnimes(url, type, page);
}
exports.scrapeDubladosAnimes = scrapeDubladosAnimes;
async function scrapeLegendadosAnimes(type, page = 1) {
    const url = `${BASE_URL}/${type === 'series' ? url_1.SERIES_SUBTITLED_URL : url_1.MOVIES_SUBTITLED_URL}/${page}`;
    return await getAnimes(url, type, page);
}
exports.scrapeLegendadosAnimes = scrapeLegendadosAnimes;
async function searchAnimes(query, page = 1) {
    let animes = [];
    animes = await getSearchAnimes(animes, query, page);
    return animes;
}
exports.searchAnimes = searchAnimes;
async function scrapeAnimeDetails(animefireUrl) {
    try {
        const { data } = await axios_1.default.get(animefireUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const description = $('span.spanAnimeInfo').text().trim();
        const genres = $('div.animeInfo > a').map((i, el) => $(el).text().trim()).get();
        const releaseYear = $('div.animeInfo > span').text().trim();
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
                const epNumberMatch = epUrlFromHref?.match(/\/(\d+)$/);
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
                        released: undefined,
                        description: undefined
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
            episodes: episodes.length > 0 ? episodes.map(ep => ({ ...ep, released: ep.released ?? undefined })) : undefined,
        };
        return scrapedDetails;
    }
    catch (error) {
        console.error(`Erro ao raspar detalhes de ${animefireUrl}:`, error.message);
        return null;
    }
}
exports.scrapeAnimeDetails = scrapeAnimeDetails;
async function scrapeStreamsFromContentPage(contentUrl) {
    const streams = [];
    try {
        // 1. Fazer a requisição para a contentUrl para obter a URL da página de download
        const { data: initialPageData } = await axios_1.default.get(contentUrl.replace("-todos-os-episodios", ''), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $initial = cheerio.load(initialPageData);
        // Seleciona o elemento com id 'dw' e obtém seu atributo 'href'
        // Com Cheerio, você pode acessar atributos diretamente:
        const downloadPageUrl = $initial('#dw').attr('href');
        if (downloadPageUrl && downloadPageUrl.startsWith('https')) {
            console.log(`[STREAM_SCRAPER] Encontrada URL da página de download: ${downloadPageUrl}`);
            // 2. Fazer a requisição para a downloadPageUrl para obter os links de stream
            const { data: downloadPageData } = await axios_1.default.get(downloadPageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $download = cheerio.load(downloadPageData);
            // Seleciona todos os links com a classe 'quicksand300'
            const links = $download('a.quicksand300');
            let streamLinkSd;
            let streamLinkHd;
            let streamLinkFHd;
            // Itera sobre os links encontrados
            links.each((index, element) => {
                const link = $download(element); // Envolve o elemento com Cheerio para usar métodos
                const quality = (link.text() ?? '').trim(); // Obtém o texto do link (qualidade)
                // Obtém o atributo 'download' e remove parâmetros de query
                const href = (link.attr('download') ?? '')?.split('?')[0];
                console.log(`Verificações Qualidade: ${quality}, href: ${href}`);
                if (typeof href === 'string' && (href.endsWith('.mp4') || href.endsWith('.webm') || href.endsWith('.avi') || href.endsWith('.mov') || href.endsWith('.mkv'))) {
                    if (quality === 'SD') {
                        streamLinkSd = href;
                    }
                    else if (quality === 'HD') {
                        streamLinkHd = href;
                    }
                    else if (quality === 'F-HD') {
                        streamLinkFHd = href;
                    }
                }
                else {
                    console.log(`Qualidade: ${quality}, Não é um link de vídeo reconhecido: ${href}`);
                }
            });
            // Adiciona os streams ao array 'streams' se encontrados
            if (streamLinkSd) {
                console.log(`Stream 480p: ${streamLinkSd}`);
                streams.push({
                    url: streamLinkSd,
                    name: 'AnimeFire Video 480p',
                    quality: 'SD'
                });
            }
            if (streamLinkHd) {
                console.log(`Stream 720: ${streamLinkHd}`);
                streams.push({
                    url: streamLinkHd,
                    name: 'AnimeFire Video 720p',
                    quality: 'HD'
                });
            }
            if (streamLinkFHd) {
                console.log(`Stream 1080p: ${streamLinkFHd}`);
                streams.push({
                    url: streamLinkFHd,
                    name: 'AnimeFire Player 1080p',
                    quality: 'F-HD'
                });
            }
        }
        else {
            console.warn(`[STREAM_SCRAPER] Nenhuma URL de download válida encontrada para ${contentUrl}. URL: ${downloadPageUrl}`);
        }
    }
    catch (error) {
        if (error.response) {
            // O servidor respondeu com um status code fora da faixa 2xx
            console.error(`[STREAM_SCRAPER] Erro de resposta do servidor (${contentUrl}):`);
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers: ${error.response.headers}`);
            console.error(`Dados: ${error.response.data}`); // Isto pode conter a mensagem de erro do servidor
        }
        else if (error.request) {
            // A requisição foi feita, mas nenhuma resposta foi recebida
            console.error(`[STREAM_SCRAPER] Nenhuma resposta recebida para a requisição (${contentUrl}):`);
            console.error(error.request);
        }
        else {
            // Algo mais causou o erro
            console.error(`[STREAM_SCRAPER] Erro ao configurar a requisição (${contentUrl}):`);
            console.error('Mensagem:', error.message);
        }
    }
    return streams;
}
exports.scrapeStreamsFromContentPage = scrapeStreamsFromContentPage;
async function getUrlStremAnimeFire(contentUrl) {
}
async function getAnimeInfo(urlAnimeFire) {
    let animeName;
    let secoundName;
    let description;
    try {
        const { data } = await axios_1.default.get(urlAnimeFire, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        animeName = $('div.div_anime_names > h1.mb-0').text().trim();
        secoundName = $('div.div_anime_names > h6.mb-0').text().trim();
        description = $('div.divSinopse > span.spanAnimeInfo').text().trim();
        animeName = animeName.replace(/[^a-zA-ZáàâãéèêíìîóòôõúùûüçÇÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÜ\s]/g, '');
        return { animeName, secoundName, description };
    }
    catch (e) {
        return { animeName: '', secoundName: '', description: '' };
    }
}
async function getAnimes(url, type, page = 1) {
    try {
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const animes = [];
        const animeElements = $('div.divCardUltimosEps').toArray();
        for (const element of animeElements) {
            const articleLink = $(element).find('article > a');
            const href = articleLink.attr('href');
            const animeInfo = href ? await getAnimeInfo(href) : undefined;
            let animeNameWithSpecialChars = animeInfo?.animeName ? animeInfo.animeName.trim() : '';
            let animeSecoundNameWithSpecialChars = animeInfo?.secoundName ? animeInfo.secoundName.trim() : '';
            const descriptionInfo = animeInfo?.description ? animeInfo.description.trim() : '';
            const animefireUrl = articleLink.attr('href');
            const poster = articleLink.find('img.imgAnimes').attr('data-src');
            if (animeNameWithSpecialChars && animefireUrl && poster) {
                const fullAnimefireUrl = animefireUrl.startsWith('http') ? animefireUrl : `${BASE_URL}${animefireUrl}`;
                animes.push({
                    title: animeNameWithSpecialChars,
                    poster: poster,
                    animefireUrl: fullAnimefireUrl,
                    type: type,
                    secoundName: animeSecoundNameWithSpecialChars,
                    description: descriptionInfo
                });
            }
            else {
                console.warn(`Skipping incomplete anime data: Title=${animeNameWithSpecialChars}, URL=${animefireUrl}, Poster=${poster}`);
            }
        }
        return animes;
    }
    catch (error) {
        console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
        return [];
    }
}
async function getSearchAnimes(animes, query, page = 1) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}${url_1.SEARCH_URL}/${encodedQuery}/${page}`;
    try {
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        ;
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
        return animes;
    }
    catch (error) {
        console.error(`Erro ao fazer scraping de busca (${query}):`, error.message);
        return [];
    }
}
