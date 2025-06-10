import axios from 'axios';
import { AniListMedia, TmdbFindResponse, TmdbInfoResult, TmdbMovieTvDetails, TmdbSearchMovieResponse, TmdbSearchTvResponse } from './types/types';
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY; 
console.log(TMDB_API_KEY)

export async function getTmdbInfoByImdbId(
    imdbId: string
): Promise<TmdbInfoResult | null> {
    try {
        const response = await axios.get<TmdbFindResponse>(`https://api.themoviedb.org/3/find/${imdbId}`, {
            params: {
                api_key: TMDB_API_KEY,
                external_source: 'imdb_id' // Adicionar external_source para especificar que é um imdb_id
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
        // --- BUSCA POR FILMES ---
        if (type === "movie" || !type) {
            const movieResponse = await axios.get<TmdbSearchMovieResponse>(`https://api.themoviedb.org/3/search/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: name
                }
            });

            if (movieResponse.data.results && movieResponse.data.results.length > 0) {
                for (const movie of movieResponse.data.results) {
                    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : undefined;

                    if (releaseYear && releaseYear.toString() === releaseYearAniList) {
                        const movieDetailsResponse = await axios.get<TmdbMovieTvDetails>(`https://api.themoviedb.org/3/movie/${movie.id}`, {
                            params: {
                                api_key: TMDB_API_KEY,
                                append_to_response: 'external_ids' // SOLICITA OS IDs EXTERNOS
                            }
                        });
                        const movieDetails = movieDetailsResponse.data;

                        console.log(`[TMDB API] Filme encontrado: ${movieDetails.title || movie.title}, IMDb ID: ${movieDetails.external_ids?.imdb_id}`);

                        return {
                            id: movie.id, // ID do TMDB
                            title: movieDetails.title || movie.title,
                            poster: movieDetails.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}` : undefined,
                            background: movieDetails.backdrop_path ? `https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}` : undefined,
                            genres: movieDetails.genres ? movieDetails.genres.map(g => g.name) : undefined,
                            releaseYear: releaseYear,
                            description: movieDetails.overview || movie.overview || undefined,
                            type: "movie",
                            imdbId: movieDetails.external_ids?.imdb_id // RETORNA O IMDb ID CORRETO
                        };
                    }
                }
            }
        }

        // --- BUSCA POR SÉRIES DE TV ---
        if (type === "series" || !type) {
            console.log(`[TMDB API] Entrou no bloco séries de getTmdbByName`)
            const tvResponse = await axios.get<TmdbSearchTvResponse>(`https://api.themoviedb.org/3/search/tv`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: aniListMedia.title.english
                }
            });

            console.log(tvResponse)

            if (tvResponse.data.results && tvResponse.data.results.length > 0) {
                console.log(`[tmdb api] resultado da busca`)
                for (const tvShow of tvResponse.data.results) {
                    const releaseYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined;
                    console.log(`[TMDB - API] Retorno de consulta pelo nome: ${name}, dados do objeto: ${tvShow}`)
                    const tvDetailsResponse = await axios.get<TmdbMovieTvDetails>(`https://api.themoviedb.org/3/tv/${tvShow.id}`, {
                        params: {
                            api_key: TMDB_API_KEY,
                            append_to_response: 'external_ids' // SOLICITA OS IDs EXTERNOS
                        }
                    });
                    const tvDetails = tvDetailsResponse.data;

                    console.log(`[TMDB API] Série encontrada: ${tvDetails.name || tvShow.name}, IMDb ID: ${tvDetails.external_ids?.imdb_id}`);

                    return {
                        id: tvShow.id, // ID do TMDB
                        imdbId: tvDetails.external_ids?.imdb_id, // RETORNA O IMDb ID CORRETO
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
    return null; // Retorna null se nenhuma correspondência validada for encontrada
}