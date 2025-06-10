"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAnimeTorrentsNyaa = void 0;
const url_1 = require("../constants/url");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const realDebridApi_1 = require("../../../utils/realDebridApi");
const NYAA_BASE_URL = url_1.TORRENT_ANIME_URL;
/**
 * Searches Nyaa.si for anime torrents and processes relevant magnet links for streaming.
 * @param animeTitle The title of the anime to search for.
 * @param targetSeason Optional. The specific season to target.
 * @param targetEpisode Optional. The specific episode to target.
 * @returns A promise that resolves to an array of ScrapedTorrentStream objects.
 */
async function searchAnimeTorrentsNyaa(animeTitle, targetSeason, targetEpisode) {
    const streams = [];
    const encodedTitle = encodeURIComponent(`${animeTitle} pt-br`);
    const searchUrl = `${NYAA_BASE_URL}/?f=0&c=0_0&q=${encodedTitle}`;
    try {
        const { data } = await axios_1.default.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 20000 // Added timeout for the initial search request
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
            let targetFilePattern;
            if (targetSeason !== undefined && targetEpisode !== undefined) {
                if (season === targetSeason && episode === targetEpisode && !isBatch) {
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    isRelevant = true;
                }
                else if (season === targetSeason && isBatch) {
                    // If a specific episode is targeted within a batch, we still set a pattern
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    isRelevant = true;
                }
            }
            else if (targetSeason !== undefined) {
                if (season === targetSeason && isBatch) {
                    targetFilePattern = `S${String(targetSeason).padStart(2, '0')}`;
                    isRelevant = true;
                }
            }
            else {
                // If no season/episode is targeted, consider all batches relevant
                if (isBatch) {
                    isRelevant = true;
                }
            }
            if (isRelevant) {
                // Introduce a small delay to avoid overwhelming Real-Debrid API or the source
                await new Promise(resolve => setTimeout(resolve, 2000));
                const directUrl = await (0, realDebridApi_1.processMagnetForStreaming)(magnetLink, targetFilePattern);
                console.log(`Direct URL after processing: ${directUrl}`);
                if (directUrl) {
                    let streamNamePrefix = 'RD: Nyaa';
                    let streamTitleSuffix = displayTitle;
                    // Refined stream naming based on relevance
                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    }
                    else if (targetSeason !== undefined && isBatch) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')} Batch`;
                    }
                    else if (isBatch) {
                        streamNamePrefix += ` Batch`;
                    }
                    console.log(`Stream Name Prefix: ${streamNamePrefix}, Stream Title Suffix: ${streamTitleSuffix}`);
                    streams.push({
                        name: streamNamePrefix,
                        title: streamTitleSuffix,
                        url: directUrl,
                        magnet: magnetLink // Store original magnet for reference if needed
                    });
                }
                else {
                    let streamNamePrefix = 'RD: Nyaa';
                    let streamTitleSuffix = displayTitle;
                    // Refined stream naming based on relevance
                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                    }
                    else if (targetSeason !== undefined && isBatch) {
                        streamNamePrefix += ` S${String(targetSeason).padStart(2, '0')} Batch`;
                    }
                    else if (isBatch) {
                        streamNamePrefix += ` Batch`;
                    }
                    console.log(`Stream Name Prefix: ${streamNamePrefix}, Stream Title Suffix: ${streamTitleSuffix}`);
                    streams.push({
                        name: streamNamePrefix,
                        title: streamTitleSuffix,
                        url: '',
                        magnet: magnetLink // Store original magnet for reference if needed
                    });
                }
            }
        }
    }
    catch (error) {
        console.error(`Error searching anime torrents for "${animeTitle}":`, error.message);
        // Depending on desired behavior, you might want to re-throw or return empty array
        return [];
    }
    return streams;
}
exports.searchAnimeTorrentsNyaa = searchAnimeTorrentsNyaa;
/**
 * Parses a given title string to extract season, episode, and batch information.
 * @param title The title string to parse.
 * @returns An object containing season, episode, and a boolean indicating if it's a batch.
 */
function parseSeasonEpisode(title) {
    let season = 1;
    let episode;
    let isBatch = false;
    const lowerTitle = title.toLowerCase();
    // Regex to capture various episode and season formats
    const episodeRegex = /(?:s(\d+))?\s*(?:e(\d+)|\[(\d+)\]|ep\.?\s*(\d+)|-\s*(\d+)\s*-|\((\d+)\)|episode\.?\s*(\d+)|episódio\.?\s*(\d+)|episodio\.?\s*(\d+))/i;
    let episodeMatch = lowerTitle.match(episodeRegex);
    if (episodeMatch) {
        season = parseInt(episodeMatch[1]) || 1;
        // Prioritize 'e' format, then brackets, then 'ep.', etc.
        episode = parseInt(episodeMatch[2] || episodeMatch[3] || episodeMatch[4] || episodeMatch[5] || episodeMatch[6] || episodeMatch[7] || episodeMatch[8] || episodeMatch[9]);
        if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    }
    else {
        // Handle season-only or batch-only titles
        const seasonBatchRegex = /(?:season\s*(\d+)|s(\d+))\s*(?:batch|completa|completo|full\s*season)?/i;
        let seasonBatchMatch = lowerTitle.match(seasonBatchRegex);
        if (seasonBatchMatch) {
            season = parseInt(seasonBatchMatch[1] || seasonBatchMatch[2]);
            isBatch = true;
        }
        else {
            isBatch = true;
        }
    }
    return { season, episode, isBatch };
}
