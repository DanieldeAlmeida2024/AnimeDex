import axios from 'axios';
import { AniListMedia, TmdbFindResponse, TmdbInfoResult, TmdbMovieTvDetails, TmdbSearchMovieResponse, TmdbSearchTvResponse } from './types/types';
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY; 

export async function getTmdbInfoByImdbId(
    imdbId: string
): Promise<TmdbInfoResult | null> {
    try {
        const response = await axios.get<TmdbFindResponse>(`https://api.themoviedb.org/3/find/${imdbId}`, {
            params: {
                api_key: TMDB_API_KEY,
                external_source: 'imdb_id', 
                language: 'pt-BR' 
            }
        });

        const findResults = response.data;
        let tmdbDetails: TmdbMovieTvDetails | undefined;
        let mediaType: "movie" | "series" | undefined;

        if (findResults.tv_results && findResults.tv_results.length > 0) {
            tmdbDetails = findResults.tv_results[0];
            mediaType = "series";
        } else if (findResults.movie_results && findResults.movie_results.length > 0) {
            const movieResult = findResults.movie_results[0];
            tmdbDetails = {
                ...movieResult,
                poster_path: movieResult.poster_path === null ? undefined : movieResult.poster_path,
                backdrop_path: movieResult.backdrop_path === null ? undefined : movieResult.backdrop_path
            };
            mediaType = "movie";
        }

        if (!tmdbDetails || !mediaType) {
            console.warn(`[TMDB] Nenhum resultado encontrado para IMDb ID ${imdbId}.`);
            return null;
        }

        return {
            id: tmdbDetails.id,
            title: tmdbDetails.title || tmdbDetails.name || '', 
            imdbId: imdbId, 
            poster: tmdbDetails.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}` : undefined,
            background: tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbDetails.backdrop_path}` : undefined,
            genres: tmdbDetails.genres ? tmdbDetails.genres.map(genre => genre.name) : undefined, 
            releaseYear: (mediaType === "series" && tmdbDetails.first_air_date) ? new Date(tmdbDetails.first_air_date).getFullYear() :
                         ((mediaType === "movie" && tmdbDetails.release_date) ? new Date(tmdbDetails.release_date).getFullYear() : undefined),
            description: tmdbDetails.overview || undefined,
            type: mediaType
        };

    } catch (error: any) {
        console.error(`[TMDB] Erro ao buscar informações para IMDb ID ${imdbId}:`, error.message);
        return null;
    }
}

export async function getTmdbInfoByName(
    aniListMedia: AniListMedia,
    name: string,
    type?: "movie" | "series"
): Promise<TmdbInfoResult | null> {
    name = name;
    let releaseYearAniList: string | undefined;

    if (aniListMedia.startDate && aniListMedia.startDate.year) {
        releaseYearAniList = aniListMedia.startDate.year.toString();
    } else {
        console.warn(`[TMDB API] 'startDate.year' não encontrado para ${name} no AniList. Não será possível validar o ano de lançamento.`);
    }

    try {
        if (type === "movie" || !type) {
            const movieResponse = await axios.get<TmdbSearchMovieResponse>(`https://api.themoviedb.org/3/search/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: name,
                    language: 'pt-BR' 
                }
            });

            if (movieResponse.data.results && movieResponse.data.results.length > 0) {
                for (const movie of movieResponse.data.results) {
                    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : undefined;

                    if (releaseYear && releaseYear.toString() === releaseYearAniList) {
                        const movieDetailsResponse = await axios.get<TmdbMovieTvDetails>(`https://api.themoviedb.org/3/movie/${movie.id}`, {
                            params: {
                                api_key: TMDB_API_KEY,
                                append_to_response: 'external_ids', 
                                language: 'pt-BR' 
                            }
                        });
                        const movieDetails = movieDetailsResponse.data;
                        return {
                            id: movie.id, 
                            title: movieDetails.title || movie.title,
                            poster: movieDetails.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}` : undefined,
                            background: movieDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}` : undefined,
                            genres: movieDetails.genres ? movieDetails.genres.map(g => g.name) : undefined,
                            releaseYear: releaseYear,
                            description: movieDetails.overview || movie.overview || undefined,
                            type: "movie",

                            imdbId: movieDetails.external_ids?.imdb_id 
                        };
                    }
                }
            }
        }

        if (type === "series" || !type) {
            const tvResponse = await axios.get<TmdbSearchTvResponse>(`https://api.themoviedb.org/3/search/tv`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: aniListMedia.title.english,
                    language: 'pt-BR' 
                }
            });

            if (tvResponse.data.results && tvResponse.data.results.length > 0) {
                for (const tvShow of tvResponse.data.results) {
                    const releaseYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined;
                    const tvDetailsResponse = await axios.get<TmdbMovieTvDetails>(`https://api.themoviedb.org/3/tv/${tvShow.id}`, {
                        params: {
                            api_key: TMDB_API_KEY,
                            append_to_response: 'external_ids', 
                            language: 'pt-BR' 
                        }
                    });
                    const tvDetails = tvDetailsResponse.data;
                    return {
                        id: tvShow.id, 
                        imdbId: tvDetails.external_ids?.imdb_id, 
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
    } catch (error: any) {
        console.error(`[TMDB API] Erro ao buscar info no TMDB para "${name}":`, error.message);
    }
    return null;
}