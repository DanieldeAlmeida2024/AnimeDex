import { catalogs, getCatalog, settings, type MediaType } from './config.ts';

const PROXY = (Deno.env.get('BROWSER_SCRAPER_URL') || 'http://163.176.133.210:8787').replace(/\/$/, '');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

type ApiAnime = {
  id: string;
  titles?: Record<string, string>;
  audio?: string;
  poster_src?: string;
  backdrop_src?: string;
  synopsis?: string;
  status?: string;
  genres?: string[];
  published_at?: string;
};
type ApiEpisode = { id: string; title: string; season: number; number: number; still_src?: string; synopsis?: string; audio?: string };

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const titleOf = (anime: ApiAnime) => anime.titles?.BR || anime.titles?.US || anime.titles?.JP || anime.id;
const addonId = (id: string) => `animedex_series_${encodeURIComponent(id)}`;
const movieId = (id: string) => `animedex_movie_${encodeURIComponent(id)}`;
const episodeId = (id: string) => `animedex_episode_${encodeURIComponent(id)}`;

async function proxy<T>(path: string): Promise<T> {
  const response = await fetch(`${PROXY}${path}`, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Worker AnimeFire HTTP ${response.status}`);
  return await response.json() as T;
}

function unwrapCatalog(payload: any): ApiAnime[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.animes)) return data.animes;
  return [];
}

async function catalog(type: MediaType, id: string, search?: string, skip = 0) {
  const definition = getCatalog(id);
  if (!definition || definition.type !== type) throw new Error('Catálogo não disponível');
  const query = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
  const kind = type === 'movie' ? '&kind=movies' : '';
  const payload = await proxy<any>(`/api/catalog?page=${Math.floor(skip / settings.maxCatalogItems) + 1}${kind}${query}`);
  const items = unwrapCatalog(payload).slice(skip % settings.maxCatalogItems, skip % settings.maxCatalogItems + settings.maxCatalogItems);
  return {
    metas: items.map((anime) => ({
      id: type === 'movie' ? movieId(anime.id) : addonId(anime.id),
      type,
      name: titleOf(anime),
      poster: anime.poster_src,
      background: anime.backdrop_src,
      description: anime.synopsis,
      releaseInfo: anime.published_at?.slice(0, 4),
      genres: anime.genres || [],
    })),
  };
}

async function meta(type: MediaType, rawId: string) {
  if (type !== 'series' && type !== 'movie') throw new Error('Tipo não suportado');
  const id = decodeURIComponent(rawId.replace(/^animedex_(?:series|movie)_/, ''));
  const payload = await proxy<{ data: { hero: ApiAnime; seasons: unknown[]; episodes: ApiEpisode[] } }>(`/api/anime/${encodeURIComponent(id)}`);
  const data = payload.data;
  const anime = data.hero;
  return {
    meta: {
      id: type === 'movie' ? movieId(anime.id) : addonId(anime.id),
      type,
      name: titleOf(anime),
      poster: anime.poster_src,
      background: anime.backdrop_src,
      description: anime.synopsis,
      genres: anime.genres || [],
      releaseInfo: anime.published_at?.slice(0, 4),
      ...(type === 'series' ? { videos: (data.episodes || []).map((episode) => ({
        id: episodeId(episode.id),
        title: episode.title,
        season: episode.season,
        episode: episode.number,
        thumbnail: episode.still_src,
        overview: episode.synopsis,
      })) } : {}),
    },
  };
}

async function stream(type: MediaType, rawId: string) {
  if (type !== 'series' && type !== 'movie') throw new Error('Tipo não suportado');
  let id = decodeURIComponent(rawId.replace(/^animedex_(?:series|movie|episode)_/, ''));
  if (type === 'movie') {
    const movie = await proxy<{ data: { episodes?: ApiEpisode[] } }>(`/api/anime/${encodeURIComponent(id)}`);
    id = movie.data.episodes?.[0]?.id || '';
    if (!id) throw new Error('Filme sem episódio/stream disponível');
  }
  const payload = await proxy<{ data: { streams?: Array<{ url: string; audio?: string; qualities?: string[] }> } }>(`/api/episode/${encodeURIComponent(id)}`);
  return {
    streams: (payload.data.streams || []).map((item) => ({
      name: `AnimeFire ${item.audio || ''}`.trim(),
      title: item.audio || 'AnimeFire',
      quality: item.qualities?.join(', ') || undefined,
      url: item.url,
      behaviorHints: {
        bingeGroup: 'animedex-animefire',
        proxyHeaders: {
          request: {
            Referer: 'https://animefire.one/',
            Origin: 'https://animefire.one',
          },
        },
      },
    })),
  };
}

function manifest() {
  return {
    id: settings.addonId,
    version: settings.addonVersion,
    name: settings.addonName,
    description: 'Catálogo próprio AnimeDex com busca, episódios e streams AnimeFire',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: catalogs.map((item) => ({
      type: item.type,
      id: item.id,
      name: item.name,
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }],
    })),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const addonIndex = segments.indexOf('animedex');
    const path = (addonIndex >= 0 ? segments.slice(addonIndex + 1) : segments.slice(-3)).join('/');
    if (path === 'manifest.json') return json(manifest());
    const parts = path.split('/');
    if (parts.length === 3 && parts[2].endsWith('.json')) {
      const id = parts[2].slice(0, -5);
      if (parts[0] === 'catalog') return json(await catalog(parts[1] as MediaType, id, url.searchParams.get('search') || undefined, Math.max(0, Number(url.searchParams.get('skip') || 0))));
      if (parts[0] === 'meta') return json(await meta(parts[1] as MediaType, id));
      if (parts[0] === 'stream') return json(await stream(parts[1] as MediaType, id));
    }
    return json({ error: 'Rota não encontrada' }, 404);
  } catch (error) {
    console.error('[animedex]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno' }, 502);
  }
});
