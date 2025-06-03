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
                    external_source: 'imdb_id' // Adicionar external_source para especificar que é um imdb_id
                }
            });
            const findResults = response.data;
            let tmdbDetails;
            let mediaType;
            if (findResults.tv_results && findResults.tv_results.length > 0) {
                tmdbDetails = findResults.tv_results[0];
                mediaType = "series";
            }
            else if (findResults.movie_results && findResults.movie_results.length > 0) {
                const movieResult = findResults.movie_results[0];
                tmdbDetails = Object.assign(Object.assign({}, movieResult), { poster_path: movieResult.poster_path === null ? undefined : movieResult.poster_path, backdrop_path: movieResult.backdrop_path === null ? undefined : movieResult.backdrop_path });
                mediaType = "movie";
            }
            if (!tmdbDetails || !mediaType) {
                console.warn(`[TMDB] Nenhum resultado encontrado para IMDb ID ${imdbId}.`);
                return null;
            }
            return {
                id: tmdbDetails.id,
                title: tmdbDetails.title || tmdbDetails.name || '', // Usa 'title' para filmes, 'name' para séries
                imdbId: imdbId, // Já temos o imdbId que usamos para buscar
                poster: tmdbDetails.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}` : undefined,
                background: tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbDetails.backdrop_path}` : undefined,
                genres: tmdbDetails.genres ? tmdbDetails.genres.map(genre => genre.name) : undefined, // Mapeia para nomes de gêneros
                releaseYear: (mediaType === "series" && tmdbDetails.first_air_date) ? new Date(tmdbDetails.first_air_date).getFullYear() :
                    ((mediaType === "movie" && tmdbDetails.release_date) ? new Date(tmdbDetails.release_date).getFullYear() : undefined),
                description: tmdbDetails.overview || undefined,
                type: mediaType
            };
        }
        catch (error) {
            console.error(`[TMDB] Erro ao buscar informações para IMDb ID ${imdbId}:`, error.message);
            return null;
        }
    });
}
function getTmdbInfoByName(aniListMedia, name, type) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        name = name;
        let releaseYearAniList;
        if (aniListMedia.startDate && aniListMedia.startDate.year) {
            releaseYearAniList = aniListMedia.startDate.year.toString();
        }
        else {
            console.warn(`[TMDB API] 'startDate.year' não encontrado para ${name} no AniList. Não será possível validar o ano de lançamento.`);
        }
        try {
            // --- BUSCA POR FILMES ---
            if (type === "movie" || !type) {
                const movieResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/search/movie`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        query: name
                    }
                });
                if (movieResponse.data.results && movieResponse.data.results.length > 0) {
                    for (const movie of movieResponse.data.results) {
                        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : undefined;
                        if (releaseYear && releaseYear.toString() === releaseYearAniList) {
                            const movieDetailsResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/movie/${movie.id}`, {
                                params: {
                                    api_key: TMDB_API_KEY,
                                    append_to_response: 'external_ids' // SOLICITA OS IDs EXTERNOS
                                }
                            });
                            const movieDetails = movieDetailsResponse.data;
                            console.log(`[TMDB API] Filme encontrado: ${movieDetails.title || movie.title}, IMDb ID: ${(_a = movieDetails.external_ids) === null || _a === void 0 ? void 0 : _a.imdb_id}`);
                            return {
                                id: movie.id, // ID do TMDB
                                title: movieDetails.title || movie.title,
                                poster: movieDetails.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}` : undefined,
                                background: movieDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}` : undefined,
                                genres: movieDetails.genres ? movieDetails.genres.map(g => g.name) : undefined,
                                releaseYear: releaseYear,
                                description: movieDetails.overview || movie.overview || undefined,
                                type: "movie",
                                imdbId: (_b = movieDetails.external_ids) === null || _b === void 0 ? void 0 : _b.imdb_id // RETORNA O IMDb ID CORRETO
                            };
                        }
                    }
                }
            }
            // --- BUSCA POR SÉRIES DE TV ---
            if (type === "series" || !type) {
                console.log(`[TMDB API] Entrou no bloco séries de getTmdbByName`);
                const tvResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/search/tv`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        query: aniListMedia.title.english
                    }
                });
                console.log(tvResponse);
                if (tvResponse.data.results && tvResponse.data.results.length > 0) {
                    console.log(`[tmdb api] resultado da busca`);
                    for (const tvShow of tvResponse.data.results) {
                        const releaseYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined;
                        console.log(`[TMDB - API] Retorno de consulta pelo nome: ${name}, dados do objeto: ${tvShow}`);
                        const tvDetailsResponse = yield axios_1.default.get(`https://api.themoviedb.org/3/tv/${tvShow.id}`, {
                            params: {
                                api_key: TMDB_API_KEY,
                                append_to_response: 'external_ids' // SOLICITA OS IDs EXTERNOS
                            }
                        });
                        const tvDetails = tvDetailsResponse.data;
                        console.log(`[TMDB API] Série encontrada: ${tvDetails.name || tvShow.name}, IMDb ID: ${(_c = tvDetails.external_ids) === null || _c === void 0 ? void 0 : _c.imdb_id}`);
                        return {
                            id: tvShow.id, // ID do TMDB
                            imdbId: (_d = tvDetails.external_ids) === null || _d === void 0 ? void 0 : _d.imdb_id, // RETORNA O IMDb ID CORRETO
                            title: tvDetails.name || tvShow.name || '',
                            poster: tvDetails.poster_path ? `https://image.tmdb.org/t/p/w500${tvDetails.poster_path}` : undefined,
                            background: tvDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${tvDetails.backdrop_path}` : undefined,
                            genres: tvDetails.genres ? tvDetails.genres.map(g => g.name) : undefined,
                            releaseYear: releaseYear,
                            description: tvDetails.overview || tvShow.overview || undefined,
                            type: "series"
                        };
                    }
                }
            }
        }
        catch (error) {
            console.error(`[TMDB API] Erro ao buscar info no TMDB para "${name}":`, error.message);
        }
        return null; // Retorna null se nenhuma correspondência validada for encontrada
    });
}
