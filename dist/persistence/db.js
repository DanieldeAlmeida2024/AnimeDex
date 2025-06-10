"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUnique = exports.saveAnimeToDb = exports.updateAnimeToDb = exports.saveEpisodesToDb = exports.updateDateDataBase = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function updateDateDataBase(animeFireUrl) {
    prisma.anime.update({
        where: { animefireUrl: animeFireUrl },
        data: { lastSearchedAt: new Date() }
    });
}
exports.updateDateDataBase = updateDateDataBase;
async function findFirstDataBase(tmdbInfo, scrapedAnime) {
    try {
        const stremioId = encodeURIComponent(scrapedAnime?.animefireUrl ?? '');
        const record = await prisma.anime.findFirst({
            where: {
                stremioId: tmdbInfo?.imdbId ? tmdbInfo?.imdbId : stremioId
            }
        });
        return record;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao buscar no banco de dados: ${error.message}`);
        }
        else {
            console.error('Erro ao buscar no banco de dados:', error);
        }
        return null;
    }
}
async function saveEpisodesToDb(episodes) {
    await prisma.anime.update({
        where: { animefireUrl: episodes[0].id },
        data: { episodesData: JSON.stringify(episodes) }
    });
}
exports.saveEpisodesToDb = saveEpisodesToDb;
async function updateAnimeToDb(tmdbInfo, scrapedAnime) {
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
        return await findFirstDataBase(undefined, scrapedAnime);
    }
    catch (e) {
        return false;
    }
}
exports.updateAnimeToDb = updateAnimeToDb;
async function saveAnimeToDb(tmdbInfo, scrapedAnime) {
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
                stremioId: stremioId,
                secoundName: scrapedAnime.secoundName,
                description: tmdbInfo?.description,
                background: tmdbInfo?.background,
                genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                releaseYear: tmdbInfo?.releaseYear || scrapedAnime.releaseYear
            }
        });
        return await findFirstDataBase(undefined, scrapedAnime);
    }
    catch (e) {
        return false;
    }
}
exports.saveAnimeToDb = saveAnimeToDb;
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
async function findUnique(animefireUrlBase) {
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
exports.findUnique = findUnique;
