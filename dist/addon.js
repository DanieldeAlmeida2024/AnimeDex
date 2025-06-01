"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const dotenv = __importStar(require("dotenv"));
const manifest_1 = require("./utils/manifest");
const realDebridApi_1 = require("./utils/realDebridApi");
const client_1 = require("@prisma/client");
const tmdbApi_1 = require("./utils/tmdbApi");
const scraper_1 = require("./services/scraper");
const addon_1 = require("./providers/animeFire/addon");
dotenv.config();
const prisma = new client_1.PrismaClient();
const MY_REALDEBRID_API_TOKEN = process.env.REALDEBRID_API_TOKEN || '';
(0, realDebridApi_1.setRealDebridAuthToken)(MY_REALDEBRID_API_TOKEN);
const builder = addonBuilder(manifest_1.manifest);
builder.defineCatalogHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ type, id, extra }) {
    const metas = yield (0, addon_1.animeFireHeadler)({ type, id, extra });
    console.log(`[ADDON SRC]Type: ${type}, id: ${id}, extra: ${extra}`);
    return Promise.resolve({ metas });
}));
builder.defineMetaHandler((id) => __awaiter(void 0, void 0, void 0, function* () {
    return ({});
}));
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let streams = [];
    const [imdbId, seasonStr, episodeStr] = id.split(':');
    console.log(id);
    const targetSeason = seasonStr ? parseInt(seasonStr, 10) : undefined;
    const targetEpisode = episodeStr ? parseInt(episodeStr, 10) : undefined;
    let animeName;
    let animeRecord;
    try {
        animeRecord = yield prisma.anime.findUnique({
            where: { imdbId: imdbId }
        });
        if (!animeRecord) {
            const tmdbInfo = yield (0, tmdbApi_1.getTmdbInfoByImdbId)(imdbId);
            if (tmdbInfo) {
                animeRecord = yield prisma.anime.create({
                    data: {
                        imdbId: imdbId,
                        title: tmdbInfo.title,
                        poster: (_b = tmdbInfo.poster) !== null && _b !== void 0 ? _b : '',
                        background: tmdbInfo.background,
                        genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                        releaseYear: tmdbInfo.releaseYear,
                        description: tmdbInfo.description,
                        type: (_c = tmdbInfo.type) !== null && _c !== void 0 ? _c : '',
                        stremioId: id,
                        lastSearchedAt: new Date(),
                    }
                });
            }
        }
        else if (animeRecord) {
            if (animeRecord && animeRecord.id) {
                yield prisma.anime.update({
                    where: { id: animeRecord.id },
                    data: { lastSearchedAt: new Date() }
                });
            }
            animeName = animeRecord.title;
        }
        const episodesData = (animeRecord === null || animeRecord === void 0 ? void 0 : animeRecord.episodesData) ? JSON.parse(animeRecord.episodesData) : [];
        const existing = episodesData.find(ep => {
            var _a, _b;
            return ((_a = ep.season) !== null && _a !== void 0 ? _a : null) === (targetSeason !== null && targetSeason !== void 0 ? targetSeason : null) &&
                ((_b = ep.episode) !== null && _b !== void 0 ? _b : null) === (targetEpisode !== null && targetEpisode !== void 0 ? targetEpisode : null) &&
                (ep.url != '' || ep.url != null || ep.url != undefined);
        });
        if (existing) {
            streams.push({
                name: (_d = existing.source) !== null && _d !== void 0 ? _d : 'Real-Debrid',
                title: existing.title,
                url: (_e = existing.url) !== null && _e !== void 0 ? _e : ''
            });
            return { streams };
        }
        const scrapeOptions = {
            imdbId,
            type: type,
            name: animeName,
            season: targetSeason,
            episode: targetEpisode,
        };
        const magnetLinks = yield (0, scraper_1.scrapeMagnetLinks)(scrapeOptions);
        for (const link of magnetLinks) {
            if (link.url == '') {
                continue;
            }
            streams.push({
                name: 'Real-Debrid',
                title: (_f = link.title) !== null && _f !== void 0 ? _f : '',
                url: link.url
            });
            episodesData.push({
                season: targetSeason,
                episode: targetEpisode,
                title: (_g = link.title) !== null && _g !== void 0 ? _g : '',
                magnet: (_h = link.magnet) !== null && _h !== void 0 ? _h : '',
                source: 'Real-Debrid',
                url: (_j = link.url) !== null && _j !== void 0 ? _j : '',
                animeFireStream: (_k = link.animeFire) !== null && _k !== void 0 ? _k : ''
            });
        }
        if (animeRecord && animeRecord.id) {
            yield prisma.anime.update({
                where: { id: animeRecord.id },
                data: {
                    episodesData: JSON.stringify(episodesData)
                }
            });
        }
    }
    catch (error) {
    }
    return { streams };
}));
const app = (0, express_1.default)();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon is running on port 7000');
