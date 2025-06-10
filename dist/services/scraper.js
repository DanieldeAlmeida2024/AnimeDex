"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMagnetLinks = void 0;
const darkmahouScraper_1 = require("../providers/darkmahou/services/darkmahouScraper");
const nyaaScraper_1 = require("../providers/nyaa/services/nyaaScraper");
async function scrapeMagnetLinks(options) {
    const { name, season, episode } = options;
    const streams = [];
    if (name) {
        try {
            const torrents = await (0, nyaaScraper_1.searchAnimeTorrentsNyaa)(name, season, episode);
            streams.push(...torrents);
            console.log(`Scraped Nyaa para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            if (streams.length === 0) {
                const torrents = await (0, darkmahouScraper_1.searchAnimeTorrentsDarkmahou)(name, season, episode);
                streams.push(...torrents);
                console.log(`Scraped Darkmahou para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            }
        }
        catch (torrentError) {
        }
    }
    return streams;
}
exports.scrapeMagnetLinks = scrapeMagnetLinks;
