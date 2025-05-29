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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const animefireScraper_1 = require("./animefireScraper");
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const BASE_URL = 'https://animefire.plus';
const prisma = new client_1.PrismaClient();
const manifest = {
    id: 'org.stremio.animefire-plus-addon',
    version: '1.0.0',
    name: 'AnimeFire.plus Addon',
    description: 'Busca animes (filmes e séries) do AnimeFire.plus para o Stremio.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'series',
            id: 'animefire_series_catalog',
            name: 'AnimeFire Series',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animefire_movies_catalog',
            name: 'AnimeFire Filmes',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
};
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const builder = addonBuilder(manifest);
builder.defineCatalogHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ type, id, extra }) {
    console.log(`Recebida requisição de catálogo: Type=${type}, ID=${id}, Extra=${JSON.stringify(extra)}`);
    const { search, skip } = extra;
    const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;
    let scrapedAnimes = [];
    if (search) {
        scrapedAnimes = yield (0, animefireScraper_1.searchAnimes)(search, page);
    }
    else {
        scrapedAnimes = yield (0, animefireScraper_1.scrapeRecentAnimes)(type, page);
    }
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
            console.error(`Erro ao salvar/atualizar anime no DB (${scrapedAnime.title}):`, e.message);
        }
    }
    const metas = scrapedAnimes.map(anime => {
        var _a;
        return ({
            id: `animefire_${anime.type}_${encodeURIComponent(anime.animefireUrl)}`,
            type: anime.type,
            name: anime.title,
            poster: (_a = anime.poster) !== null && _a !== void 0 ? _a : undefined,
            description: '',
            genres: [],
        });
    });
    return Promise.resolve({ metas });
}));
builder.defineMetaHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    var _b, _c, _d, _e, _f, _g, _h, _j;
    console.log(`Recebida requisição de meta: Type=${type}, ID=${id}`);
    const decodedAnimefireUrl = decodeURIComponent(id.replace(`animefire_${type}_`, ''));
    if (!decodedAnimefireUrl || !decodedAnimefireUrl.startsWith(BASE_URL)) {
        return Promise.reject(new Error('ID de anime inválido ou URL base incorreta.'));
    }
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
                    poster: (_b = details.poster) !== null && _b !== void 0 ? _b : anime === null || anime === void 0 ? void 0 : anime.poster,
                    title: (_c = details.title) !== null && _c !== void 0 ? _c : anime === null || anime === void 0 ? void 0 : anime.title,
                    type: (_d = details.type) !== null && _d !== void 0 ? _d : anime === null || anime === void 0 ? void 0 : anime.type,
                    background: details.background,
                    episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                },
                create: {
                    id: decodedAnimefireUrl,
                    title: (_e = details.title) !== null && _e !== void 0 ? _e : 'Unknown Title',
                    type: (_f = details.type) !== null && _f !== void 0 ? _f : type,
                    animefireUrl: decodedAnimefireUrl,
                    description: details.description,
                    genres: genresAsString,
                    releaseYear: details.releaseYear,
                    background: details.background,
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
    const genresAsArray = anime.genres ? anime.genres.split(',') : [];
    const episodesFromDb = anime.episodesData ? JSON.parse(anime.episodesData) : [];
    const meta = {
        id: id,
        type: anime.type,
        name: anime.title,
        poster: (_g = anime.poster) !== null && _g !== void 0 ? _g : undefined,
        description: (_h = anime.description) !== null && _h !== void 0 ? _h : undefined,
        genres: genresAsArray,
        releaseInfo: anime.releaseYear !== null ? anime.releaseYear : undefined,
        background: (_j = anime.background) !== null && _j !== void 0 ? _j : undefined,
        videos: type === 'series' && episodesFromDb.length > 0 ? episodesFromDb.map(ep => ({
            id: ep.id,
            title: ep.title,
            season: ep.season,
            episode: ep.episode,
            released: ep.released,
        })) : undefined,
    };
    return Promise.resolve({ meta });
}));
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type }) {
    console.log(`Recebida requisição de stream: Type=${type}, ID=${id}`);
    let animefireContentUrl = '';
    if (type === 'movie') {
        animefireContentUrl = decodeURIComponent(id.replace(`animefire_movie_`, ''));
    }
    else if (type === 'series') {
        const parts = id.split(':');
        if (parts.length === 2) {
            const animefireUrlEncoded = parts[0];
            const animefireUrlBase = decodeURIComponent(animefireUrlEncoded);
            const episodeNumberStr = parts[1];
            const anime = yield prisma.anime.findUnique({ where: { animefireUrl: animefireUrlBase } });
            if (anime && anime.episodesData) {
                const episodes = JSON.parse(anime.episodesData);
                const targetEpisode = episodes.find(ep => ep.episode.toString() === episodeNumberStr);
                if (targetEpisode && targetEpisode.episodeUrl) {
                    animefireContentUrl = targetEpisode.episodeUrl; // <-- ESTA É A LINHA CRÍTICA
                }
                else {
                    console.warn(`[ADDON_STREAM] Episode ${episodeNumberStr} not found in DB for ${animefireUrlBase} or episodeUrl is missing. Attempting to construct URL.`);
                    // Fallback se a URL do episódio não estiver no DB
                    animefireContentUrl = `${animefireUrlBase}/episodio/${episodeNumberStr}`;
                }
            }
            else {
                console.warn(`[ADDON_STREAM] No episode data in DB for ${animefireUrlBase}. Attempting to construct URL.`);
                // Fallback se não há dados de episódios no DB
                animefireContentUrl = `${animefireUrlBase}/episodio/${episodeNumberStr}`;
            }
        }
        else {
            return Promise.reject(new Error(`ID de episódio de série inválido: ${id}. Formato esperado: 'URL_ANIME_CODIFICADA:NUMERO_EPISODIO'`));
        }
    }
    else {
        return Promise.reject(new Error('Tipo de conteúdo não suportado para streams.'));
    }
    if (!animefireContentUrl || !animefireContentUrl.startsWith(BASE_URL)) {
        return Promise.reject(new Error('URL de conteúdo inválida para streams.'));
    }
    const streams = yield (0, animefireScraper_1.scrapeStreamsFromContentPage)(animefireContentUrl);
    if (streams.length === 0) {
        return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
    }
    return Promise.resolve({ streams });
}));
const app = (0, express_1.default)();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Stremio Addon rodando na porta 7000');
console.log('Manifest URL:');
