
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk'); 
const https = require('https');
const fs = require('fs');
import * as dotenv from 'dotenv';
import { manifest } from './utils/manifest';
import { Stream } from './utils/types/types';
import { PrismaClient } from '@prisma/client';
import { scraperTorrentsStreams } from './services/scraperStream';
import { animeFireHeadler, animeFireMetaHeadler } from './providers/animeFire/addon';
import { scraperAnimeFireStreams } from './services/scraperAnimeFireStream';

dotenv.config();
const prisma = new PrismaClient();
const builder = addonBuilder(manifest);


builder.defineCatalogHandler(async ({ type, id, extra }: { type: string; id: string; extra: { search?: string; skip?: string } }) => {
    const metas = await animeFireHeadler({type, id, extra});
    return Promise.resolve( metas );
});

builder.defineMetaHandler(async ({ id, type }: { id: string; type: string }) => {
        const isImdbIdOnly = /^tt\d+$/.test(id);
        const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
        if (isImdbIdOnly || isStremioImdbEpisodeId) {

        }else{
            const result = await animeFireMetaHeadler(id, type);
            return Promise.resolve(result);
        }
        return []
});

builder.defineStreamHandler(async ({ id, type, season, episode }: { id: string; type: "series" | "movie", season?: number, episode?: number }) => {
    const isImdbIdOnly = /^tt\d+$/.test(id);
    const isStremioImdbEpisodeId = /^tt\d+:\d+:\d+$/.test(id);
    let streams: Stream[] = []; 

    try {
        if (isImdbIdOnly || isStremioImdbEpisodeId) {
            return await scraperTorrentsStreams(streams, id, type, season, episode);
        } else {
            return await scraperAnimeFireStreams(streams, id, type, season, episode);
        }
    } catch (error: any) {
        console.error(`[StreamHandler] ❌ ERRO GERAL no Stream Handler para ID "${id}": ${error.message}`);
        return Promise.reject(new Error(`Failed to retrieve streams: ${error.message}`));
    }
});


serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Addon rodando na porta 7000');