import { Meta, ScrapedEpisodeAnimeFire } from '../../utils/types/types';
import { PROVIDER_URL } from './constants/url';
import { ScrapedAnimeAnimeFire } from '../../utils/types/types';
import { scrapeAtualizadosAnimes, scrapeDubladosAnimes, scrapeLegendadosAnimes, scrapeTopAnimes,scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './services/animeFireScraper';
import {  getTmdbInfoByImdbId, getTmdbInfoByName } from '../../utils/tmdbApi';
import {  findUnique, saveAnimesToDatabase } from '../../persistence/db';
import { getAnimeFromAniList } from '../../utils/aniListApi';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE_URL = PROVIDER_URL;

export async function animeFireHeadler(
		{ type, id, extra }: 
		{ type: string; id: string; 
			extra: 
			{ search?: string; skip?: string } 
		}
	): Promise<{ metas: Meta[] }> {
		const { search, skip } = extra;
		const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;
		let scrapedAnimes: ScrapedAnimeAnimeFire[] = [];
		if (search?.search) { 
			scrapedAnimes = await searchAnimes(search, page);
		}else{
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
				case 'animedex_atualizados_series_catalog':
					scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
					break;
				case 'animedex_atualizados_movies_catalog':
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
					console.warn(`Catálogo desconhecido solicitado: ${id}. Retornando vazio.`);
					break;
			}
		}
		const metas: Meta[] = [];
		for (const scrapedAnime of scrapedAnimes) {
			try {
				let finalInfoForDatabase: any | null = null; 
				let foundImdbId: string | null = null;
				let foundTmdbInfoFromAniList: any | null = null; 

				const foundDb = await findUnique(scrapedAnime.animefireUrl);

				if(!foundDb){
					const aniListMedia = await getAnimeFromAniList(scrapedAnime.secoundName || '', scrapedAnime.title || '', scrapedAnime.type as 'movie' | 'series');
					let imdb_id;

					const imdbLink = aniListMedia && aniListMedia.externalLinks?.find(link => link.site === 'IMDb');

					if (imdbLink) {
						const match = imdbLink.url.match(/title\/(tt\d+)/);
						if (match && match[1]) {
							const imdbId = match[1];
							imdb_id = imdbId;
						}
					}
					console.log(`[ADDON ANIMEFIRE] Anime encontrado no AniList: "${aniListMedia?.title.english}"`);

					foundImdbId = aniListMedia ? imdb_id ?? null : null;

					if (foundImdbId) {
						console.log(`[ADDON ANIMEFIRE] TMDb ID encontrado: ${foundImdbId} para ${scrapedAnime.secoundName}`)
						foundTmdbInfoFromAniList = await getTmdbInfoByImdbId(foundImdbId);
					}

					if (foundTmdbInfoFromAniList) {
						finalInfoForDatabase = foundTmdbInfoFromAniList;
						console.log(`[ADDON ANIMEFIRE] Usando TMDB info encontrada via AniList para "${finalInfoForDatabase.title}".`);
					} else {
						console.log(`[ADDON ANIMEFIRE] TMDB info não encontrada via AniList ID. Tentando buscar no TMDB por nome principal: "${scrapedAnime.title}".`);
						if (aniListMedia) {
							finalInfoForDatabase = await getTmdbInfoByName(
								aniListMedia,
								scrapedAnime.title.replace(/[^a-zA-ZáàâãéèêíìîóòôõúùûüçÇÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÜ\s]/g, ''),
								type as "movie" | "series"
							);
						}

						if (!finalInfoForDatabase && scrapedAnime.secoundName && aniListMedia) {
							let searchTitleForTmdb = scrapedAnime.secoundName;
							if (searchTitleForTmdb.includes(':')) {
								searchTitleForTmdb = searchTitleForTmdb.split(':')[0].trim();
							} else {
								const words = searchTitleForTmdb.split(' ');
								searchTitleForTmdb = words.slice(0, 3).join(' ').trim();
							}
							finalInfoForDatabase = await getTmdbInfoByName(
								aniListMedia,
								searchTitleForTmdb,
								type as "movie" | "series"
							);
						}
					}

					let savedAnimeRecord: any | null = null;

					if (finalInfoForDatabase) {
						savedAnimeRecord = await saveAnimesToDatabase(finalInfoForDatabase, scrapedAnime);
					} else {
					}
					if (savedAnimeRecord) {
						const metaId = savedAnimeRecord.stremioId || `animefire_${scrapedAnime.type}_${encodeURIComponent(scrapedAnime.animefireUrl)}`;
						metas.push({
							id: metaId,
							type: savedAnimeRecord.type as 'movie' | 'series',
							name: savedAnimeRecord.title,
							poster: savedAnimeRecord.poster || savedAnimeRecord.background || undefined,
							description: savedAnimeRecord.description || '',
							genres: savedAnimeRecord.genres ? JSON.parse(savedAnimeRecord.genres) : [],
							releaseInfo: savedAnimeRecord.releaseYear?.toString(),
							background: savedAnimeRecord.background || savedAnimeRecord.poster || undefined,
						});
					}
				} else {
					metas.push({
						id: foundDb.id,
						type: foundDb.type,
						name: foundDb.title,
						poster: foundDb.poster ?? '',
						description: foundDb.description ?? '',
						genres: typeof foundDb.genres === 'string'
							? foundDb.genres.split(',').map(g => g.trim()).filter(g => g)
							: (foundDb.genres ?? ['']),
						releaseInfo: foundDb.releaseYear ?? '',
						background: foundDb.background ?? ''
					});
				}

			} catch (e: any) {
				console.error(`[ADDON ANIMEFIRE] Erro ao processar anime "${scrapedAnime.title}": ${e.message}`);
			}
		}
	return { metas };
}

