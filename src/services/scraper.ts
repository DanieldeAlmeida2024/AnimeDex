import { searchAnimeTorrentsDarkmahou } from '../providers/darkmahou/services/darkmahouScraper';
import { searchAnimeTorrentsNyaa } from '../providers/nyaa/services/nyaaScraper';
import { ScrapedEpisodeTorrent ,ScrapedStream, ScrapeOptions } from '../utils/types/types';

export async function scrapeMagnetLinks(options: ScrapeOptions): Promise<ScrapedStream[]> {
    const { name, season, episode } = options;
    const streams: ScrapedStream[] = [];

    if (name) {
        try {
            const torrents = await searchAnimeTorrentsNyaa(name, season, episode);
            streams.push(...torrents);
            console.log(`Scraped Nyaa para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            if(streams.length === 0) {
                const torrents = await searchAnimeTorrentsDarkmahou(name, season, episode);
                streams.push(...torrents);
                console.log(`Scraped Darkmahou para "${name}" - Temporada: ${season}, Episodio: ${episode}`);
            }
        } catch (torrentError: any) {

        }
    }

    return streams;
}