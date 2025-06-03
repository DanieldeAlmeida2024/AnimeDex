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
    console.log(`Retornado ${metas.metas.length} metas`);
    return Promise.resolve(metas);
}));
builder.defineMetaHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    const decodedAnimefireUrl = decodeURIComponent(id.replace(`animefire_${type}_`, ''));
    console.log(`[Stremio Addon] ➡️ Entrou no Meta Handler para ID: ${id}, Tipo: ${type}`);
    try {
        const result = yield (0, addon_1.animeFireMetaHeadler)(decodedAnimefireUrl, type);
        // Adicione um log detalhado do resultado
        console.log(`[Stremio Addon] ✅ Retorno bem-sucedido do Meta Handler para ID ${id}:`, JSON.stringify(result, null, 2));
        return Promise.resolve(result);
    }
    catch (error) {
        // MUITO IMPORTANTE: Capturar e logar qualquer erro aqui.
        console.error(`[Stremio Addon] ❌ ERRO no Meta Handler para ID ${id}:`, error.message);
        // Retorne uma Promise.reject para que o Stremio saiba que houve um erro
        return Promise.reject(new Error(`Failed to retrieve meta for ${id}: ${error.message}`));
    }
}));
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type, season, episode }) {
    var _b, _c, _d, _e, _f, _g, _h;
    console.log(`[StreamHandler] ➡️ Entrou no Stream Handler para ID: "${id}", Tipo: "${type}", Temporada: ${season}, Episódio: ${episode}`);
    // Regex para identificar IDs IMDb e variações
    const isImdbIdOnly = /^tt\d+$/.test(id);
    // Para IDs de episódio Stremio padrão (ex: tt12345:1:1)
    const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
    // Para IDs customizados que você pode estar usando (ex: URL codificada do AnimeFire)
    const isEncodedAnimeFireUrl = id.includes('%3A%2F%2F'); // Verifica se tem "://" codificado
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
        else if (isEncodedAnimeFireUrl) {
            // --- Lógica para URLs codificadas do AnimeFire ---
            console.log(`[StreamHandler] 🎯 ID detectado como URL codificada do AnimeFire: "${id}".`);
            let animefireUrl = null;
            let currentSeason = season;
            let currentEpisode = episode;
            try {
                // Se for uma série, o ID virá como 'encodedUrl:S1E1'
                const parts = id.split(':');
                animefireUrl = decodeURIComponent(parts[0]);
                if (parts.length > 1 && type === 'series') {
                    currentSeason = parseInt(((_g = parts[1]) === null || _g === void 0 ? void 0 : _g.substring(1)) || '1', 10);
                    currentEpisode = parseInt(((_h = parts[2]) === null || _h === void 0 ? void 0 : _h.substring(1)) || '1', 10);
                    console.log(`[StreamHandler] Series ID format detected. Base URL: ${animefireUrl}, S:${currentSeason}, E:${currentEpisode}`);
                }
                else {
                    console.log(`[StreamHandler] Movie/Base URL format detected: ${animefireUrl}`);
                }
                if (!animefireUrl.startsWith('http')) {
                    throw new Error('ID decodificado não é uma URL válida.');
                }
            }
            catch (e) {
                console.error(`[StreamHandler] ❌ Erro ao decodificar/validar ID AnimeFire "${id}": ${e.message}`);
                return { streams: [] };
            }
            const animeRecordFromDb = yield prisma.anime.findFirst({
                where: { animefireUrl: animefireUrl }
            });
            // Adicione uma lógica para buscar streams diretos do AnimeFire
            // Esta função deve ser implementada por você e raspar a URL do AnimeFire
            const directStreams = yield (0, addon_1.scrapeAnimeFireDirectStreams)(animefireUrl, currentSeason, currentEpisode, type);
            console.log(`[StreamHandler] Scraped ${directStreams.length} streams diretos do AnimeFire.`);
            for (const stream of directStreams) {
                if (stream.url) {
                    streams.push({
                        name: stream.name || 'AnimeFire',
                        title: stream.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                        url: stream.url,
                    });
                }
            }
            // Opcional: Você pode salvar os streams diretos do AnimeFire no episodesData também
            // se quiser cacheá-los, mas a interface ScrapedEpisodeTorrent não se encaixa perfeitamente aqui.
            // Talvez crie um campo separado para `animeFireEpisodesData` ou adapte o `episodesData`.
            // Por enquanto, vamos apenas retornar os streams.
        }
        else {
            console.warn(`[StreamHandler] ⚠️ ID "${id}" não corresponde a um IMDb ID ou URL codificada do AnimeFire. Tipo: ${type}.`);
        }
    }
    catch (error) {
        console.error(`[StreamHandler] ❌ ERRO GERAL no Stream Handler para ID "${id}": ${error.message}`);
        return Promise.reject(new Error(`Failed to retrieve streams: ${error.message}`));
    }
    console.log(`[StreamHandler] Retornando ${streams.length} streams para ID: "${id}".`);
    return { streams };
}));
const app = (0, express_1.default)();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon is running on port 7000');
