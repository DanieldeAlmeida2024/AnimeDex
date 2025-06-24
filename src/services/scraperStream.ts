import { searchAnimeTorrentsDarkmahou } from '../providers/darkmahou/services/darkmahouScraper';
import { searchAnimeTorrentsNyaa } from '../providers/nyaa/services/nyaaScraper';
import { extractImdbIdFromGoogle } from '../utils/GoogleSearch';
import { getTmdbInfoByImdbId } from '../utils/tmdbApi';
import { ScrapedEpisodeTorrent, ScrapedStream, ScrapeOptions, Stream } from '../utils/types/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function scraperTorrentsStreams(streams: Stream[], id: string, type: string, season?: number, episode?: number): Promise<{ streams: Stream[] }> {

    const [imdbId, targetSeasonStr, targetEpisodeStr] = id.split(':');
    const targetSeason = targetSeasonStr ? parseInt(targetSeasonStr, 10) : season;
    const targetEpisode = targetEpisodeStr ? parseInt(targetEpisodeStr, 10) : episode;

    let animeRecord = await prisma.anime.findFirst({
        where: { stremioId: imdbId }
    });



    if (!animeRecord) {
        const tmdbInfo = await getTmdbInfoByImdbId(imdbId);
        if (tmdbInfo) {
            animeRecord = await prisma.anime.create({
                data: {
                    imdbId: tmdbInfo.imdbId ? tmdbInfo.imdbId : '',
                    title: tmdbInfo.title || 'Unknown Title',
                    poster: tmdbInfo.poster ?? '',
                    background: tmdbInfo.background,
                    genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                    releaseYear: tmdbInfo.releaseYear,
                    description: tmdbInfo.description,
                    type: tmdbInfo.type as 'movie' | 'series',
                    stremioId: imdbId, 
                    animefireUrl: '',
                    lastSearchedAt: new Date(),
                }
            });
        } else {
            console.warn(`[StreamHandler] Nenhuma informação encontrada para IMDb ID: ${imdbId}.`);
            return { streams: [] };
        }
    } else {
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
        streams.push({
            name: existingTorrentStream.source ?? 'Real-Debrid',
            title: existingTorrentStream.title,
            url: existingTorrentStream.url ?? ''
        });
    } else {
        const scrapeOptions = {
            imdbId: imdbId,
            type: type as "movie" | "series",
            name: animeRecord.title, 
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
                where: { stremioId: animeRecord.stremioId },
                data: { episodesData: JSON.stringify(updatedEpisodesData) }
            });
        }
    }
    return { streams };
}


export async function scrapeMagnetLinks(options: ScrapeOptions): Promise<ScrapedStream[]> {
    const { name, season, episode } = options;
    const streams: ScrapedStream[] = [];

    if (name) {
        try {
            const torrents = await searchAnimeTorrentsNyaa(name, season, episode);
            streams.push(...torrents);
            console.log(`Scraped Nyaa para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            if(streams.length === 0) {
                const torrents = await searchAnimeTorrentsDarkmahou(name, season, episode);
                streams.push(...torrents);
                console.log(`Scraped Darkmahou para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            }
        } catch (torrentError: any) {

        }
    }

    return streams;
}

export async function scrapeImdbInfoForGoogle(nome:string): Promise<string | null> {
    return await extractImdbIdFromGoogle(nome);
}