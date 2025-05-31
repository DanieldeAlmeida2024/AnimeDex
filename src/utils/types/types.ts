export interface ScrapedAnime {
    title: string;
    poster: string;
    animefireUrl?: string; // URL no AnimeFire.plus (opcional, se não usar mais streams diretos)
    description?: string;
    genres?: string[];
    releaseYear?: number;
    background?: string;
    type: 'movie' | 'series';
    episodesData?: string; // Armazena JSON string de ScrapedEpisode[]
    stremioId?: string; // IMDb ID ou outro ID Stremio que você mapeou
}

export interface ScrapedAnimeAnimeFire {
    title: string;
    poster?: string;
    background?: string;
    animefireUrl: string;
    type: 'movie' | 'series';
    description?: string;
    genres?: string[];
    releaseYear?: number;
    episodes?: ScrapedEpisodeAnimeFire[];
}

export interface ScrapedEpisodeAnimeFire {
    id: string;
    title: string;
    released?: Date;
    season: number;
    episode: number;
    episodeUrl: string;
}

export interface ScrapedEpisode {
    released: any;
    id: string; // ID único para o episódio
    title: string;
    episode: number;
    season: number;
    episodeUrl: string; // URL da página do episódio no AnimeFire.plus
}

export interface ScrapedStream {
    url: string; // A URL do stream (HTTP ou Magnet)
    name: string; // Nome para exibição no Stremio (ex: "Dublado 1080p", "Torrent [720p]")
    title?: string; // Título opcional (pode ser o nome do fansub ou da release)
    magnet: string; // Lista de links magnet (se aplicável)
    quality?: string; // Qualidade do vídeo (ex: "1080p", "720p", "480p")
    // Para streams diretos, pode adicionar:
    // ytId?: string;
    // externalUrl?: string;
    // Subtitles para o player do Stremio
    parsedInfo?: {
        season?: number;
        episode?: number;
        batch?: boolean; // Indica se é um batch (ex: "S01" ou "S01E01-E12")
        type?: 'movie' | 'series'; // Tipo do conteúdo (filme ou série)
        imdbId?: string; // ID do IMDb, se disponível
        name?: string; // Nome do anime/filme, se disponível
        stremioId?: string; // ID do Stremio, se mapeado
    }
    subtitles?: {
        id: string;
        lang: string;
        url: string;
    }[];
}

export interface TmdbFindResponse {
    movie_results: {
        title: string;
        name?: string; // Para séries
        release_date?: string;
        first_air_date?: string; // Para séries
        poster_path?: string;
        backdrop_path?: string;
        overview?: string;
        genre_ids?: number[];
    }[];
    tv_results: {
        parts: {
            title?: string;
            id: number;
            original_language: string;
            original_title?: string; 
            poster_path?: string;
            release_date?: string;
            
        };
        name: string;
        title?: string; // Para filmes
        first_air_date?: string;
        release_date?: string;
        poster_path?: string;
        backdrop_path?: string;
        overview?: string;
        genre_ids?: number[];
    }[];
}

export type ScrapedEpisodeTorrent = {
  season?: number;
  episode?: number;
  title: string;
  magnet: string;
  source?: string;
};

export type Meta = {
    id: string;
    type: string;
    name: string;
    poster?: string;
    description?: string;
    genres?: string[];
    releaseInfo?: string | number;
    background?: string;
    streams?: Stream[];
    videos?: {
        id: string;
        title: string;
        season: number;
        episode: number;
        released: Date | undefined;
    }[];

};

export type Stream = {
    name?: string;
    title?: string;
    url: string;
};

export interface ScrapedTorrentStream extends ScrapedStream {
    seeders?: number;
    leechers?: number;
    size?: string;
    uploadDate?: string;
}

export interface ScrapeOptions {
    imdbId: string;
    type?: 'movie' | 'series';
    name?: string; // Nome do anime/filme, pode ser usado para refinar a busca
    season?: number;
    episode?: number;
}

export interface ParsedTorrentInfo {
    magnet: string;
    displayTitle: string;
    size?: string; // Ex: "1.5 GB", "500 MB"
    uploadDate?: string; // Ex: "2024-05-30"
    parsedInfo: {
        season?: number;
        episode?: number;
        batch?: boolean;
    };
    sourceUrl: string; // URL da página onde o magnet foi encontrado
}
