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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTmdbInfoByImdbId = getTmdbInfoByImdbId;
exports.getTmdbInfoByName = getTmdbInfoByName;
const axios_1 = __importDefault(require("axios"));
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
function getTmdbInfoByImdbId(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`https://api.themoviedb.org/3/find/${imdbId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    external_source: 'imdb_id'
                }
            });
            if (response.data.tv_results && response.data.tv_results.length > 0) {
                const tvShow = response.data.tv_results[0];
                console.log(tvShow);
                return {
                    title: tvShow.name || '',
                    poster: tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : undefined,
                    background: tvShow.backdrop_path ? `https://image.tmdb.org/t/p/original${tvShow.backdrop_path}` : undefined,
                    genres: tvShow.genre_ids ? tvShow.genre_ids.map(id => id.toString()) : undefined, // TMDB retorna IDs, você pode mapear para nomes depois se quiser
                    releaseYear: tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined,
                    description: tvShow.overview || undefined,
                    type: "series"
                };
            }
            if (response.data.movie_results && response.data.movie_results.length > 0) {
                const movie = response.data.movie_results[0];
                return {
                    title: movie.title,
                    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
                    background: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
                    genres: movie.genre_ids ? movie.genre_ids.map(id => id.toString()) : undefined,
                    releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                    description: movie.overview || undefined,
                    type: "movie"
                };
            }
            console.warn(`[TMDB] Nenhuma informação encontrada para IMDb ID: ${imdbId}`);
            return null;
        }
        catch (error) {
            console.error(`[TMDB] Erro ao buscar informações para IMDb ID ${imdbId}:`, error.message);
            return null;
        }
    });
}
function getTmdbInfoByName(name, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (type === "movie" || !type) {
                const movieResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/search/movie`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        query: name
                    }
                });
                if (movieResponse.data.results && movieResponse.data.results.length > 0) {
                    const movie = movieResponse.data.results[0];
                    return {
                        id: movie.id,
                        title: movie.title,
                        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
                        background: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
                        genres: movie.genre_ids ? movie.genre_ids.map(id => id.toString()) : undefined,
                        releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                        description: movie.overview || undefined,
                        type: "movie"
                    };
                }
            }
            if (type === "series" || !type) {
                const tvResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/search/tv`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        query: name
                    }
                });
                if (tvResponse.data.results && tvResponse.data.results.length > 0) {
                    const tvShow = tvResponse.data.results[0];
                    return {
                        id: tvShow.id,
                        title: tvShow.name || '',
                        poster: tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : undefined,
                        background: tvShow.backdrop_path ? `https://image.tmdb.org/t/p/original${tvShow.backdrop_path}` : undefined,
                        genres: tvShow.genre_ids ? tvShow.genre_ids.map(id => id.toString()) : undefined,
                        releaseYear: tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined,
                        description: tvShow.overview || undefined,
                        type: "series"
                    };
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    });
}
