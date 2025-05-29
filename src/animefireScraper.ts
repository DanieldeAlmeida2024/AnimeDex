import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedAnime, ScrapedEpisode, ScrapedStream } from './types';
import puppeteer from 'puppeteer';  

const BASE_URL = 'https://animefire.plus';

export async function scrapeRecentAnimes(type: 'movie' | 'series', page: number = 1): Promise<ScrapedAnime[]> {
    const url = `${BASE_URL}/${type === 'series' ? 'top-animes' : 'lista-de-filmes-dublados'}/${page}`;
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        const animes: ScrapedAnime[] = [];
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
            } else {
                console.warn(`Skipping incomplete anime data: Title=${title}, URL=${animefireUrl}, Poster=${poster}`);
            }
        });
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de animes recentes (${type}):`, error.message);
        return [];
    }
}

export async function searchAnimes(query: string, page: number = 1): Promise<ScrapedAnime[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/pesquisar/${encodedQuery}/${page}`;
    console.log(`Searching animes for "${query}" at: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        const animes: ScrapedAnime[] = [];
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
        console.log(`Found ${animes.length} animes for query "${query}".`);
        return animes;
    } catch (error: any) {
        console.error(`Erro ao fazer scraping de busca (${query}):`, error.message);
        return [];
    }
}

export async function scrapeAnimeDetails(animefireUrl: string): Promise<Partial<ScrapedAnime> | null> {
    console.log(`Scraping details for: ${animefireUrl}`);
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
        const background = $('div.anime_capa > img').attr('src');
        const title = $('div.anime_info_principal > h1').text().trim();
        const type = animefireUrl.includes('filmes') ? 'movie' : 'series';

        const episodes: ScrapedEpisode[] = [];
        if (type === 'series') {
            // Extrai o slug do anime da URL para construir a URL do episódio corretamente
            // Ex: de 'https://animefire.plus/animes/sousou-no-frieren-dublado-todos-os-episodios'
            // queremos 'sousou-no-frieren-dublado-todos-os-episodios'
            const animeSlugMatch = animefireUrl.match(/\/animes\/([^\/]+)(?:-todos-os-episodios)?\/?$/);
            const animeSlug = animeSlugMatch ? animeSlugMatch[1] : '';

            if (!animeSlug) {
                console.error(`[SCRAPER] Could not extract anime slug from URL: ${animefireUrl}`);
                // Continue, mas com um aviso, ou retorne null se a URL for essencial
            }

            $('div.div_video_list > a').each((i, el) => {
                const epUrlFromHref = $(el).attr('href');
                const epTitle = $(el).find('span.epT').text().trim() || $(el).text().trim().replace(/Episódio \d+:\s*/, '');
                
                // Tenta extrair o número do episódio do href se estiver no formato /NUMERO
                let episodeNumber: number;
                const epNumberMatch = epUrlFromHref?.match(/\/(\d+)$/);
                if (epNumberMatch) {
                    episodeNumber = parseInt(epNumberMatch[1]);
                } else {
                    // Fallback para o índice se o href não tiver o número no final
                    episodeNumber = i+1; // Assumes 1-based indexing for episodes
                }

                // CONSTRUA A URL DO EPISÓDIO CORRETAMENTE, INCLUINDO /episodio/
                // Ex: https://animefire.plus/animes/sousou-no-frieren-dublado-todos-os-episodios/episodio/1
                const fullEpisodeUrl = `${BASE_URL}/animes/${animeSlug}/episodio/${episodeNumber}`;

                console.log(`[EPISODE_SCRAPER] Original href from element: ${epUrlFromHref}`);
                console.log(`[EPISODE_SCRAPER] Constructed episode URL: ${fullEpisodeUrl}`);

                if (fullEpisodeUrl) {
                    episodes.push({
                        id: `${encodeURIComponent(animefireUrl)}:${episodeNumber}`,
                        title: epTitle,
                        season: 1, // Assumindo Season 1 para todos, ajuste se houver temporadas
                        episode: episodeNumber,
                        episodeUrl: fullEpisodeUrl, // Esta é a URL que será salva e usada para o Puppeteer
                    });
                }
            });
            console.log(`[SCRAPER] Found ${episodes.length} episodes for series: ${animefireUrl}`);
        }

        const scrapedDetails: Partial<ScrapedAnime> = {
            animefireUrl: animefireUrl,
            title: title,
            description: description,
            genres: genres,
            releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
            poster: poster,
            background: background,
            type: type,
            episodes: episodes.length > 0 ? episodes : undefined,
        };
        console.log(`[SCRAPER] Returning scraped details (first episode URL: ${scrapedDetails.episodes?.[0]?.episodeUrl})`);
        return scrapedDetails;

    } catch (error: any) {
        console.error(`[SCRAPER] Erro ao fazer scraping de detalhes do anime (${animefireUrl}):`, error.message);
        return null;
    }
}


export async function scrapeStreamsFromContentPage(contentUrl: string): Promise<ScrapedStream[]> {
    const partes = contentUrl.split("/");
    const episode = (parseInt(partes[partes.length - 1])).toString();
    partes[partes.length - 1] = episode; 
    let novoUrl = partes.join("/");

    console.log(`[STREAM_SCRAPER] Scraping streams from: ${contentUrl} using Puppeteer`);
    const streams: ScrapedStream[] = [];

    let browser;
    try {
        // Inicializa o navegador headless
        browser = await puppeteer.launch({
            headless: true // true para rodar sem interface, false para ver o navegador (útil para depuração)
        });
        const page = await browser.newPage();

        // Configura o User-Agent (importante para evitar bloqueios)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navega para a URL do episódio e espera até que a rede esteja inativa (indicando que a página carregou JS)
        await page.goto(contentUrl, { waitUntil: 'networkidle2', timeout: 30000 }); // Aumentei o timeout para 30s

        // Espera pelo elemento de vídeo aparecer no DOM. Isso é CRÍTICO.
        // O Stremio às vezes pode carregar as streams mais rápido do que o Puppeteer espera.
        // Ajuste este tempo se necessário. 5000ms (5 segundos) é um bom começo.
        await page.waitForSelector('#my-video_html5_api', { timeout: 15000 }); // Espera até 15 segundos pelo elemento

        // Agora, use o Puppeteer para extrair o atributo 'src' do elemento de vídeo
        const streamUrl = await page.$eval('#my-video_html5_api', videoElement => {
            // No contexto do navegador, tentamos pegar o 'src' ou 'data-video-src'
            const src = videoElement.getAttribute('src');
            const dataSrc = videoElement.getAttribute('data-video-src');
            console.log(`[PUPPETEER_EVAL] Found src: ${src}`);
            console.log(`[PUPPETEER_EVAL] Found data-video-src: ${dataSrc}`);
            // Priorize o 'src' que é a URL do arquivo de vídeo direto
            return src || dataSrc;
        });

        if (streamUrl && streamUrl.startsWith('https')) {
            if (await axios.get(streamUrl.replace('sd/', 'fhd/')).catch(() => false)) {
                streams.push({ url: streamUrl.replace('sd/', 'fhd/'), name: 'AnimeFire Player 1080p' });
            } 
            if(await axios.get(streamUrl.replace('sd/', 'hd/')).catch(() => false)){
                streams.push({ url: streamUrl.replace('sd/', 'fhd/'), name: 'AnimeFire Player 720p' });
            }
            streams.push({ url: streamUrl, name: 'AnimeFire Player SD' });
            
            console.log(`[STREAM_SCRAPER] Added stream via Puppeteer: ${streamUrl}`);
        } else {
            console.warn(`[STREAM_SCRAPER] No valid stream URL found via Puppeteer for #my-video_html5_api. Stream URL: ${streamUrl}`);
        }

        // Você pode adicionar lógica para iframes aqui também, se for um fallback necessário
        // Por exemplo:
        // const iframeSrc = await page.$eval('iframe.player-iframe', iframe => iframe.src).catch(() => null);
        // if (iframeSrc && iframeSrc.startsWith('http')) {
        //     streams.push({ url: iframeSrc, name: 'Player Externo (Iframe)' });
        //     console.log(`[STREAM_SCRAPER] Added iframe stream via Puppeteer: ${iframeSrc}`);
        // }

    } catch (error: any) {
        console.error(`[STREAM_SCRAPER] Erro ao fazer scraping de streams com Puppeteer (${novoUrl}):`, error.message);
        // Em caso de erro (ex: timeout do seletor), streams será vazio, o que resultará no erro "Nenhum stream encontrado".
    } finally {
        if (browser) {
            await browser.close(); // Sempre fechar o navegador
        }
    }

    console.log(`[STREAM_SCRAPER] Found ${streams.length} streams for ${novoUrl}.`);
    return streams;
}