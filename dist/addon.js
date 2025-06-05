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
Object.defineProperty(exports, "__esModule", { value: true });
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
//const express = require('express');
const https = require('https');
const fs = require('fs');
const dotenv = __importStar(require("dotenv"));
const manifest_1 = require("./utils/manifest");
const realDebridApi_1 = require("./utils/realDebridApi");
const client_1 = require("@prisma/client");
const tmdbApi_1 = require("./utils/tmdbApi");
const scraper_1 = require("./services/scraper");
const addon_1 = require("./providers/animeFire/addon");
const db_1 = require("./persistence/db");
dotenv.config();
const prisma = new client_1.PrismaClient();
const MY_REALDEBRID_API_TOKEN = process.env.REALDEBRID_API_TOKEN || '';
(0, realDebridApi_1.setRealDebridAuthToken)(MY_REALDEBRID_API_TOKEN);
const builder = addonBuilder(manifest_1.manifest);
builder.defineCatalogHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ type, id, extra }) {
    const metas = yield (0, addon_1.animeFireHeadler)({ type, id, extra });
    console.log(`Retornado ${metas.metas.length} metas`);
    return Promise.resolve(metas);
}));
builder.defineMetaHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    const isImdbIdOnly = /^tt\d+$/.test(id);
    const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
    if (isImdbIdOnly || isStremioImdbEpisodeId) {
    }
    else {
        const result = yield (0, addon_1.animeFireMetaHeadler)(id, type);
        return Promise.resolve(result);
    }
    return [];
}));
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type, season, episode }) {
    var _b, _c, _d, _e, _f;
    console.log(`[StreamHandler] ➡️ Entrou no Stream Handler para ID: "${id}", Tipo: "${type}", Temporada: ${season}, Episódio: ${episode}`);
    const isImdbIdOnly = /^tt\d+$/.test(id);
    const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
    const isEncodedAnimeFireUrl = id.includes('animefire.plus');
    let streams = []; // O Stremio SDK espera um array de objetos 'Stream'
    try {
        if (isImdbIdOnly || isStremioImdbEpisodeId) {
            // --- Lógica para IDs baseados em IMDb ---
            console.log(`[StreamHandler] 🎯 ID detectado como IMDb (${id}).`);
            const [imdbId, targetSeasonStr, targetEpisodeStr] = id.split(':');
            const targetSeason = targetSeasonStr ? parseInt(targetSeasonStr, 10) : season;
            const targetEpisode = targetEpisodeStr ? parseInt(targetEpisodeStr, 10) : episode;
            let animeRecord = yield prisma.anime.findFirst({
                where: { stremioId: imdbId }
            });
            if (!animeRecord) {
                console.log(`[StreamHandler] Anime não encontrado no DB para IMDb ID: ${imdbId}. Tentando buscar no TMDB.`);
                const tmdbInfo = yield (0, tmdbApi_1.getTmdbInfoByImdbId)(imdbId);
                if (tmdbInfo) {
                    // É importante que tmdbInfo.type esteja mapeado para 'movie' ou 'series'
                    animeRecord = yield prisma.anime.create({
                        data: {
                            imdbId: tmdbInfo.imdbId ? tmdbInfo.imdbId : '',
                            title: tmdbInfo.title || 'Unknown Title',
                            poster: (_b = tmdbInfo.poster) !== null && _b !== void 0 ? _b : '',
                            background: tmdbInfo.background,
                            genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                            releaseYear: tmdbInfo.releaseYear,
                            description: tmdbInfo.description,
                            type: tmdbInfo.type, // Garanta que o tipo está correto
                            stremioId: imdbId, // Use o IMDb ID como stremioId aqui, se essa for sua estratégia
                            animefireUrl: '', // Pode ser necessário um fallback ou buscar isso
                            lastSearchedAt: new Date(),
                        }
                    });
                    console.log(`[StreamHandler] Novo registro de anime criado para IMDb ID: ${imdbId}.`);
                }
                else {
                    console.warn(`[StreamHandler] Nenhuma informação encontrada para IMDb ID: ${imdbId}.`);
                    return { streams: [] };
                }
            }
            else {
                console.log(`[StreamHandler] Anime encontrado no DB para IMDb ID: ${imdbId}.`);
                // Atualiza o lastSearchedAt se o registro já existe
                yield prisma.anime.updateMany({
                    where: { imdbId: animeRecord.imdbId },
                    data: { lastSearchedAt: new Date() }
                });
            }
            const episodesData = (animeRecord === null || animeRecord === void 0 ? void 0 : animeRecord.episodesData) ? JSON.parse(animeRecord.episodesData) : [];
            const existingTorrentStream = episodesData.find(ep => {
                var _a, _b;
                return ((_a = ep.season) !== null && _a !== void 0 ? _a : null) === (targetSeason !== null && targetSeason !== void 0 ? targetSeason : null) &&
                    ((_b = ep.episode) !== null && _b !== void 0 ? _b : null) === (targetEpisode !== null && targetEpisode !== void 0 ? targetEpisode : null) &&
                    (ep.url !== '' && ep.url !== null && ep.url !== undefined);
            });
            if (existingTorrentStream) {
                console.log(`[StreamHandler] ✅ Stream de torrent/magnet existente encontrado no DB para S${targetSeason}E${targetEpisode}.`);
                streams.push({
                    name: (_c = existingTorrentStream.source) !== null && _c !== void 0 ? _c : 'Real-Debrid',
                    title: existingTorrentStream.title,
                    url: (_d = existingTorrentStream.url) !== null && _d !== void 0 ? _d : ''
                });
            }
            else {
                console.log(`[StreamHandler] 🔎 Nenhum stream de torrent/magnet cacheado. Raspando magnet links...`);
                const scrapeOptions = {
                    imdbId: imdbId,
                    type: type,
                    name: animeRecord.title, // Passa o nome do anime
                    season: targetSeason,
                    episode: targetEpisode,
                };
                const magnetLinks = yield (0, scraper_1.scrapeMagnetLinks)(scrapeOptions);
                let updatedEpisodesData = [...episodesData];
                for (const link of magnetLinks) {
                    if (link.url) {
                        streams.push({
                            name: link.name || 'Real-Debrid',
                            title: link.title || `S${targetSeason}E${targetEpisode}`,
                            url: link.url
                        });
                        // Adiciona/Atualiza o episódio no cache
                        const existingIndex = updatedEpisodesData.findIndex(ep => {
                            var _a, _b;
                            return ((_a = ep.season) !== null && _a !== void 0 ? _a : null) === (targetSeason !== null && targetSeason !== void 0 ? targetSeason : null) &&
                                ((_b = ep.episode) !== null && _b !== void 0 ? _b : null) === (targetEpisode !== null && targetEpisode !== void 0 ? targetEpisode : null);
                        });
                        if (existingIndex > -1) {
                            updatedEpisodesData[existingIndex] = Object.assign(Object.assign({}, updatedEpisodesData[existingIndex]), link);
                        }
                        else {
                            updatedEpisodesData.push({
                                season: targetSeason,
                                episode: targetEpisode,
                                title: (_e = link.title) !== null && _e !== void 0 ? _e : '',
                                magnet: (_f = link.magnet) !== null && _f !== void 0 ? _f : '',
                                source: link.name,
                                url: link.url,
                                animeFireStream: link.animeFire
                            });
                        }
                    }
                }
                if (animeRecord && animeRecord.id) {
                    yield prisma.anime.updateMany({
                        where: { imdbId: animeRecord.imdbId },
                        data: { episodesData: JSON.stringify(updatedEpisodesData) }
                    });
                    console.log(`[StreamHandler] ✅ Episódios de torrent/magnet atualizados no DB para ${animeRecord.title}.`);
                }
            }
        }
        else {
            // --- Lógica para URLs codificadas do AnimeFire ---
            console.log(`[StreamHandler] 🎯 ID detectado como URL codificada do AnimeFire: "${id}".`);
            let animefireUrl = null;
            let currentSeason = season;
            let currentEpisode = episode;
            let animefireContentUrl;
            try {
                const lastColonIndex = id.lastIndexOf(':');
                if (lastColonIndex === -1) {
                    throw new Error('ID não possui o formato esperado (URL:S#E#).');
                }
                animefireUrl = decodeURIComponent(id.substring(0, lastColonIndex));
                const seasonEpisodePart = id.substring(lastColonIndex + 1);
                if (type === 'series') {
                    // Regex para extrair S e E
                    const match = seasonEpisodePart.match(/^S(\d+)E(\d+)$/);
                    if (match) {
                        currentSeason = parseInt(match[1], 10);
                        currentEpisode = parseInt(match[2], 10);
                        console.log(`[StreamHandler] Series ID format detected. Base URL: ${animefireUrl}, S:${currentSeason}, E:${currentEpisode}`);
                    }
                    else {
                        // Fallback or throw error if S#E# format is not matched
                        console.warn(`[StreamHandler] Unexpected season/episode format: ${seasonEpisodePart}. Defaulting to S1E1.`);
                        currentSeason = 1;
                        currentEpisode = 1;
                    }
                }
                else {
                    // Para 'movie' ou outros tipos que não esperam S#E#
                    // Neste caso, se o ID for "URL:S#E#", a parte S#E# será ignorada para filmes.
                    // Se for apenas "URL", `lastColonIndex` será -1 (já tratado acima) ou o id.substring(lastColonIndex + 1) será vazio.
                    console.log(`[StreamHandler] Movie/Base URL format detected: ${animefireUrl}`);
                }
            }
            catch (e) {
                console.error(`[StreamHandler] ❌ Erro ao decodificar/validar ID AnimeFire "${id}": ${e.message}`);
                return { streams: [] };
            }
            const animeRecordFromDb = yield (0, db_1.findUnique)(animefireUrl);
            if (animeRecordFromDb && (animeRecordFromDb === null || animeRecordFromDb === void 0 ? void 0 : animeRecordFromDb.episodesData)) {
                const episodesDataRaw = animeRecordFromDb.episodesData;
                let episodes = [];
                if (typeof episodesDataRaw === 'string' && episodesDataRaw.length > 0) {
                    try {
                        const parsedData = JSON.parse(episodesDataRaw);
                        if (Array.isArray(parsedData)) {
                            episodes = parsedData;
                        }
                        else if (typeof parsedData === 'object' && parsedData !== null && 'episode' in parsedData) {
                            episodes = [parsedData];
                            console.warn("[ADDON MAIN] episodesData parsed as single object, wrapped in array for 'find'. Please fix data saving to store as array.");
                        }
                        else {
                            console.error("[ADDON MAIN] Parsed episodesData is neither an array nor a single episode object:", parsedData);
                        }
                    }
                    catch (e) {
                        console.error("[ADDON MAIN] Error parsing episodesData:", e);
                    }
                }
                else {
                    console.warn("[ADDON MAIN] episodesData is not a valid string or is empty.");
                }
                console.log(`[ADDON MAIN] episodes (after processing):`, episodes);
                console.log(`[ADDON MAIN] episodes is an array: ${Array.isArray(episodes)}`);
                const foundTargetEpisodes = episodes.filter(ep => ep.episode === currentEpisode);
                if (foundTargetEpisodes.length > 0) {
                    console.log(`[ADDON MAIN] Encontrados ${foundTargetEpisodes.length} registros para o episódio ${currentEpisode}.`);
                    console.log(`[ADDON MAIN] episodes: ${episodes}`);
                    for (const foundEpisode of foundTargetEpisodes) {
                        if (foundEpisode === null || foundEpisode === void 0 ? void 0 : foundEpisode.episodeUrl) {
                            const animefireContentUrl = foundEpisode.episodeUrl;
                            console.log(`[AnimeFireDirectScraper] Encontrada URL do episódio ${currentEpisode} no DB: ${animefireContentUrl}`);
                            streams.push({
                                name: 'AnimeFire',
                                // Use o título do registro do DB se disponível, ou um padrão
                                title: animeRecordFromDb.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                                url: animefireContentUrl,
                            });
                        }
                        else {
                            console.warn(`[ADDON MAIN] Episódio encontrado ${foundEpisode.episode} não possui 'episodeUrl'.`);
                        }
                    }
                }
                else {
                    console.warn(`[ADDON MAIN] Target episode ${currentEpisode} not found.`);
                    const directStreams = yield (0, addon_1.scrapeAnimeFireDirectStreams)(animefireUrl, currentSeason, currentEpisode, type);
                    for (const stream of directStreams) {
                        if (stream.url) {
                            streams.push({
                                name: stream.name || 'AnimeFire',
                                title: stream.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                                url: stream.url,
                            });
                        }
                    }
                    return { streams };
                }
            }
            else {
                console.warn(`[AnimeFireDirectScraper] URL do episódio ${episode} não encontrada no DB para ${animefireUrl}. Tentando construção de fallback.`);
                console.warn(`[ADDON MAIN] Target episode ${currentEpisode} not found.`);
                const directStreams = yield (0, addon_1.scrapeAnimeFireDirectStreams)(animefireUrl, currentSeason, currentEpisode, type);
                for (const stream of directStreams) {
                    if (stream.url) {
                        streams.push({
                            name: stream.name || 'AnimeFire',
                            title: stream.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                            url: stream.url,
                        });
                    }
                }
                return { streams };
            }
        }
    }
    catch (error) {
        console.error(`[StreamHandler] ❌ ERRO GERAL no Stream Handler para ID "${id}": ${error.message}`);
        return Promise.reject(new Error(`Failed to retrieve streams: ${error.message}`));
    }
    console.log(`[StreamHandler] Retornando ${streams.length} streams para ID: "${id}".`);
    return { streams };
}));
/*
const app = express();
app.listen(3000, () => { // ou 5000, ou outra porta que você configurou no Nginx proxy_pass
  console.log('Express HTTP server rodando internamente na porta 3000 (Nginx fará o proxy HTTPS)');
});
*/
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon rodando na porta 7000');
