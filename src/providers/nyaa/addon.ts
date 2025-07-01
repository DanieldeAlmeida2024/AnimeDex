import { ScrapedTorrentStream} from '../../utils/types/types';
import { searchAnimeTorrentsNyaa } from './services/nyaaScraper';


export async function NyaaTorrentHeadler(    
    animeTitle: string,
    season?: number,
    episode?: number
): Promise<{ streams: ScrapedTorrentStream[] }> {

    const streams = await searchAnimeTorrentsNyaa(animeTitle, season, episode);

    if (streams.length === 0) {
        return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
    }

    return Promise.resolve({ streams });
}