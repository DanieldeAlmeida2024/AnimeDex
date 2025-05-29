import { ScrapedAnime, Meta, Stream, ScrapedEpisode } from '../../utils/types/types';
import { scrapeAtualizadosAnimes, scrapeDubladosAnimes, scrapeLegendadosAnimes, scrapeTopAnimes,scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './services/animefireScraper';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import {PROVIDER_URL} from './constants/url';
import { manifest } from './utils/manifest';
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk')

const BASE_URL = PROVIDER_URL;
const prisma = new PrismaClient();
const builder = addonBuilder(manifest);
builder.defineCatalogHandler(async ({ type, id, extra }: { type: string; id: string; extra: { search?: string; skip?: string } }) => {
    
    const { search, skip } = extra;
    const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;

    let scrapedAnimes: ScrapedAnime[] = [];
    if (search?.search) { 
        scrapedAnimes = await searchAnimes(search, type as 'movie' | 'series');
    }else{
        switch (id) {
            case 'animefire_series_catalog': // Antigo "Top Animes" para séries
                scrapedAnimes = await scrapeTopAnimes(type as 'series', page);
                break;
            case 'animefire_movies_catalog': // Antigo "Filmes Dublados" para filmes
                scrapedAnimes = await scrapeDubladosAnimes(type as 'movie', page); // Usando a função de dublados para filmes
                break;
            case 'animefire_lancamentos_series_catalog':
                scrapedAnimes = await scrapeRecentAnimes(type as 'series', page); // 'em-lancamento' para séries
                break;
            case 'animefire_lancamentos_movies_catalog':
                // Se 'em-lancamento' também tiver filmes e você quiser um catálogo separado,
                // você pode chamar scrapeRecentAnimes aqui também, mas o filtro interno é crucial.
                // Ou, se houver uma URL específica para filmes em lançamento, use-a.
                // Por enquanto, vamos apontar para a mesma função, confiando no filtro interno.
                scrapedAnimes = await scrapeRecentAnimes(type as 'movie', page); // 'em-lancamento' para filmes
                break;
            case 'animefire_atualizados_series_catalog':
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
                break;
            case 'animefire_atualizados_movies_catalog':
                // Assumindo que 'animes-atualizados' pode ter filmes também, e você quer filtrar.
                // Se o site tiver uma URL específica para filmes atualizados, use-a.
                scrapedAnimes = await scrapeAtualizadosAnimes(type as 'movie', page);
                break;
            case 'animefire_dublados_series_catalog':
                scrapedAnimes = await scrapeDubladosAnimes(type as 'series', page);
                break;
            case 'animefire_legendados_series_catalog':
                scrapedAnimes = await scrapeLegendadosAnimes(type as 'series', page);
                break;
            case 'animefire_legendados_movies_catalog':
                scrapedAnimes = await scrapeLegendadosAnimes(type as 'movie', page);
                break;
            default:
                console.warn(`Catálogo desconhecido solicitado: ${id}. Retornando vazio.`);
                break;
        }

    } // Usa um switch-case para chamar a função de scraping correta com base no ID do catálogo
        
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

    const decodedAnimefireUrl = decodeURIComponent(
        id.replace(`animefire_${type}_`, '')
    );
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
                    background: details.poster,
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
                    background: details.poster,
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
        background: anime.poster ?? undefined,
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

                const anime = await prisma.anime.findUnique({ where: { animefireUrl: animefireUrlBase } });

                if (anime && anime.episodesData) {
                    const episodes: ScrapedEpisode[] = JSON.parse(anime.episodesData);
                    const targetEpisode = episodes.find(ep => ep.episode.toString() === episodeNumberStr);

                    if (targetEpisode && targetEpisode.episodeUrl) {
                        animefireContentUrl = targetEpisode.episodeUrl; // <-- ESTA É A LINHA CRÍTICA
                    } else {
                        console.warn(`[STREAM_HANDLER_DEBUG] Episode ${episodeNumberStr} not found in DB for ${animefireUrlBase} or episodeUrl is missing. Attempting to construct URL.`);
                        // Fallback se a URL do episódio não estiver no DB
                        animefireContentUrl = `${animefireUrlBase}/${episodeNumberStr}`;
                    }
                } else {
                    console.warn(`[STREAM_HANDLER_DEBUG] No episode data in DB for ${animefireUrlBase} during stream request. Attempting to construct URL.`);
                    // Fallback se não há dados de episódios no DB
                    animefireContentUrl = `${animefireUrlBase}/${episodeNumberStr}`;
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