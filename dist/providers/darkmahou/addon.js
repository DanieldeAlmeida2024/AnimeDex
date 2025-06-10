"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkmahouTorrentHeadler = void 0;
const url_1 = require("./constants/url");
const darkmahouScraper_1 = require("./services/darkmahouScraper");
const BASE_URL = url_1.TORRENT_ANIME_URL;
async function darkmahouTorrentHeadler(animeTitle, season, episode) {
    const streams = await (0, darkmahouScraper_1.searchAnimeTorrentsDarkmahou)(animeTitle, season, episode);
    if (streams.length === 0) {
        return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
    }
    return Promise.resolve({ streams });
}
exports.darkmahouTorrentHeadler = darkmahouTorrentHeadler;
