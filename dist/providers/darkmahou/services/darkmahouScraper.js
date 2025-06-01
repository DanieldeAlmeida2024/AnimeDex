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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDarkMahouAnimePageUrl = getDarkMahouAnimePageUrl;
exports.searchAnimeTorrentsDarkmahou = searchAnimeTorrentsDarkmahou;
const url_1 = require("../constants/url");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const realDebridApi_1 = require("../../../utils/realDebridApi");
const DARKMAHOU_BASE_URL = url_1.TORRENT_ANIME_URL;
function getDarkMahouAnimePageUrl(animeTitle) {
    return __awaiter(this, void 0, void 0, function* () {
        let serieUrl = '';
        const encodedTitle = encodeURIComponent(animeTitle);
        const searchUrl = `${DARKMAHOU_BASE_URL}/?s=${encodedTitle}`;
        try {
            const { data } = yield axios_1.default.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const article = $('article.bs');
            const pageUrl = article.find('div > a').attr('href');
            console.log(`Anime Encontrado DarkMahou:`);
            serieUrl = pageUrl !== null && pageUrl !== void 0 ? pageUrl : '';
        }
        catch (error) {
            // Error handling remains, but logs are removed as requested.
        }
        return serieUrl;
    });
}
function searchAnimeTorrentsDarkmahou(animeTitle, targetSeason, targetEpisode) {
    return __awaiter(this, void 0, void 0, function* () {
        const streams = [];
        const animePageUrl = yield getDarkMahouAnimePageUrl(animeTitle);
        if (!animePageUrl) {
            return [];
        }
        try {
            const { data } = yield axios_1.default.get(animePageUrl, {
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
                        yield new Promise(resolve => setTimeout(resolve, delayBetweenTorrents));
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
                    let targetFilePattern;
                    if (targetSeason !== undefined && targetEpisode !== undefined) {
                        if (season === targetSeason && episode === targetEpisode && !isBatch) {
                            targetFilePattern = `S${String(targetSeason).padStart(2, '0')}E${String(targetEpisode).padStart(2, '0')}`;
                            isRelevant = true;
                        }
                        else if (season === targetSeason && isBatch) {
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
                        if (isBatch) {
                            isRelevant = true;
                        }
                    }
                    if (isRelevant) {
                        const directUrl = yield (0, realDebridApi_1.processMagnetForStreaming)(magnetLink, targetFilePattern);
                        if (directUrl) {
                            let streamTitle = `RD: DarkMahou `;
                            let streamName = `DarkMahou - ${displayTitle}`;
                            if (season && episode) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            else if (season && isBatch) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            else if (isBatch) {
                                streamName = `RD: DarkMahou `;
                                streamTitle = `DarkMahou - ${displayTitle}`;
                            }
                            streams.push({
                                name: streamName,
                                title: streamTitle,
                                url: directUrl,
                                magnet: directUrl,
                            });
                        }
                        else {
                            // Original magnet link is not added as fallback, adhering to clean refactor and RD focus.
                        }
                    }
                }
            }
        }
        catch (error) {
            // Error handling remains, but logs are removed as requested.
        }
        return streams;
    });
}
function parseSeasonEpisode(title) {
    let season = 1;
    let episode;
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
    }
    else {
        const seasonBatchRegex = /(?:season\s*(\d+)|s(\d+))\s*(?:batch|completa|completo|Completa|Completo|full\s*season)?/i;
        let seasonBatchMatch = lowerTitle.match(seasonBatchRegex);
        if (seasonBatchMatch) {
            season = parseInt(seasonBatchMatch[1] || seasonBatchMatch[2]);
            isBatch = true;
        }
        else if (lowerTitle.includes('batch') || lowerTitle.includes('completa') || lowerTitle.includes('full season')) {
            isBatch = true;
        }
    }
    return { season, episode, isBatch };
}
