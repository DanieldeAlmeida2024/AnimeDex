"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDateDataBase = updateDateDataBase;
exports.saveEpisodesToDb = saveEpisodesToDb;
exports.updateAnimeToDb = updateAnimeToDb;
exports.saveAnimeToDb = saveAnimeToDb;
exports.findUnique = findUnique;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function updateDateDataBase(animeFireUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        prisma.anime.update({
            where: { animefireUrl: animeFireUrl },
            data: { lastSearchedAt: new Date() }
        });
    });
}
function findFirstDataBase(tmdbInfo, scrapedAnime) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const stremioId = encodeURIComponent((_a = scrapedAnime === null || scrapedAnime === void 0 ? void 0 : scrapedAnime.animefireUrl) !== null && _a !== void 0 ? _a : '');
            const record = yield prisma.anime.findFirst({
                where: {
                    stremioId: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.imdbId) ? tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.imdbId : stremioId
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
    });
}
function saveEpisodesToDb(episodes) {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.anime.update({
            where: { animefireUrl: episodes.id },
            data: { episodesData: JSON.stringify(episodes) }
        });
    });
}
function updateAnimeToDb(tmdbInfo, scrapedAnime) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.anime.updateMany({
                where: {
                    stremioId: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.imdbId) ? tmdbInfo.imdbId : undefined,
                },
                data: {
                    title: scrapedAnime.title,
                    poster: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.poster) || scrapedAnime.poster,
                    type: scrapedAnime.type,
                    updatedAt: new Date(),
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.description,
                    background: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.releaseYear) || scrapedAnime.releaseYear
                }
            });
            return yield findFirstDataBase(undefined, scrapedAnime);
        }
        catch (e) {
            return false;
        }
    });
}
function saveAnimeToDb(tmdbInfo, scrapedAnime) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stremioId = encodeURIComponent(scrapedAnime.animefireUrl);
            if (!tmdbInfo.imdbId) {
                console.error("IMDb ID é obrigatório, mas não foi fornecido.");
                return false;
            }
            yield prisma.anime.create({
                data: {
                    title: scrapedAnime.title,
                    poster: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.poster,
                    type: scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: tmdbInfo.imdbId,
                    stremioId: stremioId,
                    secoundName: scrapedAnime.secoundName,
                    description: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.description,
                    background: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.background,
                    genres: scrapedAnime.genres ? JSON.stringify(scrapedAnime.genres) : null,
                    releaseYear: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.releaseYear) || scrapedAnime.releaseYear
                }
            });
            return yield findFirstDataBase(undefined, scrapedAnime);
        }
        catch (e) {
            return false;
        }
    });
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
function findUnique(animefireUrlBase) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma.anime.findFirst({
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
    });
}
