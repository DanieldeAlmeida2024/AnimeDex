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
exports.animeFireHeadler = animeFireHeadler;
const url_1 = require("./constants/url");
const animeFireScraper_1 = require("./services/animeFireScraper");
const tmdbApi_1 = require("../../utils/tmdbApi");
const db_1 = require("../../persistence/db");
const BASE_URL = url_1.PROVIDER_URL;
function animeFireHeadler(_a) {
    return __awaiter(this, arguments, void 0, function* ({ type, id, extra }) {
        console.log(`[ADDON ANIMEFIRE]Type: ${type}, id: ${id}, extra: ${extra}`);
        const { search, skip } = extra;
        const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;
        let scrapedAnimes = [];
        if (search === null || search === void 0 ? void 0 : search.search) {
            scrapedAnimes = yield (0, animeFireScraper_1.searchAnimes)(search, type);
        }
        else {
            switch (id) {
                case 'animedex_series_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeTopAnimes)(type, page);
                    break;
                case 'animedex_movies_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeDubladosAnimes)(type, page);
                    break;
                case 'animedex_lancamentos_movies_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeRecentAnimes)(type, page);
                    break;
                case 'animedex_lancamentos_series_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeAtualizadosAnimes)(type, page);
                    break;
                case 'animedex_atualizado_series_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeAtualizadosAnimes)(type, page);
                    break;
                case 'animedex_atualizados_movies_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeAtualizadosAnimes)(type, page);
                    break;
                case 'animedex_dublados_series_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeDubladosAnimes)(type, page);
                    break;
                case 'animedex_legendados_series_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeLegendadosAnimes)(type, page);
                    break;
                case 'animedex_legendados_movies_catalog':
                    scrapedAnimes = yield (0, animeFireScraper_1.scrapeLegendadosAnimes)(type, page);
                    break;
                default:
                    console.warn(`Catálogo desconhecido solicitado: ${id}. Retornando vazio.`);
                    break;
            }
        }
        for (const scrapedAnime of scrapedAnimes) {
            //pesquisa imdb
            let animeName;
            let animeRecord;
            const tmdbInfo = yield (0, tmdbApi_1.getTmdbInfoByName)(scrapedAnime.title);
            try {
                animeRecord = yield (0, db_1.findFirstDataBase)(tmdbInfo);
                if (!animeRecord) {
                    if (tmdbInfo) {
                        animeRecord = yield (0, db_1.createAnimeOnDataBase)(tmdbInfo);
                    }
                }
                else if (animeRecord) {
                    if (animeRecord && animeRecord.id) {
                        yield (0, db_1.updateDateDataBase)(tmdbInfo);
                    }
                    animeName = animeRecord.title;
                }
                yield (0, db_1.saveAnimesToDatabase)(tmdbInfo, scrapedAnime);
            }
            catch (e) {
            }
            const metas = scrapedAnimes.map(anime => {
                var _a;
                return ({
                    id: `animefire_${anime.type}_${encodeURIComponent(anime.animefireUrl)}`,
                    type: anime.type,
                    name: anime.title,
                    poster: (_a = anime.poster) !== null && _a !== void 0 ? _a : undefined,
                    description: '',
                    genres: [],
                });
            });
            return { metas };
        }
        return { metas: [] };
    });
}
