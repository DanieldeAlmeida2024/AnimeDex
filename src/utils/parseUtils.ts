import {EpisodeInfo} from './types/types';

export function parseEpisodeInfo(filename: string, targetSeasonFromHint: number | null): EpisodeInfo | null {
    filename = filename.replace(/_/g, ' ').trim();

    const patterns = [
        /S(\d{1,2})E(\d{1,2})/i,                 
        /(\d{1,2})x(\d{1,2})/i,                  
        /Season[\s._-]*(\d{1,2})[\s._-]*Episode[\s._-]*(\d{1,2})/i 
    ];

    for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
            return {
                season: parseInt(match[1]),
                episode: parseInt(match[2]),
            };
        }
    }

    const vMatch = filename.match(/(?:V|S|Season)[\s:.]*([0-9IVXLCDM]+)\b/i);
    let season: number | null = null;

    if (vMatch) {
        const rawSeason = vMatch[1];
        if (/^\d+$/.test(rawSeason)) {
            season = parseInt(rawSeason);
        } else {
            season = romanToDecimal(rawSeason.toUpperCase());
        }
    }

    const epMatch = filename.match(/[-:]\s*(\d{1,2})\b/) 
                  || filename.match(/\bEpisode\s*(\d{1,2})\b/i) 
                  || filename.match(/\bEp\s*(\d{1,2})\b/i);

    if (season !== null && epMatch) {
        return {
            season,
            episode: parseInt(epMatch[1]),
        };
    }

    if (!season) {
        const simpleMatch = filename.match(/[-\s._](\d{1,2})\b/);
        if (simpleMatch) {
            return {
                season: 1,
                episode: parseInt(simpleMatch[1]),
            };
        }
    }

    return null;
}

function romanToDecimal(roman: string): number {
    const map: { [key: string]: number } = {
        M: 1000,
        D: 500,
        C: 100,
        L: 50,
        X: 10,
        V: 5,
        I: 1,
    };
    let value = 0;
    let prev = 0;
    for (let i = roman.length - 1; i >= 0; i--) {
        const current = map[roman[i]];
        if (current < prev) {
            value -= current;
        } else {
            value += current;
        }
        prev = current;
    }
    return value;
}
