"use strict";
// src/utils/realDebridApi.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileEpisodeInfo = parseFileEpisodeInfo;
// ... (todas as outras imports e a makeRdRequest, getTorrentInfo, addTorrent, selectFilesInTorrent) ...
// Certifique-se de que esta função está presente em realDebridApi.ts
function parseFileEpisodeInfo(fileName) {
    const lowerFileName = fileName.toLowerCase();
    let season;
    let episode;
    // Tenta encontrar o padrão SXXEXX (ex: S01E02)
    const sxeMatch = lowerFileName.match(/s(\d+)e(\d+)/);
    if (sxeMatch) {
        season = parseInt(sxeMatch[1], 10);
        episode = parseInt(sxeMatch[2], 10);
        return { season, episode };
    }
    // Tenta encontrar o padrão XX.YY (ex: 01.02)
    const dotEpisodeMatch = lowerFileName.match(/\b(\d{1,2})\.(\d{1,2})\b/);
    if (dotEpisodeMatch && parseInt(dotEpisodeMatch[1], 10) <= 2 && parseInt(dotEpisodeMatch[2], 10) > 0) { // Assume S1.E2 ou S01.E02
        season = parseInt(dotEpisodeMatch[1], 10);
        episode = parseInt(dotEpisodeMatch[2], 10);
        return { season, episode };
    }
    // Tenta encontrar o padrão EXX (ex: E02 ou Ep02)
    const epMatch = lowerFileName.match(/(?:e|ep)(\d+)/);
    if (epMatch) {
        episode = parseInt(epMatch[1], 10);
        return { episode };
    }
    // Tenta encontrar o padrão XX (apenas números, como "01", "02")
    // Deve ser mais cauteloso para não pegar anos, resoluções, etc.
    const numberMatch = lowerFileName.match(/\b(\d{1,3})\b/g); // Pega todos os números de 1 a 3 dígitos
    if (numberMatch) {
        const potentialEpisodes = numberMatch
            .map(n => parseInt(n, 10))
            .filter(n => n > 0 && n < 1000); // Filtra números que podem ser episódios (1 a 999)
        // Prioriza números que não parecem ser anos ou resoluções
        const filteredEpisodes = potentialEpisodes.filter(n => {
            const numStr = String(n);
            if (numStr.length === 4 && n >= 1900 && n <= 2100)
                return false; // Evita anos
            // Adicione mais filtros se necessário (ex: 1080, 720, etc. se estiverem em nomes de arquivo soltos)
            return true;
        });
        // Se há apenas um número plausível, pode ser o episódio
        if (filteredEpisodes.length === 1) {
            episode = filteredEpisodes[0];
            return { episode };
        }
        // Se houver mais de um, é mais complexo, mas para este cenário, vamos pegar o último
        if (filteredEpisodes.length > 1) {
            episode = filteredEpisodes[filteredEpisodes.length - 1];
            return { episode };
        }
    }
    return {};
}
// ... (sua função processMagnetForStreaming com a correção de escopo da selectedFileId) ...
// ... (todas as outras funções exportadas) ...
