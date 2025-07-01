import { findUnique } from "../persistence/db";
import { scrapeAnimeFireDirectStreams } from "../providers/animeFire/addon";
import { ScrapedEpisodeAnimeFire, ScrapedEpisodeTorrent, ScrapedStream, Stream } from "../utils/types/types";
import { scrapeMagnetLinks } from "./scraperStream";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function convertStringInfoData(id: string): { animeFireUrl: string, season?: number, episode?: number } {
    const parts = id.split(':');
    if (parts.length === 1) {
        return { animeFireUrl: parts[0] };
    } else if (parts.length === 2) {
        return { animeFireUrl: parts[0], season: parseInt(parts[1]) };
    } else if (parts.length === 3) {
        return { animeFireUrl: decodeURIComponent(parts[0]) , season: parseInt(parts[1]), episode: parseInt(parts[2]) };
    }
    throw new Error(`ID format not recognized: ${id}`);
}

function searchEpisodeInEpisodesData(animeRecordFromDb: any, season: number, episode: number): any {
    const episodesDataRaw = animeRecordFromDb.episodesData;
    let episodes: ScrapedEpisodeAnimeFire[] = [];
    if (typeof episodesDataRaw === 'string' && episodesDataRaw.length > 0) {
        try {
            const parsedData = JSON.parse(episodesDataRaw);
            if (Array.isArray(parsedData)) {
                episodes = parsedData;
            } else if (typeof parsedData === 'object' && parsedData !== null && 'episode' in parsedData) {
                episodes = [parsedData as ScrapedEpisodeAnimeFire];
                console.warn("[ScraperAnimeFireStream] episodesData parsed as single object, wrapped in array for 'find'. Please fix data saving to store as array.");
            } else {
                console.error("[ScraperAnimeFireStream] Parsed episodesData is neither an array nor a single episode object:", parsedData);
            }
        } catch (e) {
            console.error("[ScraperAnimeFireStream] Erro ao converter episodesData:", e);
        }
    } else {
        console.warn("[ScraperAnimeFireStream] episodesData is not a valid string or is empty.");
    }
    return episodes.filter(ep => ep.episode === episode);
}

export async function scraperAnimeFireStreams(streams: Stream[] ,id: string, type: "series" | "movie", season?: number, episode?: number): Promise<{ streams: Stream[] }> {
    const infoData = convertStringInfoData(id);
    const currentSeason = season ?? infoData.season ?? 1;
    const currentEpisode = episode ?? infoData.episode ?? 1;  
    const animeFireUrl = infoData.animeFireUrl;
    const animeRecordFromDb = await findUnique(animeFireUrl);
    
    if(!animeFireUrl){
        return { streams: [] };
    }

    if(animeRecordFromDb && animeRecordFromDb?.episodesData){
        const foundTargetEpisodes = await searchEpisodeInEpisodesData(animeRecordFromDb, currentSeason, currentEpisode);

        if (foundTargetEpisodes.length > 0) {
            for (const foundEpisode of foundTargetEpisodes) {
                if (foundEpisode?.episodeUrl) {
                    const animefireContentUrl = foundEpisode.episodeUrl;
                    streams.push({
                        name: 'AnimeFire',
                        title: animeRecordFromDb.title || `S${currentSeason}E${currentEpisode} (AnimeFire)`,
                        url: animefireContentUrl,
                        behaviorHints: {"bingeGroup":animeFireUrl}
                    });
                } else {
                    console.warn(`[ScraperAnimeFireStream] Episódio encontrado ${foundEpisode.episode} não possui 'episodeUrl'.`);
                }
            }
        } else {
            console.warn(`[ScraperAnimeFireStream] Target episode ${currentEpisode} not found.`);
            const directStreams: ScrapedStream[] = await scrapeAnimeFireDirectStreams(
                animeFireUrl,
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
            if(streams.length === 0) {
                //----------------------------------------------------------
                const episodesData: ScrapedEpisodeTorrent[] = animeRecordFromDb?.episodesData ? JSON.parse(animeRecordFromDb.episodesData) : [];
                const existingTorrentStream = episodesData.find(ep =>
                    (ep.season ?? null) === (currentSeason ?? null) &&
                    (ep.episode ?? null) === (currentEpisode ?? null) &&
                    (ep.url !== '' && ep.url !== null && ep.url !== undefined)
                );

                if (existingTorrentStream) {
                    console.log(`[StreamHandler] ✅ Stream de torrent/magnet existente encontrado no DB para S${currentSeason}E${currentEpisode}.`);
                    streams.push({
                        name: existingTorrentStream.source ?? 'Real-Debrid',
                        title: existingTorrentStream.title,
                        url: existingTorrentStream.url ?? ''
                    });
                } else {
                    console.log(`[StreamHandler] 🔎 Nenhum stream de torrent/magnet cacheado. Raspando magnet links...`);
                    const scrapeOptions = {
                        imdbId: animeRecordFromDb.imdbId,
                        type: animeRecordFromDb.type,
                        name: animeRecordFromDb.title,
                        season: currentSeason,
                        episode: currentEpisode,
                    };
                    const magnetLinks = await scrapeMagnetLinks(scrapeOptions);
                    let updatedEpisodesData = [...episodesData];

                    for (const link of magnetLinks) {
                        if (link.url) {
                            streams.push({
                                name: link.name || 'Real-Debrid',
                                title: link.title || `S${currentSeason}E${currentEpisode}`,
                                url: link.url
                            });

                            const existingIndex = updatedEpisodesData.findIndex(ep =>
                                (ep.season ?? null) === (currentSeason ?? null) &&
                                (ep.episode ?? null) === (currentEpisode ?? null)
                            );
                            if (existingIndex > -1) {
                                updatedEpisodesData[existingIndex] = { ...updatedEpisodesData[existingIndex], ...link };
                            } else {
                                updatedEpisodesData.push({
                                    season: currentSeason,
                                    episode: currentEpisode,
                                    title: link.title ?? '',
                                    magnet: link.magnet ?? '',
                                    source: link.name,
                                    url: link.url,
                                    animeFireStream: link.animeFire
                                });
                            }
                        }
                    } 
                    if (animeRecordFromDb && animeRecordFromDb.id) {
                        await prisma.anime.updateMany({
                            where: { stremioId: animeRecordFromDb.stremioId },
                            data: { episodesData: JSON.stringify(updatedEpisodesData) }
                        });
                        console.log(`[StreamHandler] ✅ Episódios de torrent/magnet atualizados no DB para ${animeRecordFromDb.title}.`);
                    }
                }
                //-----------------------------------------------------------
            }
        }
    } else {
        const directStreams: ScrapedStream[] = await scrapeAnimeFireDirectStreams(
            animeFireUrl,
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
    }
    return { streams };
}