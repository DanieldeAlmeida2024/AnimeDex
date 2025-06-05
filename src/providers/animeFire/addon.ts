import { AniListMedia, Meta, ScrapedEpisode, ScrapedEpisodeAnimeFire, ScrapedEpisodeTorrent, ScrapedStream, ScrapedStreamAnimeFire, Stream, TmdbInfoResult } from '../../utils/types/types';
import { PROVIDER_URL } from './constants/url';
import { ScrapedAnimeAnimeFire } from '../../utils/types/types';
import { scrapeAtualizadosAnimes, scrapeDubladosAnimes, scrapeLegendadosAnimes, scrapeTopAnimes,scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './services/animeFireScraper';
import {  getTmdbInfoByImdbId, getTmdbInfoByName } from '../../utils/tmdbApi';
import {  findUnique, saveAnimeToDb, saveEpisodesToDb, updateAnimeToDb } from '../../persistence/db';
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
                //scrapedAnimes = await scrapeDubladosAnimes(type as 'movie', page);
                break;
            case 'animedex_lancamentos_movies_catalog':
                //scrapedAnimes = await scrapeRecentAnimes(type as 'movie', page);
                break;
            case 'animedex_lancamentos_series_catalog':
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
                break;
            case 'animedex_atualizados_series_catalog': // Duplicado com lancamentos_series_catalog? Verifique se são diferentes.
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
                break;
            case 'animedex_atualizados_movies_catalog': // Duplicado com lancamentos_movies_catalog? Verifique se são diferentes.
                //scrapedAnimes = await scrapeAtualizadosAnimes(type as 'movie', page);
                break;
            case 'animedex_dublados_series_catalog':
                scrapedAnimes = await scrapeDubladosAnimes(type as 'series', page);
                break;
            case 'animedex_legendados_series_catalog':
                scrapedAnimes = await scrapeLegendadosAnimes(type as 'series', page);
                break;
            case 'animedex_legendados_movies_catalog':
                //scrapedAnimes = await scrapeLegendadosAnimes(type as 'movie', page);
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
                    } else if(aniListMedia && scrapedAnime.secoundName){
                        tmdbInfo = await getTmdbInfoByName(
                            aniListMedia, // Pass aniListMedia for better matching
                            scrapedAnime.secoundName,
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
                        continue
                    }
                } else {
                    console.warn(`[CatalogHandler] No valid TMDB info for "${scrapedAnime.title}". Skipping DB save for this item.`);
                    const tmdbInfofake: TmdbInfoResult = {
                        id: aniListMedia?.id || 1,
                        title: scrapedAnime.secoundName || scrapedAnime.title ,
                        poster: aniListMedia?.bannerImage || scrapedAnime.poster,
                        background: aniListMedia?.bannerImage || scrapedAnime.background,
                        genres: aniListMedia?.genres || scrapedAnime.genres,
                        releaseYear: scrapedAnime.releaseYear,
                        imdbId: 'FAKE',
                        type: scrapedAnime.type
                    };
                    let savedAnime = await saveAnimeToDb(tmdbInfofake, scrapedAnime);
                    if (savedAnime){

                    }else if(!savedAnime){
                        savedAnime = await updateAnimeToDb(tmdbInfofake, scrapedAnime);
                    }
                    if (savedAnime) {
                        animeRecord = savedAnime;
                        console.log(`[CatalogHandler] New anime record saved for "${scrapedAnime.title}".`);
                    } else {
                        console.warn(`[CatalogHandler] Failed to save anime record for "${scrapedAnime.title}". Skipping.`);
                        continue
                    }
                }
            } else {
                console.log(`[CatalogHandler] Anime "${scrapedAnime.title}" found in DB.`);
                console.log(`Dados: \n
                    id: animedex_${type}_${encodeURIComponent(animeRecord.stremioId)}\n
                    type: ${animeRecord.type} \n
                    name: ${animeRecord.secoundName || animeRecord.title} \n
                    poster: ${animeRecord.poster || animeRecord.background || undefined}\n
                    description: ${animeRecord.description || ''}\n
                    genres: ${animeRecord.genres ? JSON.parse(animeRecord.genres) : undefined}\n
                    releaseInfo: ${animeRecord.releaseYear?.toString()}\n
                    background: ${animeRecord.background || animeRecord.poster || undefined}`)
                metas.push({
                    id: `animedex_${type}_${encodeURIComponent(animeRecord.stremioId)}`, 
                    type: animeRecord.type,
                    name: animeRecord.secoundName && animeRecord.secoundName !== '' ? animeRecord.secoundName : (animeRecord.title ?? ''),
                    poster: animeRecord.poster || animeRecord.background || undefined,
                    description: animeRecord.description || '',
                    genres: animeRecord.genres ? JSON.parse(animeRecord.genres) : undefined,
                    releaseInfo: animeRecord.releaseYear?.toString(),
                    background: animeRecord.background || animeRecord.poster || undefined,
                });

            }
        } catch (e: any) {
            console.error(`[CatalogHandler] ❌ Error processing anime "${scrapedAnime.title}": ${e.message}`);
        }
    }
    return { metas };
}

