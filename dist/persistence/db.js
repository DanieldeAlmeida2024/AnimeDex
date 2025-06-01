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
exports.findFirstDataBase = findFirstDataBase;
exports.createAnimeOnDataBase = createAnimeOnDataBase;
exports.saveAnimesToDatabase = saveAnimesToDatabase;
exports.findUnique = findUnique;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function updateDateDataBase(tmdbInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        prisma.anime.update({
            where: { id: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.id },
            data: { lastSearchedAt: new Date() }
        });
    });
}
function findFirstDataBase(tmdbInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.anime.findFirst({
            where: {
                title: tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.title,
                imdbId: `${tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.id}`
            }
        });
    });
}
function createAnimeOnDataBase(tmdbInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!tmdbInfo) {
            throw new Error("tmdbInfo cannot be null");
        }
        yield prisma.anime.create({
            data: {
                imdbId: `tt${tmdbInfo.id}`,
                title: tmdbInfo.title,
                poster: (_a = tmdbInfo.poster) !== null && _a !== void 0 ? _a : '',
                background: tmdbInfo.background,
                genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                releaseYear: tmdbInfo.releaseYear,
                description: tmdbInfo.description,
                type: (_b = tmdbInfo.type) !== null && _b !== void 0 ? _b : '',
                stremioId: `tt${tmdbInfo.id}`,
                lastSearchedAt: new Date(),
            }
        });
    });
}
function saveAnimesToDatabase(tmdbInfo, scrapedAnime) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield prisma.anime.upsert({
                where: { animefireUrl: scrapedAnime.animefireUrl },
                update: {
                    title: scrapedAnime.title,
                    poster: (tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.poster) || scrapedAnime.poster,
                    type: (_a = tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.type) !== null && _a !== void 0 ? _a : scrapedAnime.type,
                    updatedAt: new Date()
                },
                create: {
                    title: scrapedAnime.title,
                    poster: scrapedAnime.poster,
                    type: (_b = tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.type) !== null && _b !== void 0 ? _b : scrapedAnime.type,
                    animefireUrl: scrapedAnime.animefireUrl,
                    imdbId: `tt${tmdbInfo === null || tmdbInfo === void 0 ? void 0 : tmdbInfo.id}`, // Provide a default or actual imdbId if available
                }
            });
        }
        catch (e) {
        }
    });
}
function findUnique(animefireUrlBase) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma.anime.findUnique({
            where: {
                animefireUrl: animefireUrlBase
            }
        });
    });
}
