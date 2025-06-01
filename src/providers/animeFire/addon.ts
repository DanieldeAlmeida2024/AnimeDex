import { Meta } from '../../utils/types/types';
import { PROVIDER_URL } from './constants/url';
import { ScrapedAnimeAnimeFire } from '../../utils/types/types';
import { scrapeAtualizadosAnimes, scrapeDubladosAnimes, scrapeLegendadosAnimes, scrapeTopAnimes,scrapeRecentAnimes, searchAnimes, scrapeAnimeDetails, scrapeStreamsFromContentPage } from './services/animeFireScraper';
import {  getTmdbInfoByName } from '../../utils/tmdbApi';
import { createAnimeOnDataBase, findFirstDataBase, saveAnimesToDatabase, updateDateDataBase } from '../../persistence/db';
const BASE_URL = PROVIDER_URL;

export async function animeFireHeadler(
		{ type, id, extra }: 
		{ type: string; id: string; 
			extra: 
			{ search?: string; skip?: string } 
		}
	): Promise<{ metas: Meta[] }> {
		console.log(`[ADDON ANIMEFIRE]Type: ${type}, id: ${id}, extra: ${extra}`);
		const { search, skip } = extra;
		const page = skip ? Math.floor(parseInt(skip) / 20) + 1 : 1;
		let scrapedAnimes: ScrapedAnimeAnimeFire[] = [];
		if (search?.search) { 
			scrapedAnimes = await searchAnimes(search, type as 'movie' | 'series');
		}else{
			switch (id) {
				case 'animedex_series_catalog': 
					scrapedAnimes = await scrapeTopAnimes(type as 'series', page);
					break;
				case 'animedex_movies_catalog': 
					scrapedAnimes = await scrapeDubladosAnimes(type as 'movie', page);
					break;
				case 'animedex_lancamentos_movies_catalog':
					scrapedAnimes = await scrapeRecentAnimes(type as 'movie', page);
					break;
				case 'animedex_lancamentos_series_catalog':
					scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
					break;
				case 'animedex_atualizado_series_catalog':
					scrapedAnimes = await scrapeAtualizadosAnimes(type as 'series', page);
					break;
				case 'animedex_atualizados_movies_catalog':
					scrapedAnimes = await scrapeAtualizadosAnimes(type as 'movie', page);
					break;
				case 'animedex_dublados_series_catalog':
					scrapedAnimes = await scrapeDubladosAnimes(type as 'series', page);
					break;
				case 'animedex_legendados_series_catalog':
					scrapedAnimes = await scrapeLegendadosAnimes(type as 'series', page);
					break;
				case 'animedex_legendados_movies_catalog':
					scrapedAnimes = await scrapeLegendadosAnimes(type as 'movie', page);
					break;
				default:
					console.warn(`Catálogo desconhecido solicitado: ${id}. Retornando vazio.`);
					break;
			}
		}
		for (const scrapedAnime of scrapedAnimes) {
			//pesquisa imdb
			let animeName: string | undefined;
			let animeRecord;
			const tmdbInfo = await getTmdbInfoByName(scrapedAnime.title);
			try {
				animeRecord = await findFirstDataBase(tmdbInfo);
				if (!animeRecord) {
					if (tmdbInfo) {
						animeRecord = await createAnimeOnDataBase(tmdbInfo);
					} 
				} else if (animeRecord) {
					if (animeRecord && animeRecord.id) {
						await updateDateDataBase(tmdbInfo);
					}
					animeName = animeRecord.title;
				}
				await saveAnimesToDatabase(tmdbInfo,scrapedAnime);
		}catch (e:any){
		}
		const metas: Meta[] = scrapedAnimes.map(anime => ({
			id: `animefire_${anime.type}_${encodeURIComponent(anime.animefireUrl)}`,
			type: anime.type,
			name: anime.title,
			poster: anime.poster ?? undefined,
			description: '',
			genres: [],
		}));
		return { metas };
	}
	return { metas: [] };
}