export async function animeFireMetaHeadler({ id, type }: { id: string; type: string }): Promise<{ meta: Meta }>{
const decodedAnimefireUrl = decodeURIComponent(id.replace(`animefire_${type}_`, ''));
    if (!decodedAnimefireUrl || !decodedAnimefireUrl.startsWith(BASE_URL)) {
        return Promise.reject(new Error('ID de anime inválido ou URL base incorreta.'));
    }

    let anime = await findUnique(decodedAnimefireUrl);

    if (!anime || !anime.description || !anime.episodesData || anime.updatedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        const details = await scrapeAnimeDetails(decodedAnimefireUrl);

        if (details) {
            const genresAsString = details.genres ? details.genres.join(',') : null;
            anime = await prisma.anime.upsert({
                where: { animefireUrl: decodedAnimefireUrl },
                update: {
                    description: details.description,
                    genres: genresAsString,
                    releaseYear: details.releaseYear,
                    updatedAt: new Date(),
                    poster: details.poster ?? anime?.poster,
                    title: details.title ?? anime?.title,
                    type: type,
                    background: details.background,
                    episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                },
                create: {
                    id: decodedAnimefireUrl,
                    title: details.title ?? 'Unknown Title',
                    type: type,
                    animefireUrl: decodedAnimefireUrl,
                    description: details.description,
                    genres: genresAsString,
                    releaseYear: details.releaseYear,
                    background: details.background,
                    poster: details.poster,
                    episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    imdbId: decodedAnimefireUrl,
                    stremioId: decodedAnimefireUrl,
                }
            });
        } else {
            console.warn(`Could not scrape details for ${decodedAnimefireUrl}.`);
            if (!anime) {
                return Promise.reject(new Error('Detalhes do anime não encontrados após scraping.'));
            }
        }
    } else {
    }

    if (!anime) {
        return Promise.reject(new Error('Anime não encontrado.'));
    }

    const genresAsArray = anime.genres ? anime.genres.split(',') : [];
    const episodesFromDb: ScrapedEpisodeAnimeFire[] = anime.episodesData ? JSON.parse(anime.episodesData) : [];
    const meta: Meta = {
        id: id,
        type: anime.type,
        name: anime.title,
        poster: anime.poster ?? undefined,
        description: anime.description ?? undefined,
        genres: genresAsArray,
        releaseInfo: anime.releaseYear !== null ? anime.releaseYear : undefined,
        background: anime.background ?? undefined,
        videos: type === 'series' && episodesFromDb.length > 0 ? episodesFromDb.map(ep => ({
            id: ep.id,
            title: ep.title,
            season: ep.season,
            episode: ep.episode,
            released: ep.released,
        })) : undefined,
    };

    return Promise.resolve({ meta });
}