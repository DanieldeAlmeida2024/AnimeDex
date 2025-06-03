import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedAnimeAnimeFire, ScrapedEpisodeAnimeFire, ScrapedStream } from '../../../utils/types/types';
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
    animes = await getSearchAnimes(animes,query, page);
    return animes;
}

export async function scrapeAnimeDetails(animefireUrl: string): Promise<Partial<ScrapedAnimeAnimeFire> | null> {
    try {
        const { data } = await axios.get(animefireUrl, {
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
            description: description,
            genres: genres,
            releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
            poster: poster,
            background: poster,
            type: inferredType, 
            episodes: episodes.length > 0 ? episodes.map(ep => ({ ...ep, released: ep.released ?? '' })) : undefined,
        };


        return scrapedDetails;

    } catch (error: any) {
        console.error(`Erro ao raspar detalhes de ${animefireUrl}:`, error.message);
        return null;
    }
}

export async function scrapeStreamsFromContentPage(contentUrl: string): Promise<ScrapedStream[]> {
    let partes = contentUrl.split("/");
    const episode = (parseInt(partes[partes.length - 1])).toString();
    partes[partes.length - 1] = episode;
    let novoUrl = partes.join("/");
    const streams: ScrapedStream[] = [];
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true 
        });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(novoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#my-video_html5_api', { timeout: 15000 }); 

        const streamUrl = await page.$eval('#my-video_html5_api', videoElement => {
            const src = videoElement.getAttribute('src');
            const dataSrc = videoElement.getAttribute('data-video-src');
            return src || dataSrc;
        });

        if (streamUrl && streamUrl.startsWith('https')) {
            const streamUrlFHD = streamUrl.replace('sd/', 'fhd/');
            const streamUrlHD = streamUrl.replace('sd/', 'hd/');
            try {
                await axios.head(streamUrlFHD); 
                streams.push({ url: streamUrlFHD, name: 'AnimeFire Player 1080p' });
            } catch (err) {

            }

            try {
                await axios.head(streamUrlHD);
                streams.push({ url: streamUrlHD, name: 'AnimeFire Player 720p' });
            } catch (err) {

            }
            
            streams.push({ url: streamUrl, name: 'AnimeFire Player SD' });
        } else {
            console.warn(`[STREAM_SCRAPER] Nenhuma URL de stream válida encontrada para ${contentUrl}. URL: ${streamUrl}`);
        }

    } catch (error: any) {
        console.error(`[STREAM_SCRAPER] Erro ao fazer scraping de streams com Puppeteer (${contentUrl}):`, error.message);
    } finally {
        if (browser) {
            await browser.close(); 
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
            let animeNameCleaned = animeNameWithSpecialChars.replace(/[^a-zA-Z0-9áàâãéèêíìîóòôõúùûüçÇÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÜ\s]/g, '');

            if (animeNameCleaned && animefireUrl && poster) {
                const fullAnimefireUrl = animefireUrl.startsWith('http') ? animefireUrl : `${BASE_URL}${animefireUrl}`;

                animes.push({
                    title: animeNameCleaned,
                    poster: poster,
                    animefireUrl: fullAnimefireUrl,
                    type: type,
                    secoundName: animeSecoundNameWithSpecialChars,
                    description: descriptionInfo
                });
            } else {
                console.warn(`Skipping incomplete anime data: Title=${animeNameCleaned}, URL=${animefireUrl}, Poster=${poster}`);
            }
        }
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
        return [];
    }
}

async function getSearchAnimes(animes: ScrapedAnimeAnimeFire[],query: string ,page: number=1){

    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}${SEARCH_URL}/${encodedQuery}/${page}`;
    try {
        const { data } = await axios.get(url, {
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
                    type: type as 'movie' | 'series',
                });
            }
        });
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de busca (${query}):`, error.message);
        return [];
    }
}