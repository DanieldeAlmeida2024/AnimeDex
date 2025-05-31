import { searchAnimeTorrents } from '../providers/darkmahou/services/darkmahouScraper';
import { ScrapedStream, ScrapeOptions } from '../utils/types/types';

export async function scrapeMagnetLinks(options: ScrapeOptions): Promise<ScrapedStream[]> {
    const { name, season, episode } = options;
    const streams: ScrapedStream[] = [];

    if (name) {
        try {
            const torrents = await searchAnimeTorrents(name, season, episode);
            streams.push(...torrents);
        } catch (torrentError: any) {
        }
    }

    return streams;
}