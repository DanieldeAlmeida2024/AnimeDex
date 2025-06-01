"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEpisodeInfo = parseEpisodeInfo;
function parseEpisodeInfo(filename, targetSeasonFromHint) {
    filename = filename.replace(/_/g, ' ').trim();
    // 🔍 1. Procurar padrões formais (S05E01, 5x01, Season 5 Episode 1)
    const patterns = [
        /S(\d{1,2})E(\d{1,2})/i, // S05E01
        /(\d{1,2})x(\d{1,2})/i, // 5x01
        /Season[\s._-]*(\d{1,2})[\s._-]*Episode[\s._-]*(\d{1,2})/i // Season 5 Episode 1
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
    // 🔍 2. Procurar padrão de 'V' (temporada em romano/simples)
    const vMatch = filename.match(/(?:V|S|Season)[\s:.]*([0-9IVXLCDM]+)\b/i);
    let season = null;
    if (vMatch) {
        const rawSeason = vMatch[1];
        if (/^\d+$/.test(rawSeason)) {
            season = parseInt(rawSeason);
        }
        else {
            // Converter números romanos para decimal
            season = romanToDecimal(rawSeason.toUpperCase());
        }
    }
    // 🔍 3. Procurar número após hífen, dois pontos ou espaço
    const epMatch = filename.match(/[-:]\s*(\d{1,2})\b/)
        || filename.match(/\bEpisode\s*(\d{1,2})\b/i)
        || filename.match(/\bEp\s*(\d{1,2})\b/i);
    if (season !== null && epMatch) {
        return {
            season,
            episode: parseInt(epMatch[1]),
        };
    }
    // 🔍 4. Caso não tenha V/S, tentar match básico do final do nome
    if (!season) {
        const simpleMatch = filename.match(/[-\s._](\d{1,2})\b/);
        if (simpleMatch) {
            return {
                season: 1,
                episode: parseInt(simpleMatch[1]),
            };
        }
    }
    // 🚫 Não encontrou
    return null;
}
// 🔢 Função auxiliar: converter número romano para decimal
function romanToDecimal(roman) {
    const map = {
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
        }
        else {
            value += current;
        }
        prev = current;
    }
    return value;
}
