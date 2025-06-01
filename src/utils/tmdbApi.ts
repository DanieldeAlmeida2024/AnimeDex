import axios from 'axios';
import { TmdbFindResponse, TmdbSearchMovieResponse, TmdbSearchTvResponse } from './types/types';

const TMDB_API_KEY = process.env.TMDB_API_KEY || ''; 

export async function getTmdbInfoByImdbId(imdbId: string): Promise<{ title: string; poster?: string; background?: string; genres?: string[]; releaseYear?: number; description?: string; type?: "movie" | "series" } | null> {
    try {
        const response = await axios.get<TmdbFindResponse>(`https://api.themoviedb.org/3/find/${imdbId}`, {
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

    } catch (error: any) {
        console.error(`[TMDB] Erro ao buscar informações para IMDb ID ${imdbId}:`, error.message);
        return null;
    }
}

export async function getTmdbInfoByName(name: string, type?: "movie" | "series"): Promise<{id: number, title: string; poster?: string; background?: string; genres?: string[]; releaseYear?: number; description?: string; type: "movie" | "series" } | null> {
    try {
        if (type === "movie" || !type) {
            const movieResponse = await axios.get<TmdbSearchMovieResponse>(`https://api.themoviedb.org/3/search/movie`, {
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
            const tvResponse = await axios.get<TmdbSearchTvResponse>(`https://api.themoviedb.org/3/search/tv`, {
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

    } catch (error: any) {
        return null;
    }
}