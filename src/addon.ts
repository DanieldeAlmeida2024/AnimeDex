import { ScrapedAnime, Meta, Stream, ScrapedEpisode } from './types';
import { scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './animefireScraper';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { parse } from 'path';

const BASE_URL = 'https://animefire.plus';

const prisma = new PrismaClient();

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
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk')

const builder = addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }: { type: string; id: string; extra: { search?: string; skip?: string } }) => {
    console.log(`Recebida requisição de catálogo: Type=${type}, ID=${id}, Extra=${JSON.stringify(extra)}`);
    const { search, skip } = extra;
    const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;

    let scrapedAnimes: ScrapedAnime[] = [];

    if (search) {
        scrapedAnimes = await searchAnimes(search, page);
    } else {
        scrapedAnimes = await scrapeRecentAnimes(type as 'movie' | 'series', page);
    }

    for (const scrapedAnime of scrapedAnimes) {
        try {
            await prisma.anime.upsert({
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
        } catch (e: any) {
            console.error(`Erro ao salvar/atualizar anime no DB (${scrapedAnime.title}):`, e.message);
        }
    }
    
    const metas: Meta[] = scrapedAnimes.map(anime => ({
        id: `animefire_${anime.type}_${encodeURIComponent(anime.animefireUrl)}`,
        type: anime.type,
        name: anime.title,
        poster: anime.poster ?? undefined,
        description: '',
        genres: [],
    }));

    return Promise.resolve({ metas });
});

builder.defineMetaHandler(async ({ id, type }: { id: string; type: string }) => {
    console.log(`Recebida requisição de meta: Type=${type}, ID=${id}`);

    const decodedAnimefireUrl = decodeURIComponent(id.replace(`animefire_${type}_`, ''));
    if (!decodedAnimefireUrl || !decodedAnimefireUrl.startsWith(BASE_URL)) {
        return Promise.reject(new Error('ID de anime inválido ou URL base incorreta.'));
    }

    let anime = await prisma.anime.findUnique({ where: { animefireUrl: decodedAnimefireUrl } });

    if (!anime || !anime.description || !anime.episodesData || anime.lastUpdated.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        const details = await scrapeAnimeDetails(decodedAnimefireUrl);

        if (details) {
            const genresAsString = details.genres ? details.genres.join(',') : null;
            anime = await prisma.anime.upsert({
                where: { animefireUrl: decodedAnimefireUrl },
                update: {
                    description: details.description,
                    genres: genresAsString,
                    releaseYear: details.releaseYear,
                    lastUpdated: new Date(),
                    poster: details.poster ?? anime?.poster,
                    title: details.title ?? anime?.title,
                    type: details.type ?? anime?.type,
                    background: details.background,
                    episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                },
                create: {
                    id: decodedAnimefireUrl,
                    title: details.title ?? 'Unknown Title',
                    type: details.type ?? type,
                    animefireUrl: decodedAnimefireUrl,
                    description: details.description,
                    genres: genresAsString,
                    releaseYear: details.releaseYear,
                    background: details.background,
                    poster: details.poster,
                    episodesData: details.episodes ? JSON.stringify(details.episodes) : null,
                }
            });
        } else {
            console.warn(`Could not scrape details for ${decodedAnimefireUrl}.`);
            if (!anime) {
                return Promise.reject(new Error('Detalhes do anime não encontrados após scraping.'));
            }
        }
    } else {
    }

    if (!anime) {
        return Promise.reject(new Error('Anime não encontrado.'));
    }

    const genresAsArray = anime.genres ? anime.genres.split(',') : [];
    const episodesFromDb: ScrapedEpisode[] = anime.episodesData ? JSON.parse(anime.episodesData) : [];
    const meta: Meta = {
        id: id,
        type: anime.type,
        name: anime.title,
        poster: anime.poster ?? undefined,
        description: anime.description ?? undefined,
        genres: genresAsArray,
        releaseInfo: anime.releaseYear !== null ? anime.releaseYear : undefined,
        background: anime.background ?? undefined,
        videos: type === 'series' && episodesFromDb.length > 0 ? episodesFromDb.map(ep => ({
            id: ep.id,
            title: ep.title,
            season: ep.season,
            episode: ep.episode,
            released: ep.released,
        })) : undefined,
    };

    return Promise.resolve({ meta });
});

    builder.defineStreamHandler(async ({ id, type }: { id: string; type: string }) => {
        console.log(`Recebida requisição de stream: Type=${type}, ID=${id}`);

        let animefireContentUrl = '';

        if (type === 'movie') {
            animefireContentUrl = decodeURIComponent(id.replace(`animefire_movie_`, ''));
        } else if (type === 'series') {
            const parts = id.split(':');
                if (parts.length === 2) {
                    const animefireUrlEncoded = parts[0];
                    const animefireUrlBase = decodeURIComponent(animefireUrlEncoded);
                    let episodeNumberStr = (parts[1]); 
                    if(parseInt(episodeNumberStr) -1 == 0){
                        episodeNumberStr = '1'; 
                    } else {
                        episodeNumberStr = (parseInt(episodeNumberStr) - 1).toString(); // Ajusta o número do episódio para zero-indexed
                    }

                

                    console.log(`[STREAM_HANDLER_DEBUG] ID recebido: ${id}`);
                    console.log(`[STREAM_HANDLER_DEBUG] Anime URL Base: ${animefireUrlBase}, Episode Number String: ${episodeNumberStr}`);

                    const anime = await prisma.anime.findUnique({ where: { animefireUrl: animefireUrlBase } });

                    if (anime && anime.episodesData) {
                        const episodes: ScrapedEpisode[] = JSON.parse(anime.episodesData);
                        const targetEpisode = episodes.find(ep => ep.episode.toString() === episodeNumberStr);

                        if (targetEpisode && targetEpisode.episodeUrl) {
                            animefireContentUrl = targetEpisode.episodeUrl; // <-- ESTA É A LINHA CRÍTICA
                            console.log(`[STREAM_HANDLER_DEBUG] Found target episode in DB. Episode Num: ${targetEpisode.episode}, URL: ${animefireContentUrl}`);
                        } else {
                            console.warn(`[STREAM_HANDLER_DEBUG] Episode ${episodeNumberStr} not found in DB for ${animefireUrlBase} or episodeUrl is missing. Attempting to construct URL.`);
                            // Fallback se a URL do episódio não estiver no DB
                            animefireContentUrl = `${animefireUrlBase}/${episodeNumberStr}`;
                            console.log(`[STREAM_HANDLER_DEBUG] Constructed fallback URL: ${animefireContentUrl}`);
                        }
                    } else {
                        console.warn(`[STREAM_HANDLER_DEBUG] No episode data in DB for ${animefireUrlBase} during stream request. Attempting to construct URL.`);
                        // Fallback se não há dados de episódios no DB
                        animefireContentUrl = `${animefireUrlBase}/episodio/${episodeNumberStr}`;
                        console.log(`[STREAM_HANDLER_DEBUG] Constructed fallback URL (no DB data): ${animefireContentUrl}`);
                    }
                } else {
                    return Promise.reject(new Error(`ID de episódio de série inválido: ${id}. Formato esperado: 'URL_ANIME_CODIFICADA:NUMERO_EPISODIO'`));
                }
            } else {
                return Promise.reject(new Error('Tipo de conteúdo não suportado para streams.'));
            }

        if (!animefireContentUrl || !animefireContentUrl.startsWith(BASE_URL)) {
            return Promise.reject(new Error('URL de conteúdo inválida para streams.'));
        }
        console.log(`[STREAM_HANDLER_DEBUG] AnimeFire Content URL: ${animefireContentUrl}`);
        const streams = await scrapeStreamsFromContentPage(animefireContentUrl);

        if (streams.length === 0) {
            return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
    }

    return Promise.resolve({ streams });
});

const app = express();
serveHTTP(builder.getInterface(),{ port: 7000});
console.log('Stremio Addon rodando na porta 7000');
console.log('Manifest URL:');