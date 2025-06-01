"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMagnetLinks = scrapeMagnetLinks;
const darkmahouScraper_1 = require("../providers/darkmahou/services/darkmahouScraper");
const nyaaScraper_1 = require("../providers/nyaa/services/nyaaScraper");
function scrapeMagnetLinks(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, season, episode } = options;
        const streams = [];
        if (name) {
            try {
                const torrents = yield (0, nyaaScraper_1.searchAnimeTorrentsNyaa)(name, season, episode);
                streams.push(...torrents);
                console.log(`Scraped Nyaa para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
                if (streams.length === 0) {
                    const torrents = yield (0, darkmahouScraper_1.searchAnimeTorrentsDarkmahou)(name, season, episode);
                    streams.push(...torrents);
                    console.log(`Scraped Darkmahou para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
                }
            }
            catch (torrentError) {
            }
        }
        return streams;
    });
}
