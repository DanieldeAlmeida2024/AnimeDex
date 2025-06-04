import express from 'express';
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk'); 
import * as dotenv from 'dotenv';
import { manifest } from './utils/manifest';
import { ScrapedEpisodeAnimeFire, ScrapedEpisodeTorrent, ScrapedStream, ScrapedStreamAnimeFire, Stream } from './utils/types/types';
import { setRealDebridAuthToken } from './utils/realDebridApi';
import { PrismaClient } from '@prisma/client';
import { getTmdbInfoByImdbId } from './utils/tmdbApi';
import { scrapeMagnetLinks } from './services/scraper';
import { animeFireHeadler, animeFireMetaHeadler, animeFireStreamHeadler, scrapeAnimeFireDirectStreams } from './providers/animeFire/addon';
import { findUnique } from './persistence/db';

dotenv.config();
const prisma = new PrismaClient();
const MY_REALDEBRID_API_TOKEN = process.env.REALDEBRID_API_TOKEN || '';
setRealDebridAuthToken(MY_REALDEBRID_API_TOKEN);

const builder = addonBuilder(manifest);


builder.defineCatalogHandler(async ({ type, id, extra }: { type: string; id: string; extra: { search?: string; skip?: string } }) => {
    const metas = await animeFireHeadler({type, id, extra});
    console.log(`Retornado ${metas.metas.length} metas`)
    return Promise.resolve( metas );
});

builder.defineMetaHandler(async ({ id, type }: { id: string; type: string }) => {
        const result = await animeFireMetaHeadler(id, type);
        return Promise.resolve(result);
});

