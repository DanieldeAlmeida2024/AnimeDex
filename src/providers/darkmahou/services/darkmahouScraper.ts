import { TORRENT_ANIME_URL } from "../constants/url";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedStream } from '../../../utils/types/types';
import { processMagnetForStreaming } from '../../../utils/realDebridApi';

interface ScrapedTorrentStream extends ScrapedStream {
    seeders?: number;
    leechers?: number;
    size?: string;
    uploadDate?: string;
    behaviorHints?: Record<string, any>;
}

const DARKMAHOU_BASE_URL = TORRENT_ANIME_URL;

export async function getDarkMahouAnimePageUrl(
    animeTitle: string
): Promise<string> {
    let serieUrl: string = '';
    const encodedTitle = encodeURIComponent(animeTitle);
    const searchUrl = `${DARKMAHOU_BASE_URL}/?s=${encodedTitle}`;
    console.log(`Searching DarkMahou for: ${animeTitle} at ${searchUrl}`);
    try {
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        const article = $('article.bs');
        const pageUrl = article.find('div > a').attr('href');
        console.log(`Anime Encontrado DarkMahou:`);

        serieUrl = pageUrl || '';
    } catch (error: any) {
    }
    return serieUrl;
}

export async function searchAnimeTorrentsDarkmahou(animeTitle: string, targetSeason?: number, targetEpisode?: number): Promise<ScrapedTorrentStream[]> {
    const streams: ScrapedTorrentStream[] = [];
    
    const animePageUrl = await getDarkMahouAnimePageUrl(animeTitle);
    if (!animePageUrl) {
        return [];
    }

    try {
        const { data } = await axios.get(animePageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
            timeout: 20000 
        });
        const $ = cheerio.load(data);

        const divSeparators = $('div.soraddl'); 

        for (let i = 0; i < divSeparators.length; i++) {
            const divEl = divSeparators.get(i); 

            const torrentLinksInDiv = $(divEl).find('a[href*="magnet:"]');

            for (let j = 0; j < torrentLinksInDiv.length; j++) {
                const linkEl = torrentLinksInDiv.get(j); 

                if (j > 0 || i > 0) {
                    const delayBetweenTorrents = 2000;
                    await new Promise(resolve => setTimeout(resolve, delayBetweenTorrents));
                }

                const magnetLink = $(linkEl).attr('href');
                let displayTitle = '';

                const dnMatch = magnetLink ? magnetLink.match(/&dn=([^&]+)/) : null;
                if (dnMatch && dnMatch[1]) {
                    displayTitle = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
                }
                if (!displayTitle || displayTitle.length < 10) { 
                    displayTitle = $(linkEl).text().trim().split('\n')[0].trim();
                }
                if (!displayTitle || displayTitle.length < 10) {
                    displayTitle = $(linkEl).find('span').text().trim().split('\n')[0].trim();
                }
                if (!displayTitle || displayTitle.length < 10) {
                    displayTitle = $(linkEl).find('strong').text().trim().split('\n')[0].trim();
                }
                if (!displayTitle || displayTitle.length < 10) {
                    displayTitle = ($(linkEl).parent().text().trim().split('\n')[0].trim() || displayTitle);
                }
                displayTitle = displayTitle.split('\n')[0].trim();

                if (!magnetLink || !displayTitle) {
                    continue;
                }

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
                    const directUrl = await processMagnetForStreaming(magnetLink, targetFilePattern);
                    
                    if (directUrl) {
                        let streamTitle = `RD: DarkMahou `;
                        let streamName = `DarkMahou - ${displayTitle}`;

                        if (season && episode) {
                            streamName = `RD: DarkMahou `;
                            streamTitle = `DarkMahou - ${displayTitle}`;
                        } else if (season && isBatch) {
                            streamName = `RD: DarkMahou `;
                            streamTitle = `DarkMahou - ${displayTitle}`;
                        } else if (isBatch) { 
                            streamName = `RD: DarkMahou `;
                            streamTitle = `DarkMahou - ${displayTitle}`;
                        }

                        streams.push({
                            name: streamName,
                            title: streamTitle,
                            url: directUrl,
                            magnet: directUrl,
                            
                        });
                    } else {
                        // Original magnet link is not added as fallback, adhering to clean refactor and RD focus.
                    }
                }
            }
        }
    } catch (error: any) {
        // Error handling remains, but logs are removed as requested.
    }
    return streams;
}

function parseSeasonEpisode(title: string): { season?: number; episode?: number; isBatch: boolean } {
    let season: number |  undefined = 1;
    let episode: number | undefined;
    let isBatch = false;

    const lowerTitle = title.toLowerCase();

    const episodeRegex = /(?:s(\d+))?\s*(?:e(\d+)|\[(\d+)\]|ep\.?\s*(\d+)|-\s*(\d+)\s*-|\((\d+)\)|episode\.?\s*(\d+)|episódio\.?\s*(\d+)|episodio\.?\s*(\d+))/i;
    let episodeMatch = lowerTitle.match(episodeRegex);

    if (episodeMatch) {
        season = parseInt(episodeMatch[1]) || 1;
        episode = parseInt(episodeMatch[2] || episodeMatch[3] || episodeMatch[4] || episodeMatch[5] || episodeMatch[6]);
        if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    } else {
        const seasonBatchRegex = /(?:season\s*(\d+)|s(\d+))\s*(?:batch|completa|completo|Completa|Completo|full\s*season)?/i;
        let seasonBatchMatch = lowerTitle.match(seasonBatchRegex);
        if (seasonBatchMatch) {
            season = parseInt(seasonBatchMatch[1] || seasonBatchMatch[2]);
            isBatch = true;
        } else if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    }
    return { season, episode, isBatch };
}