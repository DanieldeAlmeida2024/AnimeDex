import { PrismaClient } from '@prisma/client';
import { ScrapedAnimeAnimeFire, TmdbResponseApi } from '../utils/types/types';
const prisma = new PrismaClient();

export async function updateDateDataBase(tmdbInfo: TmdbResponseApi){
    prisma.anime.update({
        where: { id: tmdbInfo?.id },
        data: { lastSearchedAt: new Date() }
    });
}

export async function findFirstDataBase(tmdbInfo: TmdbResponseApi ){
    return prisma.anime.findFirst({
        where: { 
            title: tmdbInfo?.title,
            imdbId: `${tmdbInfo?.id}`
            }
    });
}

export async function createAnimeOnDataBase(
    tmdbInfo: TmdbResponseApi
){
        if (!tmdbInfo) {
            throw new Error("tmdbInfo cannot be null");
        }
        await prisma.anime.create({
            data: {
                imdbId: `tt${tmdbInfo.id}` ,
                title: tmdbInfo.title,
                poster: tmdbInfo.poster ?? '',
                background: tmdbInfo.background,
                genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                releaseYear: tmdbInfo.releaseYear,
                description: tmdbInfo.description,
                type: tmdbInfo.type ?? '',
                stremioId: `tt${tmdbInfo.id}`,
                lastSearchedAt: new Date(),
            }
        });
}

export async function saveAnimesToDatabase(
    tmdbInfo: {id: number, title: string; poster?: string; background?: string; genres?: string[]; releaseYear?: number; description?: string; type: "movie" | "series" } | null,
    scrapedAnime: ScrapedAnimeAnimeFire) {
    try {
            await prisma.anime.upsert({
                where: { animefireUrl: scrapedAnime.animefireUrl },
                update: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo?.poster || scrapedAnime.poster,
                    type: tmdbInfo?.type ?? scrapedAnime.type,
                    updatedAt: new Date()
                },
                create: {
                    title: scrapedAnime.title,
                    poster: scrapedAnime.poster,
                    type: tmdbInfo?.type ?? scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: `tt${tmdbInfo?.id}`, // Provide a default or actual imdbId if available
                }
            });
    } catch (e: any) {
    }
}


export async function findUnique(animefireUrlBase: string) {
    return await prisma.anime.findUnique({
        where: {
            animefireUrl: animefireUrlBase
        }
    });

}