export async function animeFireMetaHeadler(encodedUrl: string, type: string): Promise<{ meta: Meta }>{
    console.log(`Entrou no meta headler`)
        const id = decodeURIComponent(
        encodedUrl.replace(`animedex_${type}_`, '')
    );
    let meta:Meta;
    const animefireUrlToUse = decodeURIComponent(id)
    let anime = await findUnique(animefireUrlToUse);
    if (true) {
        const details = await scrapeAnimeDetails(anime?.animefireUrl ?? "");        
        if (details) {
            const genresAsString = details.genres ? JSON.stringify(details.genres) : null;

            try {
                anime = await prisma.anime.update({
                    where: { stremioId: animefireUrlToUse },
                    data: {
                        title: details.secoundName && details.secoundName !== '' ? details.secoundName : (details.title ?? ''),
                        description: details.description ? details.description : anime?.description,
                        genres: genresAsString ? genresAsString : JSON.stringify(anime?.genres),
                        releaseYear: details.releaseYear ? details.releaseYear : anime?.releaseYear,
                        updatedAt: new Date(),
                        episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    }
                });
            } catch (dbError: any) {
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
        const genresAsArray = anime.genres ? JSON.parse(anime.genres) : [];
        meta = {
            id: `animedex_${type}_${encodeURIComponent(animefireUrlToUse)}`, 
            type: anime.type,
            name: anime.secoundName && anime.secoundName !== '' ? anime.secoundName : (anime.title ?? ''),
            poster: anime.poster ?? undefined,
            description: anime.description ?? undefined,
            genres: genresAsArray,
            releaseInfo: anime.releaseYear?.toString(),
            background: anime.background ?? undefined,
            videos: type === 'series' && details?.episodes && details.episodes.length > 0 ? details.episodes.map(ep => ({
                id: `${encodeURIComponent(animefireUrlToUse)}:S${ep.season ?? 1}E${ep.episode}`, 
                title: ep.title,
                season: ep.season ?? 1,
                episode: ep.episode,
                released: ep.released
            })) : undefined,
        };
    } else {
    }

    if (!anime) {
        console.error(`[MetaHandler Interno] ❌ Erro: Objeto anime é nulo no final do processamento para ID: ${id}`);
        return Promise.reject(new Error('Anime record is null, cannot build meta.'));
    }

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
): Promise<ScrapedStream[]> { // Retorna um array de ScrapedStreamAnimeFire
    console.log(`[AnimeFireDirectScraper] Iniciando scraping para URL Base: ${animefireBaseUrl}, Tipo: ${type}, S:${season}, E:${episode}`);

    if (!animefireBaseUrl || !animefireBaseUrl.startsWith(BASE_URL)) {
        console.error(`[AnimeFireDirectScraper] URL base inválida: ${animefireBaseUrl}`);
        // Retorne um array vazio em caso de erro, conforme a Promise<ScrapedStreamAnimeFire[]>
        return [];
    }

    if (type === 'movie') {
    } else if (type === 'series') {
        if (season === undefined || episode === undefined) {
            console.error(`[AnimeFireDirectScraper] Requisição de série sem temporada ou episódio.`);
            return [];
        }
    } else {
        console.error(`[AnimeFireDirectScraper] Tipo de conteúdo não suportado: ${type}`);
        return [];
    }

    console.log(`[AnimeFireDirectScraper] Raspando streams de: ${animefireBaseUrl}`);
    try {
        let novoUrl = `${animefireBaseUrl}/${episode}`;

        let streams = await scrapeStreamsFromContentPage(novoUrl);
        const validStreams: ScrapedStream[] = streams.map(stream => ({
            magnet: stream.url,
            source: stream.name,
            url: stream.url,
            animeFireBaseUrl: animefireBaseUrl,
            name: stream.name,
            episodeUrl: stream.url,
            quality: stream.quality
        }));
        

        if (validStreams.length === 0) {
            console.warn(`[AnimeFireDirectScraper] Nenhum stream encontrado para ${animefireBaseUrl}.`);
        } else {
            let animeRecord = await prisma.anime.findFirst({
                where: { stremioId: novoUrl }
            });

            const episodesData: ScrapedEpisodeAnimeFire[] = animeRecord?.episodesData ? JSON.parse(animeRecord.episodesData) : [];
            let updatedEpisodesData = [...episodesData];

            for (const stream of validStreams) {
                const existingIndex = updatedEpisodesData.findIndex(ep =>
                    (ep.season ?? null) === (season ?? null) &&
                    (ep.episode ?? null) === (episode !== undefined && episode !== null ? Number(episode) : null)
                );

                const link = {
                    magnet: stream.url,
                    source: stream.name,
                    url: stream.url,
                    animeFireStream: stream.url,
                    quality: stream.quality
                };

                if (existingIndex > -1) {
                    updatedEpisodesData[existingIndex] = { ...updatedEpisodesData[existingIndex], ...link };
                } else {
                    updatedEpisodesData.push({
                        id: animefireBaseUrl,
                        episode: Number(episode),
                        title: link.quality ?? '',
                        episodeUrl: link.url ?? '',
                        description: link.quality,
                    });
                }
            }
            for(const episodeDataSave of updatedEpisodesData){

                //====================================================================

                const currentAnimeRecord = await findUnique(animefireBaseUrl);
                let existingEpisodes: ScrapedEpisodeAnimeFire[] = [];
                if (currentAnimeRecord && currentAnimeRecord.episodesData) {
                    try {
                        const parsedExistingData = JSON.parse(currentAnimeRecord.episodesData);
                        if (Array.isArray(parsedExistingData)) {
                            existingEpisodes = parsedExistingData;
                        } else if (typeof parsedExistingData === 'object' && parsedExistingData !== null) {
                            // Se foi salvo anteriormente como um único objeto, converta para array
                            console.warn(`[DB UPDATE] O 'episodesData' existente para ${animefireBaseUrl} era um único objeto, convertendo para array.`);
                            existingEpisodes = [parsedExistingData as ScrapedEpisodeAnimeFire];
                        }
                    } catch (e) {
                        console.error(`[DB UPDATE] Erro ao parsear 'episodesData' existente para ${animefireBaseUrl}:`, e);
                        // Em caso de erro de parse, inicialize com um array vazio
                        existingEpisodes = [];
                    }
                }

                // 2. Adicionar o novo episódio ao array (sem validação de existência)
                existingEpisodes.push(episodeDataSave);
                
                // Opcional: Ordene os episódios por número para manter a lista consistente
                existingEpisodes.sort((a, b) => a.episode - b.episode);
                console.log(`[DB UPDATE] Novo episódio ${episodeDataSave.episode} adicionado para ${animefireBaseUrl}.`);

                // 3. Serializar o array atualizado de volta para uma string JSON
                const updatedEpisodesJsonString = existingEpisodes;

                // 4. Salvar a string JSON atualizada no banco de dados
                await saveEpisodesToDb(updatedEpisodesJsonString);

                console.log(`[DB UPDATE] Dados de episódios atualizados com sucesso para ${animefireBaseUrl}. Total de episódios: ${existingEpisodes.length}`);
                // =========================================================
                


            }

        }

        return validStreams; // Retorna o array de ScrapedStreamAnimeFire
    } catch (error: any) {
        console.error(`[AnimeFireDirectScraper] Erro ao raspar streams de ${animefireBaseUrl}: ${error.message}`);
        return []; // Retorna um array vazio em caso de erro no scraping
    }
}