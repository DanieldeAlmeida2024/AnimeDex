import { catalogs, getCatalog, settings, type MediaType } from './config.ts';

const PROXY = (Deno.env.get('BROWSER_SCRAPER_URL') || 'http://163.176.133.210:8787').replace(/\/$/, '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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

async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Cache Supabase não configurado');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates', ...(init.headers || {}) },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Supabase cache HTTP ${response.status}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

function animeUrl(id: string) { return `https://animefire.one/anime/${encodeURIComponent(id)}`; }
function episodeUrl(id: string) { return `https://api.animefire.one/episode/${encodeURIComponent(id)}`; }

async function cacheAnime(anime: ApiAnime, type: MediaType, episodes: ApiEpisode[] = []) {
  try {
    const rows = await db<Array<{ id: string }>>('animes?on_conflict=animefire_url', { method: 'POST', body: JSON.stringify({ animefire_url: animeUrl(anime.id), title: titleOf(anime), alternate_title: anime.titles?.US || anime.titles?.JP || null, type, poster: anime.poster_src || null, background: anime.backdrop_src || null, description: anime.synopsis || null, genres: anime.genres || [], release_year: anime.published_at ? Number(anime.published_at.slice(0, 4)) || null : null }) });
    const animeRow = rows[0] || (await db<Array<{ id: string }>>(`animes?select=id&animefire_url=eq.${encodeURIComponent(animeUrl(anime.id))}&limit=1`))[0];
    if (!animeRow) return;
    for (const episode of episodes) await db('episodes?on_conflict=anime_id,season,episode', { method: 'POST', body: JSON.stringify({ anime_id: animeRow.id, season: Math.max(1, episode.season || 1), episode: Math.max(1, episode.number || 1), title: episode.title || `Episódio ${episode.number || 1}`, episode_url: episodeUrl(episode.id), streams: [] }) });
  } catch (error) { console.warn('[cache anime]', error); }
}

function toStremioStreams(streams: Array<{ url: string; audio?: string; qualities?: string[] }>) {
  return streams.map(item => ({ name: `AnimeFire ${item.audio || ''}`.trim(), title: item.audio || 'AnimeFire', quality: item.qualities?.join(', ') || undefined, url: item.url, behaviorHints: { bingeGroup: 'animedex-animefire', proxyHeaders: { request: { Referer: 'https://animefire.one/', Origin: 'https://animefire.one' } } } }));
}

function unwrapCatalog(payload: any): ApiAnime[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.animes)) return data.animes;
  return [];
}

async function catalog(type: MediaType, id: string, search?: string, skip = 0) {
  const definition = getCatalog(id);
  const isHomeCatalog = type === 'series' && /^home_\d+$/.test(id);
  if ((!definition || definition.type !== type) && !isHomeCatalog) throw new Error('Catálogo não disponível');
  if (isHomeCatalog) {
    const payload = await proxy<any>(`/api/home/catalog/${encodeURIComponent(id)}`);
    const homeItems = unwrapCatalog(payload);
    return { metas: homeItems.slice(skip, skip + settings.maxCatalogItems).map((anime) => ({ id: addonId(anime.id), type: 'series', name: titleOf(anime), poster: anime.poster_src, background: anime.backdrop_src, description: anime.synopsis, releaseInfo: anime.published_at?.slice(0, 4), genres: anime.genres || [] })) };
  }
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
  await cacheAnime(anime, type, data.episodes || []);
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
  try {
    const cached = await db<Array<{ streams: Array<{ url: string; audio?: string; qualities?: string[] }> }>>(`episodes?select=streams&episode_url=eq.${encodeURIComponent(episodeUrl(id))}&limit=1`);
    if (cached[0]?.streams?.length) return { streams: toStremioStreams(cached[0].streams) };
  } catch (error) { console.warn('[cache stream read]', error); }
  const payload = await proxy<{ data: { streams?: Array<{ url: string; audio?: string; qualities?: string[] }> } }>(`/api/episode/${encodeURIComponent(id)}`);
  const sourceStreams = payload.data.streams || [];
  try {
    await db(`episodes?episode_url=eq.${encodeURIComponent(episodeUrl(id))}`, { method: 'PATCH', body: JSON.stringify({ streams: sourceStreams }) });
  } catch (error) { console.warn('[cache stream write]', error); }
  return {
    streams: toStremioStreams(sourceStreams),
  };
}

async function manifest() {
  let dynamicCatalogs: Array<{ id: string; name: string; type: MediaType }> = [];
  try {
    const response = await fetch(`${PROXY}/api/home/catalogs`, { signal: AbortSignal.timeout(15000) });
    if (response.ok) dynamicCatalogs = ((await response.json()) as { data?: Array<{ id: string; name: string; type: MediaType }> }).data || [];
  } catch (error) { console.warn('[manifest] carrosséis dinâmicos indisponíveis:', error); }
  const manifestCatalogs = [...catalogs, ...dynamicCatalogs.filter(dynamic => !catalogs.some(catalog => catalog.id === dynamic.id))];
  return {
    id: settings.addonId,
    version: settings.addonVersion,
    name: settings.addonName,
    description: 'Catálogo próprio AnimeDex com busca, episódios e streams AnimeFire',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: manifestCatalogs.map((item) => ({
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
    if (path === 'manifest.json') return json(await manifest());
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
