import { PrismaClient } from '@prisma/client';
import { AnimeScrapedAnimeFireDb, ScrapedAnimeAnimeFire, ScrapedEpisode, ScrapedEpisodeAnimeFire, ScrapedEpisodeTorrent, TmdbInfoResult, TmdbResponseApi } from '../utils/types/types';
const prisma = new PrismaClient();

export async function updateDateDataBase(animeFireUrl: string){
    prisma.anime.update({
        where: { animefireUrl: animeFireUrl },
        data: { lastSearchedAt: new Date() }
    });
}

async function findFirstDataBase(tmdbInfo?: TmdbInfoResult , scrapedAnime?: ScrapedAnimeAnimeFire) {
    try {
        const stremioId = encodeURIComponent(scrapedAnime?.animefireUrl ?? '');
        const record = await prisma.anime.findFirst({
            where: {
                stremioId: tmdbInfo?.imdbId ? tmdbInfo?.imdbId : stremioId
            } 
        });
        return record; 
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao buscar no banco de dados: ${error.message}`);
        } else {
            console.error('Erro ao buscar no banco de dados:', error);
        }
        return null;
    }
}

export async function saveEpisodesToDb(episodes: ScrapedEpisodeAnimeFire[]){
    await prisma.anime.update({
        where: { animefireUrl: episodes[0].id },
        data: { episodesData: JSON.stringify(episodes) }
    });
}

export async function updateAnimeToDb(
    tmdbInfo: TmdbInfoResult,
    scrapedAnime: ScrapedAnimeAnimeFire) {
    try {
            await prisma.anime.updateMany({
                where: { 
                    stremioId: tmdbInfo?.imdbId ? tmdbInfo.imdbId : undefined, 
                },
                data: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo?.poster || scrapedAnime.poster,
                    type: scrapedAnime.type,
                    updatedAt: new Date(),
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo?.description,
                    background: tmdbInfo?.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: tmdbInfo?.releaseYear || scrapedAnime.releaseYear
                }
            });
            return await findFirstDataBase(undefined,scrapedAnime);
    } catch (e: any) {
        return false
    }
}

export async function saveAnimeToDb(
    tmdbInfo: TmdbInfoResult,
    scrapedAnime: ScrapedAnimeAnimeFire) {
    try {
        const stremioId = encodeURIComponent(scrapedAnime.animefireUrl);
        if (!tmdbInfo.imdbId) {
            console.error("IMDb ID é obrigatório, mas não foi fornecido.");
            return false; 
        }
            await prisma.anime.create({
                data: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo?.poster,
                    type: scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: tmdbInfo.imdbId, 
                    stremioId: stremioId ,
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo?.description,
                    background: tmdbInfo?.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: tmdbInfo?.releaseYear || scrapedAnime.releaseYear
                }
            });
            return await findFirstDataBase(undefined,scrapedAnime);
    } catch (e: any) {
        return false
    }
}
/*
export async function saveAnimesToDatabase(
    tmdbInfo: TmdbInfoResult,
    scrapedAnime: ScrapedAnimeAnimeFire) {
    try {
        const stremioId = encodeURIComponent(scrapedAnime.animefireUrl);
            await prisma.anime.upsert({
                where: { 
                    stremioId: tmdbInfo?.imdbId ? tmdbInfo.imdbId : undefined, 
                    animefireUrl: scrapedAnime.animefireUrl 
                },
                update: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo?.poster || scrapedAnime.poster,
                    type: scrapedAnime.type,
                    updatedAt: new Date(),
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo?.description,
                    background: tmdbInfo?.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: tmdbInfo?.releaseYear || scrapedAnime.releaseYear
                },
                create: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo?.poster,
                    type: scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: tmdbInfo?.imdbId ?? '', 
                    stremioId: tmdbInfo?.imdbId ? tmdbInfo.imdbId : encodeURIComponent(scrapedAnime.animefireUrl),
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo?.description,
                    background: tmdbInfo?.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: tmdbInfo?.releaseYear || scrapedAnime.releaseYear
                }
            });
            return await findFirstDataBase(tmdbInfo);
    } catch (e: any) {
        return false
    }
}
*/

export async function findUnique(animefireUrlBase: string) {
    return await prisma.anime.findFirst({
        where: {
            OR: [
                {
                    stremioId: animefireUrlBase
                },
                {
                    animefireUrl: animefireUrlBase
                }
            ]
        },
    });
}
