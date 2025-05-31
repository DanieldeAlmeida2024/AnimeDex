export function parseFileEpisodeInfo(fileName: string): { season?: number, episode?: number } {
    const lowerFileName = fileName.toLowerCase();
    let season: number | undefined;
    let episode: number | undefined;

    const sxeMatch = lowerFileName.match(/s(\d+)e(\d+)/);
    if (sxeMatch) {
        season = parseInt(sxeMatch[1], 10);
        episode = parseInt(sxeMatch[2], 10);
        return { season, episode };
    }

    const dotEpisodeMatch = lowerFileName.match(/\b(\d{1,2})\.(\d{1,2})\b/);
    if (dotEpisodeMatch && parseInt(dotEpisodeMatch[1], 10) <= 2 && parseInt(dotEpisodeMatch[2], 10) > 0) {
        season = parseInt(dotEpisodeMatch[1], 10);
        episode = parseInt(dotEpisodeMatch[2], 10);
        return { season, episode };
    }

    const epMatch = lowerFileName.match(/(?:e|ep)(\d+)/);
    if (epMatch) {
        episode = parseInt(epMatch[1], 10);
        return { episode };
    }

    const numberMatch = lowerFileName.match(/\b(\d{1,3})\b/g);
    if (numberMatch) {
        const potentialEpisodes = numberMatch
            .map(n => parseInt(n, 10))
            .filter(n => n > 0 && n < 1000);

        const filteredEpisodes = potentialEpisodes.filter(n => {
            const numStr = String(n);
            if (numStr.length === 4 && n >= 1900 && n <= 2100) return false;
            return true;
        });

        if (filteredEpisodes.length === 1) {
            episode = filteredEpisodes[0];
            return { episode };
        }
        if (filteredEpisodes.length > 1) {
            episode = filteredEpisodes[filteredEpisodes.length - 1];
            return { episode };
        }
    }

    return {};
}
