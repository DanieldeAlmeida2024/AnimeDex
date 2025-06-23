import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedAnimeAnimeFire, ScrapedEpisodeAnimeFire, ScrapedEpisodeTorrent, ScrapedStream } from '../../../utils/types/types';
import puppeteer from 'puppeteer';  
import {PROVIDER_URL,SEARCH_URL,SERIES_BR_URL,SERIES_SUBTITLED_URL,SERIES_TOP_URL,SERIES_UPGRADED_URL,RECENT_SERIES_URL,MOVIES_SUBTITLED_URL,MOVIES_BR_URL} from '../constants/url';
// import { encode } from 'punycode'; // Não é necessário para este contexto e pode ser removido

const BASE_URL = PROVIDER_URL;

export async function scrapeRecentAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    const url = `${BASE_URL}${RECENT_SERIES_URL}/${page}`;
    return await getAnimes(url, type, page);
}

export async function scrapeTopAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    const url = `${BASE_URL}${SERIES_TOP_URL}/${page}`;
    return await getAnimes(url, type,page);
}

export async function scrapeAtualizadosAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    const url = `${BASE_URL}${SERIES_UPGRADED_URL}/${page}`;
    return await getAnimes(url, type,page);
}

export async function scrapeDubladosAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    const url = `${BASE_URL}${type === 'series' ? SERIES_BR_URL : MOVIES_BR_URL}/${page}`;
    return await getAnimes(url,type, page);
}

export async function scrapeLegendadosAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    const url = `${BASE_URL}/${type === 'series' ? SERIES_SUBTITLED_URL : MOVIES_SUBTITLED_URL}/${page}`;
    return await getAnimes(url, type, page);
}

export async function searchAnimes(query: string, page: number = 1): Promise<ScrapedAnimeAnimeFire[]> {
    let animes: ScrapedAnimeAnimeFire[] = [];
    return await getSearchAnimes(animes,query, page);
}

export async function scrapeAnimeDetails(animefireUrl: string): Promise<Partial<ScrapedAnimeAnimeFire> | null> {
    try {
        const { data } = await axios.get(animefireUrl, {
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
        const secoundName = $('div.div_anime_names > h6').text().trim();
        const initialTypeFromUrl: 'movie' | 'series' = animefireUrl.includes('filmes') ? 'movie' : 'series';
        const normalizedTitle = title.toLowerCase();
        const inferredType: 'movie' | 'series' = (normalizedTitle.includes('film') || normalizedTitle.includes('movie')) ? 'movie' : initialTypeFromUrl;

        const episodes: ScrapedEpisodeAnimeFire[] = [];
        if (inferredType === 'series') { 
            const animeSlug = animefireUrl.replace('-todos-os-episodios', '');

            if (!animeSlug) {
                console.error(`[SCRAPER] Could not extract anime slug from URL: ${animefireUrl}`);
            }

            $('div.div_video_list > a').each((i, el) => {
                const epUrlFromHref = $(el).attr('href');
                const epTitle = $(el).find('span.epT').text().trim() || $(el).text().trim().replace(/Episódio \d+:\s*/, '');
                
                let episodeNumber: number;
                const epNumberMatch = epUrlFromHref?.match(/\/(\d+)$/);
                if (epNumberMatch) {
                    episodeNumber = parseInt(epNumberMatch[1]);
                } else {
                    episodeNumber = i+1; 
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

        const scrapedDetails: Partial<ScrapedAnimeAnimeFire> = {
            animefireUrl: animefireUrl,
            title: title,
            secoundName: secoundName,
            description: description,
            genres: genres,
            releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
            poster: poster,
            background: poster,
            type: inferredType, 
            episodes: episodes.length > 0 ? episodes.map(ep => ({ ...ep, released: ep.released ?? undefined })) : undefined,
        };


        return scrapedDetails;

    } catch (error: any) {
        console.error(`Erro ao raspar detalhes de ${animefireUrl}:`, error.message);
        return null;
    }
}

export async function scrapeStreamsFromContentPage(contentUrl: string): Promise<ScrapedStream[]> {

    const streams: ScrapedStream[] = [];
    try {
        // 1. Fazer a requisição para a contentUrl para obter a URL da página de download
        const { data: initialPageData } = await axios.get(contentUrl.replace("-todos-os-episodios", ''), {
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
            const { data: downloadPageData } = await axios.get(downloadPageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $download = cheerio.load(downloadPageData);

            // Seleciona todos os links com a classe 'quicksand300'
            const links = $download('a.quicksand300');

            let streamLinkSd: string | undefined;
            let streamLinkHd: string | undefined;
            let streamLinkFHd: string | undefined;

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
                    } else if (quality === 'HD') {
                        streamLinkHd = href;
                    } else if (quality === 'F-HD') {
                        streamLinkFHd = href;
                    }
                } else {
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

        } else {
            console.warn(`[STREAM_SCRAPER] Nenhuma URL de download válida encontrada para ${contentUrl}. URL: ${downloadPageUrl}`);
        }

    } catch (error: any) {
    if (error.response) {
        // O servidor respondeu com um status code fora da faixa 2xx
        console.error(`[STREAM_SCRAPER] Erro de resposta do servidor (${contentUrl}):`);
        console.error(`Status: ${error.response.status}`);
        console.error(`Headers: ${error.response.headers}`);
        console.error(`Dados: ${error.response.data}`); // Isto pode conter a mensagem de erro do servidor
    } else if (error.request) {
        // A requisição foi feita, mas nenhuma resposta foi recebida
        console.error(`[STREAM_SCRAPER] Nenhuma resposta recebida para a requisição (${contentUrl}):`);
        console.error(error.request);
    } else {
        // Algo mais causou o erro
        console.error(`[STREAM_SCRAPER] Erro ao configurar a requisição (${contentUrl}):`);
        console.error('Mensagem:', error.message);
    }
    }

    return streams;
}

async function getAnimeInfo(urlAnimeFire: string): Promise<{animeName: string, secoundName: string, description: string}>{
    let animeName;
    let secoundName;
    let description;
    try {
        const { data } = await axios.get(urlAnimeFire, {
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
    }catch (e: any){
        return { animeName: '', secoundName: '', description: '' };
    }
}

async function getAnimes(url: string,type: 'movie' | 'series', page: number = 1){
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        const animes: ScrapedAnimeAnimeFire[] = [];
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
            } else {
                console.warn(`Skipping incomplete anime data: Title=${animeNameWithSpecialChars}, URL=${animefireUrl}, Poster=${poster}`);
            }
        }
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
        return [];
    }
}

async function getSearchAnimes(animes: ScrapedAnimeAnimeFire[],query: string ,page: number=1){

    const encodedQuery = query.replace(" ", "-");
    const url = `${BASE_URL}${SEARCH_URL}/${encodedQuery}`;
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        $('div.divCardUltimosEps').each((i, element) => {
            const articleLink = $(element).find('article > a');
            const titleElement = articleLink.find('h3.animeTitle');
            const title = titleElement.text().trim();
            const animefireUrl = articleLink.attr('href');
            const poster = articleLink.find('img.imgAnimes').attr('data-src');

            if (title && animefireUrl && poster) {
                const type = animefireUrl.includes('/filme/') ? 'movie' : 'series';
                animes.push({
                    title: title,
                    poster: poster,
                    animefireUrl: animefireUrl,
                    type: type,
                });
            }
        });
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de busca (${query}):`, error.message);
        return [];
    }
}