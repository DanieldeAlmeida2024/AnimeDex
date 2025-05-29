export interface ScrapedAnime {
    title: string;
    poster?: string;
    background?: string;
    animefireUrl: string;
    type: 'movie' | 'series';
    description?: string;
    genres?: string[];
    releaseYear?: number;
    episodes?: ScrapedEpisode[];
}

export interface ScrapedEpisode {
    id: string;
    title: string;
    released?: Date;
    season: number;
    episode: number;
    episodeUrl: string;
}

export interface ScrapedStream {
    url: string;
    name?: string;
    quality?: string;
    title?: string;
}

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