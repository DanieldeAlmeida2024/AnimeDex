import { Stream } from '../../utils/types/types';
import { TORRENT_ANIME_URL } from './constants/url';
import { searchAnimeTorrents } from './services/darkmahouScraper';


const BASE_URL = TORRENT_ANIME_URL;

export async function darkmahouTorrentHeadler(    
	animeTitle: string,
    season?: number,
    episode?: number
): Promise<{ streams: Stream[] }> {

	const streams = await searchAnimeTorrents(animeTitle, season, episode);

	if (streams.length === 0) {
		return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
	}

	return Promise.resolve({ streams });
}