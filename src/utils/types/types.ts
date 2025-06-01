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
    url?: string; // A URL do stream (HTTP ou Magnet)
    name: string; // Nome para exibição no Stremio (ex: "Dublado 1080p", "Torrent [720p]")
    title?: string; // Título opcional (pode ser o nome do fansub ou da release)
    quality?: string; // Qualidade do vídeo (ex: "1080p", "720p", "480p")
    magnet?: string;
    animeFire?: string;
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

interface animeFireScrapedStream extends ScrapedStream {
    seeders?: number;
    leechers?: number;
    size?: string;
    uploadDate?: string;
    behaviorHints?: Record<string, any>;
}

/* Removed duplicate TmdbFindResponse interface to resolve type conflicts. */

export type EpisodeInfo = {
    season: number;
    episode: number;
} | null;

export type ScrapedEpisodeTorrent = {
  season?: number;
  episode?: number;
  title: string;
  magnet: string;
  source?: string;
  url?: string; // URL da página do torrent, se disponível
  animeFireStream?: string;
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
    magnet?: string;
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


export enum DataTypes {
    List = 'list',
    Details = 'details'
}

export enum FileEntityType {
    File = 'file',
    Folder = 'folder'
}

export type FolderEntity = {
    type: FileEntityType.Folder
    /**
     * The name of the folder.
     */
    name: string

    /**
     * The list of files contained within the folder.
     */
    files: (FileEntity | FolderEntity)[]
}

export type FileEntity = {
    type: FileEntityType.File
    /**
     * The name of the file.
     */
    fileName: string

    /**
     * The size of the file as a human-readable string (e.g., "1 MiB").
     */
    readableSize: string

    /**
     * The size of the file in bytes.
     */
    sizeInBytes: number
}

export type DetailsOptions = {
    /**
     * @default 'markdown'
     * @type {?(boolean | 'markdown' | 'html' | 'text')}
     */
    description?: boolean | 'markdown' | 'html' | 'text'
    submitter?: boolean | undefined
    information?: boolean
    files?: boolean
    comments?: boolean
}

export type Submitter = {
    name: string
    url: string
}

export type Comment = {
    userName: string
    avatarURL: string
    timestamp: number
    publishDate: string
    message: string
    isUploader: boolean
}

export type DetailsEntity = {
    type: DataTypes.Details
    description: string
    submitter: Submitter
    information: string
    files: (FileEntity | FolderEntity)[]
    comments: Comment[]
}

type OptionalField<T, K extends keyof T> = { [P in K]?: T[P] }
type ConditionalField<T, K extends keyof T, Condition> = Condition extends true | string ? Pick<T, K> : OptionalField<T, K>

export type MapDetailsOptions<AdditionalDetails extends (DetailsOptions | boolean)> = {
    type: DataTypes.Details
} & (AdditionalDetails extends true
    ? DetailsEntity
    : AdditionalDetails extends DetailsOptions
    ? ConditionalField<DetailsEntity, 'description', AdditionalDetails['description']>
      & ConditionalField<DetailsEntity, 'submitter', AdditionalDetails['submitter']>
      & ConditionalField<DetailsEntity, 'information', AdditionalDetails['information']>
      & ConditionalField<DetailsEntity, 'files', AdditionalDetails['files']>
      & ConditionalField<DetailsEntity, 'comments', AdditionalDetails['comments']>
      & ConditionalField<DetailsEntity, 'description', AdditionalDetails['description']>
    : undefined)

export type TorrentData = {
    id: number
    hash: string
    name: string
    timestamp: number
    size: string
    category: string
    links: {
        page: string
        magnet: string
        torrent: string
    }
    stats: {
        seeders: number
        leechers: number
        downloaded: number
    }
}

export type TorrentDataWithDetails<AdditionalDetails extends (DetailsOptions | boolean)> = {
    details: MapDetailsOptions<AdditionalDetails>
} & TorrentData

export type ListData<AdditionalDetails extends (DetailsOptions | boolean)> = {
    type: DataTypes.List
    metadata: {
        hasPreviousPage: boolean
        previousPage?: number
        previousPageLink?: string
        hasNextPage: boolean
        nextPage?: number
        nextPageLink?: string
        current: number
        total: number
        timestamp: number
        timeTaken: number
    },
    count: number
    torrents: (AdditionalDetails extends (DetailsOptions | boolean) ? TorrentDataWithDetails<AdditionalDetails> : TorrentData)[]
}

export type AdditionalDetails = DetailsOptions | boolean;

export interface TmdbMovieResult {
    adult: boolean;
    backdrop_path: string | null;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string | null;
    release_date: string; // YYYY-MM-DD format
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
}

// Interface for the full TMDB movie search response
export interface TmdbSearchMovieResponse {
    page: number;
    results: TmdbMovieResult[];
    total_pages: number;
    total_results: number;
}

// Base interface for a TV show result in TMDB search
export interface TmdbTvResult {
    backdrop_path: string | null;
    first_air_date: string; // YYYY-MM-DD format
    genre_ids: number[];
    id: number;
    name: string;
    origin_country: string[];
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
}

// Interface for the full TMDB TV show search response
export interface TmdbSearchTvResponse {
    page: number;
    results: TmdbTvResult[];
    total_pages: number;
    total_results: number;
}

// TmdbFindResponse (already in your code but here for completeness of TMDB types)
export interface TmdbFindResponse {
    movie_results?: TmdbMovieResult[];
    tv_results?: TmdbTvResult[];
    person_results: any[]; // You might want to define this more specifically if needed
    tv_episode_results: any[];
    tv_season_results: any[];
}// TmdbFindResponse for TMDB types
export interface TmdbFindResponse {
    movie_results?: TmdbMovieResult[];
    tv_results?: TmdbTvResult[];
    person_results: any[]; // You might want to define this more specifically if needed
    tv_episode_results: any[];
    tv_season_results: any[];
}

export type TmdbResponseApi = {
    id: number,
    title: string,
    poster?: string,
    background?: string,
    genres?: string[],
    releaseYear?: number,
    description?: string,
    type: "movie" | "series"
} | null;