import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export async function saveAnimesToDatabase(scrapedAnimes: { title: string, poster: string, type: string, animefireUrl: string }[]) {
    for (const scrapedAnime of scrapedAnimes) {
        try {
            await prisma.anime.upsert({
                where: { animefireUrl: scrapedAnime.animefireUrl },
                update: {
                    title: scrapedAnime.title,
                    poster: scrapedAnime.poster,
                    type: scrapedAnime.type
                },
                create: {
                    // id: scrapedAnime.animefireUrl, // Removed because id expects a number
                    title: scrapedAnime.title,
                    poster: scrapedAnime.poster,
                    type: scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: '', // Provide a default or actual imdbId as required
                }
            });
        } catch (e: any) {
        }
    }
}


export async function findUnique(animefireUrlBase: string) {
    return await prisma.anime.findUnique({
        where: {
            animefireUrl: animefireUrlBase
        }
    });

}



