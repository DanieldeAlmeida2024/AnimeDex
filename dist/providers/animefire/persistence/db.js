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
exports.saveAnimesToDatabase = saveAnimesToDatabase;
exports.findUnique = findUnique;
exports.findAnimeUrl = findAnimeUrl;
const client_1 = require("@prisma/client");
const animefireScraper_1 = require("../services/animefireScraper");
const prisma = new client_1.PrismaClient();
function saveAnimesToDatabase(scrapedAnimes) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const scrapedAnime of scrapedAnimes) {
            try {
                yield prisma.anime.upsert({
                    where: { animefireUrl: scrapedAnime.animefireUrl },
                    update: {
                        title: scrapedAnime.title,
                        poster: scrapedAnime.poster,
                        type: scrapedAnime.type,
                        lastUpdated: new Date()
                    },
                    create: {
                        id: scrapedAnime.animefireUrl,
                        title: scrapedAnime.title,
                        poster: scrapedAnime.poster,
                        type: scrapedAnime.type,
                        animefireUrl: scrapedAnime.animefireUrl,
                    }
                });
            }
            catch (e) {
            }
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
function findAnimeUrl(decodedAnimefireUrl, type) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        let anime = yield prisma.anime.findUnique({ where: { animefireUrl: decodedAnimefireUrl } });
        if (!anime || !anime.description || !anime.episodesData || anime.lastUpdated.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
            const details = yield (0, animefireScraper_1.scrapeAnimeDetails)(decodedAnimefireUrl);
            if (details) {
                const genresAsString = details.genres ? details.genres.join(',') : null;
                anime = yield prisma.anime.upsert({
                    where: { animefireUrl: decodedAnimefireUrl },
                    update: {
                        description: details.description,
                        genres: genresAsString,
                        releaseYear: details.releaseYear,
                        lastUpdated: new Date(),
                        poster: (_a = details.poster) !== null && _a !== void 0 ? _a : anime === null || anime === void 0 ? void 0 : anime.poster,
                        title: (_b = details.title) !== null && _b !== void 0 ? _b : anime === null || anime === void 0 ? void 0 : anime.title,
                        type: (_c = details.type) !== null && _c !== void 0 ? _c : anime === null || anime === void 0 ? void 0 : anime.type,
                        background: details.poster,
                        episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    },
                    create: {
                        id: decodedAnimefireUrl,
                        title: (_d = details.title) !== null && _d !== void 0 ? _d : 'Unknown Title',
                        type: (_e = details.type) !== null && _e !== void 0 ? _e : type,
                        animefireUrl: decodedAnimefireUrl,
                        description: details.description,
                        genres: genresAsString,
                        releaseYear: details.releaseYear,
                        background: details.poster,
                        poster: details.poster,
                        episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                    }
                });
            }
            else {
                console.warn(`Could not scrape details for ${decodedAnimefireUrl}.`);
                if (!anime) {
                    return Promise.reject(new Error('Detalhes do anime não encontrados após scraping.'));
                }
            }
        }
        else {
        }
        if (!anime) {
            return Promise.reject(new Error('Anime não encontrado.'));
        }
        return anime;
    });
}
