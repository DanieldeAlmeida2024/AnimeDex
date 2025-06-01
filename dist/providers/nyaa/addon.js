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
exports.NyaaTorrentHeadler = NyaaTorrentHeadler;
const nyaaScraper_1 = require("./services/nyaaScraper");
function NyaaTorrentHeadler(animeTitle, season, episode) {
    return __awaiter(this, void 0, void 0, function* () {
        const streams = yield (0, nyaaScraper_1.searchAnimeTorrentsNyaa)(animeTitle, season, episode);
        if (streams.length === 0) {
            return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
        }
        return Promise.resolve({ streams });
    });
}
