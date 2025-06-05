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
exports.darkmahouTorrentHeadler = darkmahouTorrentHeadler;
const url_1 = require("./constants/url");
const darkmahouScraper_1 = require("./services/darkmahouScraper");
const BASE_URL = url_1.TORRENT_ANIME_URL;
function darkmahouTorrentHeadler(animeTitle, season, episode) {
    return __awaiter(this, void 0, void 0, function* () {
        const streams = yield (0, darkmahouScraper_1.searchAnimeTorrentsDarkmahou)(animeTitle, season, episode);
        if (streams.length === 0) {
            return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
        }
        return Promise.resolve({ streams });
    });
}
