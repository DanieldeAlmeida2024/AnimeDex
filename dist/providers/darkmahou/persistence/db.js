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
const client_1 = require("@prisma/client");
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
