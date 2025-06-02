import express from 'express';
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk'); 
import * as dotenv from 'dotenv';
import { manifest } from './utils/manifest';
import { ScrapedStream, ScrapedTorrentStream, ScrapedEpisodeTorrent, ScrapedEpisode, ScrapedAnime, Meta } from './utils/types/types';
import { setRealDebridAuthToken } from './utils/realDebridApi';
import { PrismaClient } from '@prisma/client';
import { getTmdbInfoByImdbId } from './utils/tmdbApi';
import { scrapeMagnetLinks } from './services/scraper';
import { animeFireHeadler, animeFireMetaHeadler } from './providers/animeFire/addon';

dotenv.config();
const prisma = new PrismaClient();
const MY_REALDEBRID_API_TOKEN = process.env.REALDEBRID_API_TOKEN || '';
setRealDebridAuthToken(MY_REALDEBRID_API_TOKEN);

const builder = addonBuilder(manifest);


builder.defineCatalogHandler(async ({ type, id, extra }: { type: string; id: string; extra: { search?: string; skip?: string } }) => {
    const metas = await animeFireHeadler({type, id, extra});
    console.log(metas)
    return Promise.resolve( metas );
});

builder.defineMetaHandler(async ({ id, type }: { id: string; type: string }) => {

     const meta = animeFireMetaHeadler({id , type});
     return Promise.resolve( meta );
 });

builder.defineStreamHandler(async ({ id, type }: { id: string; type: string }) => {
    let streams: ScrapedStream[] = [];
    const [imdbId, seasonStr, episodeStr] = id.split(':');
    const targetSeason = seasonStr ? parseInt(seasonStr, 10) : undefined;
    const targetEpisode = episodeStr ? parseInt(episodeStr, 10) : undefined;

    let animeName: string | undefined;
    let animeRecord;

    try {
        animeRecord = await prisma.anime.findUnique({
            where: { imdbId: imdbId }
        });

        if (!animeRecord) {
            const tmdbInfo = await getTmdbInfoByImdbId(imdbId);
            if (tmdbInfo) {
                animeRecord = await prisma.anime.create({
                    data: {
                        imdbId: imdbId,
                        title: tmdbInfo.title,
                        poster: tmdbInfo.poster ?? '',
                        background: tmdbInfo.background,
                        genres: tmdbInfo.genres ? JSON.stringify(tmdbInfo.genres) : null,
                        releaseYear: tmdbInfo.releaseYear,
                        description: tmdbInfo.description,
                        type: tmdbInfo.type ?? '',
                        stremioId: id,
                        lastSearchedAt: new Date(),
                        animefireUrl: '', // Provide a default value or fetch the actual URL if available
                    }
                });
            } 
        } else if (animeRecord) {
            if (animeRecord && animeRecord.id) {
                await prisma.anime.update({
                    where: { id: animeRecord.id },
                    data: { lastSearchedAt: new Date() }
                });
            }
            animeName = animeRecord.title;
        }

        const episodesData: ScrapedEpisodeTorrent[] = animeRecord?.episodesData ? JSON.parse(animeRecord.episodesData) : [];
        const existing = episodesData.find(ep =>
            (ep.season ?? null) === (targetSeason ?? null) &&
            (ep.episode ?? null) === (targetEpisode ?? null) &&
            (ep.url != '' || ep.url != null || ep.url != undefined)
        );

        if (existing) {
            streams.push({
                name: existing.source ?? 'Real-Debrid',
                title: existing.title,
                url: existing.url ?? ''
            });
            return { streams };
        }

        const scrapeOptions = {
            imdbId,
            type: type as "movie" | "series",
            name: animeName,
            season: targetSeason,
            episode: targetEpisode,
        };
        const magnetLinks = await scrapeMagnetLinks(scrapeOptions);

        for (const link of magnetLinks) {
            if(link.url == ''){
                continue;
            }
            streams.push({
                name: 'Real-Debrid',
                title: link.title ?? '',
                url: link.url
            });

            episodesData.push({
                season: targetSeason,
                episode: targetEpisode,
                title: link.title ?? '',
                magnet: link.magnet ?? '',
                source: 'Real-Debrid',
                url: link.url ?? '',
                animeFireStream: link.animeFire ?? ''
            });
        }

        if (animeRecord && animeRecord.id) {
            await prisma.anime.update({
                where: { id: animeRecord.id },
                data: {
                    episodesData: JSON.stringify(episodesData)
                }
            });
        }
    } catch (error: any) {
    }

    return { streams };
});

const app = express();
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon is running on port 7000');