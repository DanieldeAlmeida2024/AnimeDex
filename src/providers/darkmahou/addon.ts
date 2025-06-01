import { ScrapedTorrentStream, Stream } from '../../utils/types/types';
import { TORRENT_ANIME_URL } from './constants/url';
import { searchAnimeTorrentsDarkmahou } from './services/darkmahouScraper';


const BASE_URL = TORRENT_ANIME_URL;

export async function darkmahouTorrentHeadler(    
	animeTitle: string,
    season?: number,
    episode?: number
): Promise<{ streams: ScrapedTorrentStream[] }> {

	const streams = await searchAnimeTorrentsDarkmahou(animeTitle, season, episode);

	if (streams.length === 0) {
		return Promise.reject(new Error('Nenhum stream encontrado para este conteúdo.'));
	}

	return Promise.resolve({ streams });
}