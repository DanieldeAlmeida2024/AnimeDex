import { Meta, ScrapedEpisodeAnimeFire, ScrapedStream, ScrapedStreamAnimeFire, Stream } from '../../utils/types/types';
import { PROVIDER_URL } from './constants/url';
import { ScrapedAnimeAnimeFire } from '../../utils/types/types';
import { scrapeAtualizadosAnimes, scrapeDubladosAnimes, scrapeLegendadosAnimes, scrapeTopAnimes,scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './services/animeFireScraper';
import {  getTmdbInfoByImdbId, getTmdbInfoByName } from '../../utils/tmdbApi';
import {  findUnique, saveAnimeToDb, updateAnimeToDb } from '../../persistence/db';
import { getAnimeFromAniList } from '../../utils/aniListApi';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE_URL = PROVIDER_URL;

export async function animeFireHeadler(
    { type, id, extra }:
    { type: string; id: string; extra: { search?: string; skip?: string } }
): Promise<{ metas: Meta[] }> {
    console.log(`[CatalogHandler] Request received: Type=${type}, ID=${id}, Extra=${JSON.stringify(extra)}`);

    const { search, skip } = extra;
    const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;
    let scrapedAnimes: ScrapedAnimeAnimeFire[] = [];

    // --- Lógica de Scraping/Busca de Animes ---
    if (search?.search) {
        console.log(`[CatalogHandler] Performing search for: "${search.search}" on page ${page}`);
        scrapedAnimes = await searchAnimes(search, page); // Passar search diretamente como string
    } else {
        console.log(`[CatalogHandler] Fetching catalog: ${id} (Page: ${page})`);
        switch (id) {
            case 'animedex_series_catalog':
                scrapedAnimes = await scrapeTopAnimes(type as 'series', page);
                break;
            case 'animedex_movies_catalog':
                scrapedAnimes = await scrapeDubladosAnimes(type as 'movie', page);
                break;
            case 'animedex_lancamentos_movies_catalog':
                scrapedAnimes = await scrapeRecentAnimes(type as 'movie', page);
                break;
            case 'animedex_lancamentos_series_catalog':
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
                break;
            case 'animedex_atualizados_series_catalog': // Duplicado com lancamentos_series_catalog? Verifique se são diferentes.
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
                break;
            case 'animedex_atualizados_movies_catalog': // Duplicado com lancamentos_movies_catalog? Verifique se são diferentes.
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'movie', page);
                break;
            case 'animedex_dublados_series_catalog':
                scrapedAnimes = await scrapeDubladosAnimes(type as 'series', page);
                break;
            case 'animedex_legendados_series_catalog':
                scrapedAnimes = await scrapeLegendadosAnimes(type as 'series', page);
                break;
            case 'animedex_legendados_movies_catalog':
                scrapedAnimes = await scrapeLegendadosAnimes(type as 'movie', page);
                break;
            default:
                console.warn(`[CatalogHandler] Unknown catalog requested: ${id}. Returning empty.`);
                break;
        }
    }

    if (scrapedAnimes.length === 0) {
        console.log(`[CatalogHandler] No animes scraped for ID: ${id} or search: ${search?.search}.`);
        return { metas: [] };
    }
    console.log(`[CatalogHandler] Scraped ${scrapedAnimes.length} animes.`);


    const metas: Meta[] = [];
    for (const scrapedAnime of scrapedAnimes) {
        try {
            const encodedAnimefireUrl = encodeURIComponent(scrapedAnime.animefireUrl);
            console.log(`[CatalogHandler] Processing Anime: "${scrapedAnime.title}" (URL: ${encodedAnimefireUrl})`);

            let animeRecord = await findUnique(scrapedAnime.animefireUrl); 

            if (!animeRecord) { 
                console.log(`[CatalogHandler] Anime "${scrapedAnime.title}" not found in DB. Fetching external info."${scrapedAnime.secoundName}"`);
                const aniListMedia = await getAnimeFromAniList(
                    scrapedAnime.title || scrapedAnime.secoundName || '',
                    scrapedAnime.title || '',
                    scrapedAnime.type as 'movie' | 'series'
                );

                let imdbId: string | null = null;
                const imdbLink = aniListMedia?.externalLinks?.find(link => link.site === 'IMDb');
                if (imdbLink) {
                    const match = imdbLink.url.match(/title\/(tt\d+)/);
                    if (match && match[1]) {
                        imdbId = match[1];
                        console.log(`[CatalogHandler] Found IMDb ID from AniList: ${imdbId}`);
                    }
                }

                let tmdbInfo: any | null = null;
                if (imdbId) {
                    tmdbInfo = await getTmdbInfoByImdbId(imdbId);
                    if (tmdbInfo) {
                        console.log(`[CatalogHandler] Found TMDB info via IMDb ID.`);
                    }
                }

                if (!tmdbInfo) {
                    // Fallback to searching TMDB by name if IMDb lookup failed

                    const searchTitle = aniListMedia?.title.english || scrapedAnime.secoundName || scrapedAnime.title;
                    console.log(`[CatalogHandler] Attempting to find TMDB info by name. \n
                        aniListTitle${aniListMedia?.title.english}\n
                        ScrapedAnimeTitle ${scrapedAnime.title}\n
                        scrapedAnimeTitle ${scrapedAnime.secoundName}`);
                    if (searchTitle && aniListMedia) {
                         tmdbInfo = await getTmdbInfoByName(
                            aniListMedia, // Pass aniListMedia for better matching
                            searchTitle,
                            scrapedAnime.type
                        );
                        if (tmdbInfo) {
                            console.log(`[CatalogHandler] Found TMDB info via name search.`);
                        }
                    }
                }

                if (tmdbInfo) {
                    if (typeof tmdbInfo.releaseYear === 'undefined' || tmdbInfo.releaseYear === null) {
                        tmdbInfo.releaseYear = 0; 
                        console.warn(`[CatalogHandler] 'releaseYear' missing for "${tmdbInfo.title}". Setting to 0.`);
                    }
                    let savedAnime = await saveAnimeToDb(tmdbInfo, scrapedAnime);
                    if (savedAnime){

                    }else if(!savedAnime){
                        savedAnime = await updateAnimeToDb(tmdbInfo, scrapedAnime);
                    }
                    if (savedAnime) {
                        animeRecord = savedAnime;
                        console.log(`[CatalogHandler] New anime record saved for "${scrapedAnime.title}".`);
                    } else {
                        console.warn(`[CatalogHandler] Failed to save anime record for "${scrapedAnime.title}". Skipping.`);
                        continue;
                    }
                } else {
                    console.warn(`[CatalogHandler] No valid TMDB info for "${scrapedAnime.title}". Skipping DB save for this item.`);
                    continue; 
                }
            } else {
                console.log(`[CatalogHandler] Anime "${scrapedAnime.title}" found in DB.`);
                metas.push({
                    id: `animefire_${type}_${encodeURIComponent(animeRecord.stremioId)}`, 
                    type: animeRecord.type,
                    name: animeRecord.title,
                    poster: animeRecord.poster || animeRecord.background || undefined,
                    description: animeRecord.description || '',
                    genres: animeRecord.genres ? JSON.parse(animeRecord.genres) : undefined,
                    releaseInfo: animeRecord.releaseYear?.toString(),
                    background: animeRecord.background || animeRecord.poster || undefined,
                });
                continue;
            }
        } catch (e: any) {
            console.error(`[CatalogHandler] ❌ Error processing anime "${scrapedAnime.title}": ${e.message}`);
        }
    }
    console.log(`[CatalogHandler] Returning ${metas.length} metas.`);
    return { metas };
}

