import { TORRENT_ANIME_URL } from "../constants/url";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedTorrentStream } from '../../../utils/types/types'; 
import { processMagnetForStreaming } from '../../../utils/realDebridApi';

const NYAA_BASE_URL = TORRENT_ANIME_URL;

/**
 * @param animeTitle 
 * @param targetSeason 
 * @param targetEpisode 
 * @returns 
 */
export async function searchAnimeTorrentsNyaa(
animeTitle: string, 
targetSeason?: number, 
targetEpisode?: number): 
Promise<ScrapedTorrentStream[]> {

    const streams: ScrapedTorrentStream[] = [];
    const encodedTitle = encodeURIComponent(`${animeTitle} pt-br`);
    const searchUrl = `${NYAA_BASE_URL}/?f=0&c=0_0&q=${encodedTitle}`;
    console.log(`${searchUrl}`);

    try {
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 20000
        });
        const $ = cheerio.load(data);

        const torrentRows = $('.torrent-list tbody tr');

        for (const element of torrentRows) {
            const magnetLink = $(element).find('td:nth-child(3) a[href^="magnet:"]').first().attr('href');
            const name = $(element).find('td:nth-child(2) a:not(.comments)').first().attr('title');
            console.log(`Anime encontrado Nyaa ${name}: ${magnetLink}`);
            if (!magnetLink || !name) {
                continue;
            }
            const displayTitle = name.trim();
            const { season, episode, isBatch } = parseSeasonEpisode(displayTitle);

            let isRelevant = false;
            let targetFilePattern: string | undefined;

            if (targetSeason !== undefined && targetEpisode !== undefined) {
                if (season === targetSeason && episode === targetEpisode && !isBatch) {
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    isRelevant = true;
                } else if (season === targetSeason && isBatch) {
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    isRelevant = true;
                }
            } else if (targetSeason !== undefined) {
                if (season === targetSeason && isBatch) {
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}`;
                    isRelevant = true;
                }
            } else {
                if (isBatch) {
                    isRelevant = true;
                }
            }

            if (isRelevant) {
                await new Promise(resolve => setTimeout(resolve, 2000)); 
                const directUrl = await processMagnetForStreaming(magnetLink, targetFilePattern);
                console.log(`Direct URL after processing: ${directUrl}`);
                if (directUrl) {
                    let streamNamePrefix = 'RD: Nyaa';
                    let streamTitleSuffix = displayTitle;

                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    } else if (targetSeason !== undefined && isBatch) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')} Batch`;
                    } else if (isBatch) {
                        streamNamePrefix += ` Batch`;
                    }
                    console.log(`Stream Name Prefix: ${streamNamePrefix}, Stream Title Suffix: ${streamTitleSuffix}`);
                    streams.push({
                        name: streamNamePrefix,
                        title: streamTitleSuffix,
                        url: directUrl,
                        magnet: magnetLink 
                    });
                } else {
                    let streamNamePrefix = 'RD: Nyaa';
                    let streamTitleSuffix = displayTitle;

                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    } else if (targetSeason !== undefined && isBatch) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')} Batch`;
                    } else if (isBatch) {
                        streamNamePrefix += ` Batch`;
                    }
                    console.log(`Stream Name Prefix: ${streamNamePrefix}, Stream Title Suffix: ${streamTitleSuffix}`);
                    streams.push({
                        name: streamNamePrefix,
                        title: streamTitleSuffix,
                        url: '',
                        magnet: magnetLink 
                    });
                }
            }
        }
    } catch (error: any) {
        console.error(`Error searching anime torrents for "${animeTitle}":`, error.message);
        return []; 
    }
    return streams;
}

/**
 * @param title 
 * @returns 
 */
function parseSeasonEpisode(title: string): { season?: number; episode?: number; isBatch: boolean } {
    let season: number | undefined = 1;
    let episode: number | undefined;
    let isBatch = false;

    const lowerTitle = title.toLowerCase();

    const episodeRegex = /(?:s(\d+))?\s*(?:e(\d+)|\[(\d+)\]|ep\.?\s*(\d+)|-\s*(\d+)\s*-|\((\d+)\)|episode\.?\s*(\d+)|episódio\.?\s*(\d+)|episodio\.?\s*(\d+))/i;
    let episodeMatch = lowerTitle.match(episodeRegex);

    if (episodeMatch) {
        season = parseInt(episodeMatch[1]) || 1;
        episode = parseInt(episodeMatch[2] || episodeMatch[3] || episodeMatch[4] || episodeMatch[5] || episodeMatch[6] || episodeMatch[7] || episodeMatch[8] || episodeMatch[9]);
        if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    } else {
        const seasonBatchRegex = /(?:season\s*(\d+)|s(\d+))\s*(?:batch|completa|completo|full\s*season)?/i;
        let seasonBatchMatch = lowerTitle.match(seasonBatchRegex);
        if (seasonBatchMatch) {
            season = parseInt(seasonBatchMatch[1] || seasonBatchMatch[2]);
            isBatch = true;
        } else {
            isBatch = true;
        }
    }
    return { season, episode, isBatch };
}