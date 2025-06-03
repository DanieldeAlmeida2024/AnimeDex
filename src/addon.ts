import express from 'express';
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk'); 
import * as dotenv from 'dotenv';
import { manifest } from './utils/manifest';
import { ScrapedEpisodeTorrent, ScrapedStream, ScrapedStreamAnimeFire, Stream } from './utils/types/types';
import { setRealDebridAuthToken } from './utils/realDebridApi';
import { PrismaClient } from '@prisma/client';
import { getTmdbInfoByImdbId } from './utils/tmdbApi';
import { scrapeMagnetLinks } from './services/scraper';
import { animeFireHeadler, animeFireMetaHeadler, animeFireStreamHeadler, scrapeAnimeFireDirectStreams } from './providers/animeFire/addon';

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
    const decodedAnimefireUrl = decodeURIComponent(
        id.replace(`animedex_${type}_`, '')
    );
    try {
        const result = await animeFireMetaHeadler(decodedAnimefireUrl, type);
        return Promise.resolve(result);
    } catch (error: any) {
        return Promise.reject(new Error(`Failed to retrieve meta for ${id}: ${error.message}`));
    }
});

builder.defineStreamHandler(async ({ id, type, season, episode }: { id: string; type: string, season?: number, episode?: number }) => {
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

            try {
                const parts = id.split(':');
                animefireUrl = decodeURIComponent(parts[0]);
                if (parts.length > 1 && type === 'series') {
                    currentSeason = parseInt(parts[1]?.substring(1) || '1', 10);
                    currentEpisode = parseInt(parts[2]?.substring(1) || '1', 10);
                    console.log(`[StreamHandler] Series ID format detected. Base URL: ${animefireUrl}, S:${currentSeason}, E:${currentEpisode}`);
                } else {
                    console.log(`[StreamHandler] Movie/Base URL format detected: ${animefireUrl}`);
                }
                if (!animefireUrl.startsWith('http')) {
                    throw new Error('ID decodificado não é uma URL válida.');
                }
            } catch (e: any) {
                console.error(`[StreamHandler] ❌ Erro ao decodificar/validar ID AnimeFire "${id}": ${e.message}`);
                return { streams: [] };
            }

            const animeRecordFromDb = await prisma.anime.findFirst({
                where: { stremioId: animefireUrl }
            });

            // Adicione uma lógica para buscar streams diretos do AnimeFire
            // Esta função deve ser implementada por você e raspar a URL do AnimeFire
            const directStreams: ScrapedStream[] = await scrapeAnimeFireDirectStreams(
                animeRecordFromDb?.animefireUrl ?? '',
                currentSeason,
                currentEpisode,
                type as 'movie' | 'series'
            );

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