"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NyaaTorrentHeadler = void 0;
const nyaaScraper_1 = require("./services/nyaaScraper");
async function NyaaTorrentHeadler(animeTitle, season, episode) {
    const streams = await (0, nyaaScraper_1.searchAnimeTorrentsNyaa)(animeTitle, season, episode);
    if (streams.length === 0) {
        return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
    }
    return Promise.resolve({ streams });
}
exports.NyaaTorrentHeadler = NyaaTorrentHeadler;