builder.defineStreamHandler(async ({ id, type, season, episode }: { id: string; type: "series" | "movie", season?: number, episode?: number }) => {
    console.log(`[StreamHandler] ➡️ Entrou no Stream Handler para ID: "${id}", Tipo: "${type}", Temporada: ${season}, Episódio: ${episode}`);
    const isImdbIdOnly = /^tt\d+$/.test(id);
    const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
    const isEncodedAnimeFireUrl = id.includes('animefire.plus');

    let streams: Stream[] = []; // O Stremio SDK espera um array de objetos 'Stream'

    try {
        if (isImdbIdOnly || isStremioImdbEpisodeId) {
            // --- Lógica para IDs baseados em IMDb ---
            console.log(`[StreamHandler] 🎯 ID detectado como IMDb (${id}).`);

            const [imdbId, targetSeasonStr, targetEpisodeStr] = id.split(':');
            const targetSeason = targetSeasonStr ? parseInt(targetSeasonStr, 10) : season;
            const targetEpisode = targetEpisodeStr ? parseInt(targetEpisodeStr, 10) : episode;

            let animeRecord = await prisma.anime.findFirst({
                where: { stremioId: imdbId }
            });



            if (!animeRecord) {
                console.log(`[StreamHandler] Anime não encontrado no DB para IMDb ID: ${imdbId}. Tentando buscar no TMDB.`);
                const tmdbInfo = await getTmdbInfoByImdbId(imdbId);
                if (tmdbInfo) {
                    // É importante que tmdbInfo.type esteja mapeado para 'movie' ou 'series'
                    animeRecord = await prisma.anime.create({
                        data: {
                            imdbId: tmdbInfo.imdbId ? tmdbInfo.imdbId : '',
                            title: tmdbInfo.title || 'Unknown Title',
                            poster: tmdbInfo.poster ?? '',
                            background: tmdbInfo.background,
                            genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                            releaseYear: tmdbInfo.releaseYear,
                            description: tmdbInfo.description,
                            type: tmdbInfo.type as 'movie' | 'series', // Garanta que o tipo está correto
                            stremioId: imdbId, // Use o IMDb ID como stremioId aqui, se essa for sua estratégia
                            animefireUrl: '', // Pode ser necessário um fallback ou buscar isso
                            lastSearchedAt: new Date(),
                        }
                    });
                    console.log(`[StreamHandler] Novo registro de anime criado para IMDb ID: ${imdbId}.`);
                } else {
                    console.warn(`[StreamHandler] Nenhuma informação encontrada para IMDb ID: ${imdbId}.`);
                    return { streams: [] };
                }
            } else {
                console.log(`[StreamHandler] Anime encontrado no DB para IMDb ID: ${imdbId}.`);
                // Atualiza o lastSearchedAt se o registro já existe
                await prisma.anime.updateMany({
                    where: { imdbId: animeRecord.imdbId },
                    data: { lastSearchedAt: new Date() }
                });
            }

            const episodesData: ScrapedEpisodeTorrent[] = animeRecord?.episodesData ? JSON.parse(animeRecord.episodesData) : [];
            const existingTorrentStream = episodesData.find(ep =>
                (ep.season ?? null) === (targetSeason ?? null) &&
                (ep.episode ?? null) === (targetEpisode ?? null) &&
                (ep.url !== '' && ep.url !== null && ep.url !== undefined)
            );

            if (existingTorrentStream) {
                console.log(`[StreamHandler] ✅ Stream de torrent/magnet existente encontrado no DB para S${targetSeason}E${targetEpisode}.`);
                streams.push({
                    name: existingTorrentStream.source ?? 'Real-Debrid',
                    title: existingTorrentStream.title,
                    url: existingTorrentStream.url ?? ''
                });
            } else {
                console.log(`[StreamHandler] 🔎 Nenhum stream de torrent/magnet cacheado. Raspando magnet links...`);
                const scrapeOptions = {
                    imdbId: imdbId,
                    type: type as "movie" | "series",
                    name: animeRecord.title, // Passa o nome do anime
                    season: targetSeason,
                    episode: targetEpisode,
                };
                const magnetLinks = await scrapeMagnetLinks(scrapeOptions);

                let updatedEpisodesData = [...episodesData];

                for (const link of magnetLinks) {
                    if (link.url) {
                        streams.push({
                            name: link.name || 'Real-Debrid',
                            title: link.title || `S${targetSeason}E${targetEpisode}`,
                            url: link.url
                        });

                        // Adiciona/Atualiza o episódio no cache
                        const existingIndex = updatedEpisodesData.findIndex(ep =>
                            (ep.season ?? null) === (targetSeason ?? null) &&
                            (ep.episode ?? null) === (targetEpisode ?? null)
                        );
                        if (existingIndex > -1) {
                            updatedEpisodesData[existingIndex] = { ...updatedEpisodesData[existingIndex], ...link };
                        } else {
                            updatedEpisodesData.push({
                                season: targetSeason,
                                episode: targetEpisode,
                                title: link.title ?? '',
                                magnet: link.magnet ?? '',
                                source: link.name,
                                url: link.url,
                                animeFireStream: link.animeFire
                            });
                        }
                    }
                }
                if (animeRecord && animeRecord.id) {
                    await prisma.anime.updateMany({
                        where: { imdbId: animeRecord.imdbId },
                        data: { episodesData: JSON.stringify(updatedEpisodesData) }
                    });
                    console.log(`[StreamHandler] ✅ Episódios de torrent/magnet atualizados no DB para ${animeRecord.title}.`);
                }
            }

        } else {
            // --- Lógica para URLs codificadas do AnimeFire ---
            console.log(`[StreamHandler] 🎯 ID detectado como URL codificada do AnimeFire: "${id}".`);

            let animefireUrl: string | null = null;
            let currentSeason = season;
            let currentEpisode = episode;
            let animefireContentUrl: string;
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
                    } else {
                        // Fallback or throw error if S#E# format is not matched
                        console.warn(`[StreamHandler] Unexpected season/episode format: ${seasonEpisodePart}. Defaulting to S1E1.`);
                        currentSeason = 1;
                        currentEpisode = 1;
                    }
                } else {
                    // Para 'movie' ou outros tipos que não esperam S#E#
                    // Neste caso, se o ID for "URL:S#E#", a parte S#E# será ignorada para filmes.
                    // Se for apenas "URL", `lastColonIndex` será -1 (já tratado acima) ou o id.substring(lastColonIndex + 1) será vazio.
                    console.log(`[StreamHandler] Movie/Base URL format detected: ${animefireUrl}`);
                }
            } catch (e: any) {
                console.error(`[StreamHandler] ❌ Erro ao decodificar/validar ID AnimeFire "${id}": ${e.message}`);
                return { streams: [] };
            }
            
            const animeRecordFromDb = await findUnique(animefireUrl);
            if(animeRecordFromDb && animeRecordFromDb?.episodesData){
                const episodesDataRaw = animeRecordFromDb.episodesData;
                let episodes: ScrapedEpisodeAnimeFire[] = [];
                if (typeof episodesDataRaw === 'string' && episodesDataRaw.length > 0) {
                    try {
                        const parsedData = JSON.parse(episodesDataRaw);
                        if (Array.isArray(parsedData)) {
                            episodes = parsedData;
                        } else if (typeof parsedData === 'object' && parsedData !== null && 'episode' in parsedData) {
                            episodes = [parsedData as ScrapedEpisodeAnimeFire];
                            console.warn("[ADDON MAIN] episodesData parsed as single object, wrapped in array for 'find'. Please fix data saving to store as array.");
                        } else {
                            console.error("[ADDON MAIN] Parsed episodesData is neither an array nor a single episode object:", parsedData);
                        }
                    } catch (e) {
                        console.error("[ADDON MAIN] Error parsing episodesData:", e);
                    }
                } else {
                    console.warn("[ADDON MAIN] episodesData is not a valid string or is empty.");
                }

                console.log(`[ADDON MAIN] episodes (after processing):`, episodes);
                console.log(`[ADDON MAIN] episodes is an array: ${Array.isArray(episodes)}`);
                const foundTargetEpisodes = episodes.filter(ep => ep.episode === currentEpisode);

                if (foundTargetEpisodes.length > 0) {
                    console.log(`[ADDON MAIN] Encontrados ${foundTargetEpisodes.length} registros para o episódio ${currentEpisode}.`);
                    console.log(`[ADDON MAIN] episodes: ${episodes}`); 
                    for (const foundEpisode of foundTargetEpisodes) {
                        if (foundEpisode?.episodeUrl) {
                            const animefireContentUrl = foundEpisode.episodeUrl;
                            console.log(`[AnimeFireDirectScraper] Encontrada URL do episódio ${currentEpisode} no DB: ${animefireContentUrl}`);

                            streams.push({
                                name: 'AnimeFire',
                                // Use o título do registro do DB se disponível, ou um padrão
                                title: animeRecordFromDb.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                                url: animefireContentUrl,
                            });
                        } else {
                            console.warn(`[ADDON MAIN] Episódio encontrado ${foundEpisode.episode} não possui 'episodeUrl'.`);
                        }
                    }
                } else {
                    console.warn(`[ADDON MAIN] Target episode ${currentEpisode} not found.`);
                    const directStreams: ScrapedStream[] = await scrapeAnimeFireDirectStreams(
                        animefireUrl,
                        currentSeason,
                        currentEpisode,
                        type
                    );
                    for (const stream of directStreams) {
                        if (stream.url) {
                            streams.push({
                                name: stream.name || 'AnimeFire',
                                title: stream.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                                url: stream.url,
                            });
                        }
                    }
                    return {streams}
                }


            } else {
                console.warn(`[AnimeFireDirectScraper] URL do episódio ${episode} não encontrada no DB para ${animefireUrl}. Tentando construção de fallback.`);
                    console.warn(`[ADDON MAIN] Target episode ${currentEpisode} not found.`);
                    const directStreams: ScrapedStream[] = await scrapeAnimeFireDirectStreams(
                        animefireUrl,
                        currentSeason,
                        currentEpisode,
                        type
                    );
                    for (const stream of directStreams) {
                        if (stream.url) {
                            streams.push({
                                name: stream.name || 'AnimeFire',
                                title: stream.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                                url: stream.url,
                            });
                        }
                    }
                    return {streams}
            }
        }
    } catch (error: any) {
        console.error(`[StreamHandler] ❌ ERRO GERAL no Stream Handler para ID "${id}": ${error.message}`);
        return Promise.reject(new Error(`Failed to retrieve streams: ${error.message}`));
    }

    console.log(`[StreamHandler] Retornando ${streams.length} streams para ID: "${id}".`);
    return { streams };
});

const app = express();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon is running on port 7000');