export async function animeFireMetaHeadler(decodedAnimefireUrl: string, type: string): Promise<{ meta: Meta }>{
    console.log(`[MetaHandler Interno] Iniciando para link: ${decodedAnimefireUrl}}, Tipo: ${type}`);

    const animefireUrlToUse = decodedAnimefireUrl
    console.log(`[MetaHandler Interno] URL decodificada para busca/scraping: ${animefireUrlToUse}`);

    if (!animefireUrlToUse || !animefireUrlToUse.startsWith(BASE_URL)) {
        console.error(`[MetaHandler Interno] ❌ Erro: URL base inválida após decodificação: ${animefireUrlToUse}`);
        return Promise.reject(new Error('Invalid anime ID or incorrect base URL.'));
    }

    let anime = await findUnique(animefireUrlToUse);
    console.log(`[MetaHandler Interno] Anime encontrado no DB:`, anime ? 'Sim' : 'Não');

    // Condição para scraping/atualização
    const shouldScrape = !anime || !anime.episodesData || anime.updatedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000;
    console.log(`[MetaHandler Interno] Condição de scraping: ${shouldScrape}`);

    if (shouldScrape) {
        console.log(`[MetaHandler Interno] ⏳ Iniciando scraping de detalhes para: ${animefireUrlToUse}`);
        const details = await scrapeAnimeDetails(animefireUrlToUse);
        
        if (details) {
            console.log(`[MetaHandler Interno] ✅ Detalhes raspados com sucesso. Título: ${details.title}`);
            const genresAsString = details.genres ? JSON.stringify(details.genres) : null;

            try {
                anime = await prisma.anime.upsert({
                    where: { animefireUrl: animefireUrlToUse },
                    update: {
                        title: details.title ?? anime?.title,
                        poster: details.poster ?? anime?.poster,
                        description: details.description,
                        genres: genresAsString,
                        releaseYear: details.releaseYear,
                        updatedAt: new Date(),
                        background: details.background,
                        episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    },
                    create: {
                        title: details.title ?? 'Unknown Title',
                        type: type,
                        animefireUrl: animefireUrlToUse,
                        stremioId: animefireUrlToUse, // Garanta que o stremioId está aqui
                        imdbId: anime?.imdbId || '',
                        description: details.description,
                        genres: genresAsString,
                        releaseYear: details.releaseYear,
                        background: details.background,
                        poster: details.poster,
                        episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    }
                });
                console.log(`[MetaHandler Interno] ✅ Anime salvo/atualizado no DB para: ${animefireUrlToUse}.`);
            } catch (dbError: any) {
                console.error(`[MetaHandler Interno] ❌ ERRO ao salvar/atualizar no DB para ${animefireUrlToUse}: ${dbError.message}`);
                // Se o erro for na gravação no DB, ainda podemos tentar retornar o que temos (se 'anime' não for nulo)
                if (!anime) {
                    return Promise.reject(new Error(`Failed to save/update anime in DB: ${dbError.message}`));
                }
            }
        } else {
            console.warn(`[MetaHandler Interno] ⚠️ Não foi possível raspar detalhes para ${animefireUrlToUse}.`);
            if (!anime) {
                console.error(`[MetaHandler Interno] ❌ Erro: Anime não encontrado e scrape falhou.`);
                return Promise.reject(new Error('Anime details not found after scraping.'));
            }
        }
    } else {
        console.log(`[MetaHandler Interno] Usando dados frescos do DB para ${animefireUrlToUse}.`);
    }

    if (!anime) {
        console.error(`[MetaHandler Interno] ❌ Erro: Objeto anime é nulo no final do processamento para ID: ${decodedAnimefireUrl}`);
        return Promise.reject(new Error('Anime record is null, cannot build meta.'));
    }

    // Preparar os dados para o objeto Meta
    const genresAsArray = anime.genres ? JSON.parse(anime.genres) : [];
    const episodesFromDb: ScrapedEpisodeAnimeFire[] = anime.episodesData ? JSON.parse(anime.episodesData) : [];
    
    // Log para verificar os dados que serão enviados ao Stremio
    console.log(`[MetaHandler Interno] Construindo objeto Meta para: ${anime.title}`);
    console.log(`[MetaHandler Interno] Poster: ${anime.poster}`);
    console.log(`[MetaHandler Interno] Descrição: ${anime.description ? anime.description.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`[MetaHandler Interno] Gêneros: ${genresAsArray.join(', ')}`);
    if (type === 'series' && episodesFromDb.length > 0) {
        console.log(`[MetaHandler Interno] Número de episódios no DB: ${episodesFromDb.length}`);
        // Verifique a estrutura do ID do episódio aqui
        console.log(`[MetaHandler Interno] Exemplo de ID de vídeo (episódio 1): ${encodeURIComponent(animefireUrlToUse)}:S${episodesFromDb[0]?.season ?? 1}E${episodesFromDb[0]?.episode ?? 1}`);
    }


    const meta: Meta = {
        id: `animefire_${type}_`, 
        type: anime.type,
        name: anime.title,
        poster: anime.poster ?? undefined,
        description: anime.description ?? undefined,
        genres: genresAsArray,
        releaseInfo: anime.releaseYear?.toString(),
        background: anime.background ?? undefined,
        videos: type === 'series' && episodesFromDb.length > 0 ? episodesFromDb.map(ep => ({
            id: `${encodeURIComponent(animefireUrlToUse)}:S${ep.season}E${ep.episode}`, 
            title: ep.title,
            season: ep.season,
            episode: ep.episode,
            released: ep.released,
            overview: ep.description, 
        })) : undefined,
    };

    console.log(`[MetaHandler Interno] ✅ Meta construída com sucesso.`);
    return Promise.resolve({ meta });
}

export async function animeFireStreamHeadler(
    { id, type, season, episode }: { id: string; type: string, season?: number, episode?: number }
): Promise<{ stream: ScrapedStream[] }> {
    console.log(`[StreamHandler] Request for ID: ${id}, Type: ${type}, Season: ${season}, Episode: ${episode}`);

    let animefireContentUrl: string;
    const animefireBaseUrl = decodeURIComponent(id.split(':')[0]);

    if (!animefireBaseUrl || !animefireBaseUrl.startsWith(BASE_URL)) {
        console.error(`[StreamHandler] Invalid AnimeFire base URL in ID: ${id}`);
        return Promise.reject(new Error(`Invalid AnimeFire base URL.`));
    }

    if (type === 'movie') {
        animefireContentUrl = animefireBaseUrl;
    } else if (type === 'series') {
        if (season === undefined || episode === undefined) {
            console.error(`[StreamHandler] Series request missing season or episode for ID: ${id}`);
            return Promise.reject(new Error(`Invalid series request: season or episode is missing.`));
        }

        const anime = await prisma.anime.findUnique({ where: { animefireUrl: animefireBaseUrl } });

        if (anime?.episodesData) {
            const episodes: ScrapedEpisodeAnimeFire[] = JSON.parse(anime.episodesData);
            const targetEpisode = episodes.find(ep => ep.episode === episode);

            if (targetEpisode?.episodeUrl) {
                animefireContentUrl = targetEpisode.episodeUrl;
                console.log(`[StreamHandler] Found episode ${episode} URL in DB: ${animefireContentUrl}`);
            } else {
                console.warn(`[StreamHandler] Episode ${episode} URL not found in DB for ${animefireBaseUrl}. Attempting fallback construction.`);
                animefireContentUrl = `${animefireBaseUrl}/episodio/${episode}`;
                console.log(`[StreamHandler] Constructed fallback URL for series: ${animefireContentUrl}`);
            }
        } else {
            console.warn(`[StreamHandler] No episode data in DB for ${animefireBaseUrl}. Attempting fallback construction.`);
            animefireContentUrl = `${animefireBaseUrl}/episodio/${episode}`;
            console.log(`[StreamHandler] Constructed fallback URL for series (no DB data): ${animefireContentUrl}`);
        }
    } else {
        console.error(`[StreamHandler] Unsupported content type: ${type}`);
        return Promise.reject(new Error('Content type not supported for streams.'));
    }

    if (!animefireContentUrl) {
        console.error(`[StreamHandler] Could not determine content URL for ID: ${id}`);
        return Promise.reject(new Error('Content URL could not be determined.'));
    }

    console.log(`[StreamHandler] Scraping streams from: ${animefireContentUrl}`);
    try {
        let streams = await scrapeStreamsFromContentPage(animefireContentUrl);
        
        streams = streams.filter(s => typeof s.url === 'string' && s.url.length > 0);

        if (streams.length === 0) {
            console.warn(`[StreamHandler] No streams found for ${animefireContentUrl}.`);
            return Promise.reject(new Error('No streams found for this content.'));
        }

        return Promise.resolve({ stream: streams });
    } catch (error: any) {
        console.error(`[StreamHandler] Error scraping streams from ${animefireContentUrl}: ${error.message}`);
        return Promise.reject(new Error(`Failed to retrieve streams: ${error.message}`));
    }
}

export async function scrapeAnimeFireDirectStreams(
    animefireBaseUrl: string, // Recebe a URL base do anime (decodificada)
    season?: number,
    episode?: number,
    type?: 'movie' | 'series' // Recebe o tipo para determinar o fluxo
): Promise<ScrapedStreamAnimeFire[]> { // Retorna um array de ScrapedStreamAnimeFire
    console.log(`[AnimeFireDirectScraper] Iniciando scraping para URL Base: ${animefireBaseUrl}, Tipo: ${type}, S:${season}, E:${episode}`);

    let animefireContentUrl: string;

    if (!animefireBaseUrl || !animefireBaseUrl.startsWith(BASE_URL)) {
        console.error(`[AnimeFireDirectScraper] URL base inválida: ${animefireBaseUrl}`);
        // Retorne um array vazio em caso de erro, conforme a Promise<ScrapedStreamAnimeFire[]>
        return [];
    }

    if (type === 'movie') {
        animefireContentUrl = animefireBaseUrl;
    } else if (type === 'series') {
        if (season === undefined || episode === undefined) {
            console.error(`[AnimeFireDirectScraper] Requisição de série sem temporada ou episódio.`);
            return [];
        }

        const anime = await prisma.anime.findUnique({ where: { animefireUrl: animefireBaseUrl } });

        if (anime?.episodesData) {
            const episodes: ScrapedEpisodeAnimeFire[] = JSON.parse(anime.episodesData);
            const targetEpisode = episodes.find(ep => ep.episode === episode);

            if (targetEpisode?.episodeUrl) {
                animefireContentUrl = targetEpisode.episodeUrl;
                console.log(`[AnimeFireDirectScraper] Encontrada URL do episódio ${episode} no DB: ${animefireContentUrl}`);
            } else {
                console.warn(`[AnimeFireDirectScraper] URL do episódio ${episode} não encontrada no DB para ${animefireBaseUrl}. Tentando construção de fallback.`);
                // Construção de fallback: se a URL no DB for apenas a base, tente adicionar /episodio/X
                animefireContentUrl = `${animefireBaseUrl}/episodio/${episode}`;
                console.log(`[AnimeFireDirectScraper] URL de fallback construída para série: ${animefireContentUrl}`);
            }
        } else {
            console.warn(`[AnimeFireDirectScraper] Sem dados de episódio no DB para ${animefireBaseUrl}. Tentando construção de fallback.`);
            // Construção de fallback para quando não há dados de episódio no DB
            animefireContentUrl = `${animefireBaseUrl}/episodio/${episode}`;
            console.log(`[AnimeFireDirectScraper] URL de fallback construída para série (sem dados no DB): ${animefireContentUrl}`);
        }
    } else {
        console.error(`[AnimeFireDirectScraper] Tipo de conteúdo não suportado: ${type}`);
        return [];
    }

    if (!animefireContentUrl) {
        console.error(`[AnimeFireDirectScraper] Não foi possível determinar a URL do conteúdo.`);
        return [];
    }

    console.log(`[AnimeFireDirectScraper] Raspando streams de: ${animefireContentUrl}`);
    try {
        let streams = await scrapeStreamsFromContentPage(animefireContentUrl);

        // Filtra streams com URL inválida e garante que é do tipo ScrapedStreamAnimeFire[]
        const validStreams: ScrapedStreamAnimeFire[] = streams
            .filter((s): s is ScrapedStreamAnimeFire => typeof s.url === 'string' && s.url.length > 0);

        if (validStreams.length === 0) {
            console.warn(`[AnimeFireDirectScraper] Nenhum stream encontrado para ${animefireContentUrl}.`);
        }

        return validStreams; // Retorna o array de ScrapedStreamAnimeFire
    } catch (error: any) {
        console.error(`[AnimeFireDirectScraper] Erro ao raspar streams de ${animefireContentUrl}: ${error.message}`);
        return []; // Retorna um array vazio em caso de erro no scraping
    }
}