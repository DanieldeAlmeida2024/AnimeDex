import { catalogs, getCatalog, settings, type MediaType } from './config.ts';

const BASE_URL = settings.baseUrl;
const BASE_HOSTNAME = new URL(BASE_URL).hostname;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY') || '';
const REAL_DEBRID_TOKEN = Deno.env.get('REAL_DEBRID_API_TOKEN') || '';
const BROWSER_SCRAPER_URL = (Deno.env.get('BROWSER_SCRAPER_URL') || '').replace(/\/$/, '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

type Stream = { name: string; title?: string; url: string; quality?: string; behaviorHints?: Record<string, string> };
type Anime = {
  id?: string; animefire_url: string; title: string; alternate_title?: string | null; type: MediaType;
  poster?: string | null; background?: string | null; description?: string | null;
  genres?: string[] | null; release_year?: number | null;
};
type Episode = {
  id?: string; anime_id?: string; season: number; episode: number; title: string; episode_url: string; streams?: Stream[];
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function clean(value = ''): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(value = ''): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function absoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try { return new URL(decodeHtml(value), BASE_URL).toString(); } catch { return undefined; }
}

function assertAllowedUrl(value: string, allowedHost = BASE_HOSTNAME): URL {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname !== allowedHost) throw new Error('URL externa não permitida');
  return parsed;
}

async function fetchText(url: string, allowedHost = BASE_HOSTNAME): Promise<string> {
  assertAllowedUrl(url, allowedHost);
  if (BROWSER_SCRAPER_URL && allowedHost === BASE_HOSTNAME) {
    try {
      const rendered = await fetchJson<{ html?: string }>(`${BROWSER_SCRAPER_URL}/render?url=${encodeURIComponent(url)}`, {}, settings.httpTimeoutMs + 8_000);
      if (rendered.html) return rendered.html;
    } catch (error) {
      console.warn('[browser-scraper] fallback para fetch direto', error);
    }
  }
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AnimeDex-Supabase/1.0 (+Stremio addon)' },
    signal: AbortSignal.timeout(settings.httpTimeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ao consultar ${new URL(url).hostname}`);
  return await response.text();
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeout = settings.httpTimeoutMs): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status} em API externa`);
  return await response.json() as T;
}

function extractCards(html: string, type: MediaType): Anime[] {
  const result: Anime[] = [];
  const cardRegex = /<article[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>[\s\S]*?<\/article>/gi;
  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) && result.length < settings.maxCatalogItems) {
    const url = absoluteUrl(match[1]);
    if (!url || !url.startsWith(BASE_URL)) continue;
    const block = match[0];
    const heading = block.match(/<(?:h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4)>/i);
    const title = clean(decodeHtml(heading?.[1] || block.match(/alt=["']([^"']+)["']/i)?.[1] || ''));
    if (title && !result.some(item => item.animefire_url === url)) result.push({ animefire_url: url, title, type, poster: absoluteUrl(match[2]) });
  }
  return result;
}

function parseEpisodes(html: string, animeUrl: string): Episode[] {
  const episodes: Episode[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) && episodes.length < 300) {
    const url = absoluteUrl(match[1]);
    if (!url || !url.startsWith(animeUrl)) continue;
    const text = clean(decodeHtml(match[2]));
    const numberMatch = `${url} ${text}`.match(/(?:epis[oó]dio|ep(?:isode)?|\/)(?:-|\s)*([0-9]{1,4})(?:\D|$)/i);
    if (!numberMatch) continue;
    const episode = Number(numberMatch[1]);
    if (episode < 1 || episodes.some(item => item.episode === episode)) continue;
    episodes.push({ season: 1, episode, title: text || `Episódio ${episode}`, episode_url: url });
  }
  return episodes.sort((a, b) => a.episode - b.episode);
}

function parseDetails(html: string, url: string, type: MediaType): { anime: Anime; episodes: Episode[] } {
  const title = clean(decodeHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')).replace(/AnimeFire.*/i, '').trim();
  const poster = absoluteUrl(html.match(/<(?:img)[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i)?.[1]);
  const background = absoluteUrl(html.match(/(?:data-background|data-src)=["']([^"']+)["']/i)?.[1]) || poster;
  const description = clean(decodeHtml(html.match(/(?:sinopse|spanAnimeInfo)[^>]*>([\s\S]*?)<\//i)?.[1] || ''));
  const year = html.match(/(?:19|20)\d{2}/)?.[0];
  const genres = [...html.matchAll(/<a[^>]*>([^<]{2,30})<\/a>/gi)].map(item => clean(decodeHtml(item[1]))).filter(item => item.length < 30).slice(0, 8);
  const anime: Anime = { animefire_url: url, title: title || url.split('/').pop() || 'Anime', type, poster, background, description, genres, release_year: year ? Number(year) : null };
  return { anime, episodes: type === 'series' ? parseEpisodes(html, url) : [] };
}

function parseStreams(html: string): Stream[] {
  const streams: Stream[] = [];
  const regex = /<(?:a|source)[^>]+(?:download|href|src)=["']([^"']+\.(?:mp4|webm|m3u8)(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/(?:a|source)>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && streams.length < settings.maxStreams) {
    const url = match[1];
    if (!/^https?:\/\//i.test(url) || streams.some(item => item.url === url)) continue;
    const label = clean(match[2]);
    streams.push({ name: `AnimeFire ${label || 'stream'}`, title: label || undefined, quality: label || undefined, url });
  }
  return streams;
}

function restHeaders() {
  return { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
}

async function db<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const headers = new Headers(restHeaders());
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : await response.json() as T;
}

async function findAnime(url: string): Promise<Anime | null> {
  const rows = await db<Anime[]>(`animes?animefire_url=eq.${encodeURIComponent(url)}&limit=1`);
  return rows?.[0] || null;
}

async function upsertAnime(anime: Anime): Promise<Anime> {
  const rows = await db<Anime[]>('animes?on_conflict=animefire_url', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(anime),
  });
  return rows?.[0] || anime;
}

async function upsertEpisodes(animeId: string | undefined, episodes: Episode[]) {
  if (!animeId || !episodes.length) return;
  await db('episodes?on_conflict=anime_id,season,episode', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(episodes.map(item => ({ ...item, anime_id: animeId }))),
  });
}

function addonId(anime: Anime) { return `animedex_${anime.type}_${encodeURIComponent(anime.animefire_url)}`; }

function parseContentId(rawId: string): { url: string; season?: number; episode?: number } {
  const decoded = decodeURIComponent(rawId);
  const episodeMatch = decoded.match(/^(.*):(\d+):(\d+)$/);
  if (episodeMatch) return { url: episodeMatch[1], season: Number(episodeMatch[2]), episode: Number(episodeMatch[3]) };
  const addonMatch = decoded.match(/^animedex_(?:series|movie)_(.*)$/);
  return { url: addonMatch ? addonMatch[1] : decoded };
}

async function enrichWithMetadata(anime: Anime): Promise<Anime> {
  if (!TMDB_API_KEY) return anime;
  try {
    const ani = await fetchJson<{ data?: { Page?: { media?: Array<{ title?: { romaji?: string; english?: string }; startDate?: { year?: number }; genres?: string[]; coverImage?: { large?: string }; bannerImage?: string } }> } }>('https://graphql.anilist.co', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query($search:String){Page(page:1,perPage:5){media(search:$search,type:ANIME,sort:SEARCH_MATCH){title{romaji english}startDate{year}genres coverImage{large}bannerImage externalLinks{url site}}}}`, variables: { search: anime.title } }),
    });
    const media = ani.data?.Page?.media?.[0];
    const imdb = (media as any)?.externalLinks?.find((link: any) => link.site === 'IMDb')?.url?.match(/(tt\d+)/)?.[1];
    let tmdb: any = null;
    if (imdb) {
      const found = await fetchJson<any>(`https://api.themoviedb.org/3/find/${imdb}?api_key=${encodeURIComponent(TMDB_API_KEY)}&external_source=imdb_id&language=pt-BR`);
      tmdb = found.tv_results?.[0] || found.movie_results?.[0];
    }
    if (!tmdb) {
      const endpoint = anime.type === 'series' ? 'tv' : 'movie';
      const found = await fetchJson<any>(`https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=pt-BR&query=${encodeURIComponent(media?.title?.english || media?.title?.romaji || anime.title)}`);
      tmdb = found.results?.[0];
    }
    return {
      ...anime,
      title: tmdb?.title || tmdb?.name || media?.title?.english || media?.title?.romaji || anime.title,
      poster: tmdb?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : media?.coverImage?.large || anime.poster,
      background: tmdb?.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}` : media?.bannerImage || anime.background,
      description: tmdb?.overview || anime.description,
      genres: tmdb?.genres?.map((item: { name: string }) => item.name) || media?.genres || anime.genres,
      release_year: Number((tmdb?.first_air_date || tmdb?.release_date || '').slice(0, 4)) || media?.startDate?.year || anime.release_year,
    };
  } catch (error) {
    console.warn('[metadata] fallback para dados do AnimeFire', error);
    return anime;
  }
}

function catalogSourcePath(catalogId: string, search?: string): string {
  const definition = getCatalog(catalogId);
  if (search?.trim() && definition?.searchPath) return `${definition.searchPath}/${encodeURIComponent(search.trim()).replace(/%20/g, '-')}`;
  return definition?.sourcePath || '';
}

async function catalog(type: MediaType, catalogId: string, search?: string, skip = 0) {
  const definition = getCatalog(catalogId);
  if (!definition || definition.type !== type) throw new Error('Catálogo não disponível neste addon');
  const html = await fetchText(`${BASE_URL}${catalogSourcePath(catalogId, search)}`);
  const items = extractCards(html, type).slice(skip, skip + settings.maxCatalogItems);
  const metas = [];
  for (const item of items) {
    const cached = await upsertAnime(item);
    metas.push({ id: addonId(cached), type: cached.type, name: cached.title, poster: cached.poster, background: cached.background, description: cached.description });
  }
  return { metas };
}

async function meta(type: MediaType, rawId: string) {
  const { url } = parseContentId(rawId);
  assertAllowedUrl(url);
  const cached = await findAnime(url);
  const parsed = parseDetails(await fetchText(url), url, type);
  const anime = await upsertAnime(await enrichWithMetadata({ ...cached, ...parsed.anime, type }));
  await upsertEpisodes(anime.id, parsed.episodes);
  return { meta: { id: addonId(anime), type: anime.type, name: anime.title, poster: anime.poster, background: anime.background, description: anime.description, genres: anime.genres || [], releaseInfo: anime.release_year?.toString(), videos: parsed.episodes.map(ep => ({ id: `${encodeURIComponent(url)}:${ep.season}:${ep.episode}`, title: ep.title, season: ep.season, episode: ep.episode })) } };
}

function parseRelease(name: string): { season?: number; episode?: number; batch: boolean } {
  const normalized = name.toLowerCase();
  const season = Number(normalized.match(/s(\d+)/)?.[1] || normalized.match(/season[ ._-]*(\d+)/)?.[1] || 1);
  const episode = Number(normalized.match(/e(\d+)/)?.[1] || normalized.match(/(?:ep|episode|epis[oó]dio)[ ._-]*(\d+)/)?.[1] || 0) || undefined;
  const batch = /batch|completa|complete|full[ ._-]*season|\bs\d{1,2}\b(?!e\d)/i.test(normalized);
  return { season, episode, batch };
}

function magnetLinks(html: string): Array<{ magnet: string; name: string }> {
  return [...html.matchAll(/href=["'](magnet:\?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(item => ({ magnet: decodeHtml(item[1]), name: clean(decodeHtml(item[2])) })).slice(0, 10);
}

async function rd<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!REAL_DEBRID_TOKEN) throw new Error('Real-Debrid não configurado');
  const headers = new Headers({ Authorization: `Bearer ${REAL_DEBRID_TOKEN}` });
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return await fetchJson<T>(`https://api.real-debrid.com/rest/1.0${path}`, { ...init, headers }, settings.rdTimeoutMs);
}

async function resolveMagnet(magnet: string, hint?: string): Promise<string | null> {
  try {
    const added = await rd<{ id?: string }>('/torrents/addMagnet', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ magnet }) });
    if (!added.id) return null;
    const deadline = Date.now() + settings.rdTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1800));
      const info = await rd<any>(`/torrents/info/${added.id}`);
      if (info.status === 'waiting_files_selection' && info.files?.length) {
        const desired = info.files.filter((file: any) => /\.(mkv|mp4|webm|avi)$/i.test(file.path) && Number(file.bytes) > 5_000_000).filter((file: any) => !hint || file.path.toLowerCase().includes(hint.toLowerCase()));
        const candidates = desired.length ? desired : info.files.filter((file: any) => /\.(mkv|mp4|webm|avi)$/i.test(file.path));
        const selected = candidates.sort((a: any, b: any) => Number(b.bytes) - Number(a.bytes))[0];
        if (!selected) return null;
        await rd(`/torrents/selectFiles/${added.id}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ files: String(selected.id) }) });
      }
      if (info.status === 'downloaded' && info.links?.[0]) {
        const unrestricted = await rd<{ download?: string }>('/unrestrict/link', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ link: info.links[0] }) });
        return unrestricted.download || null;
      }
    }
  } catch (error) { console.warn('[real-debrid]', error); }
  return null;
}

async function torrentStreams(title: string, season?: number, episode?: number): Promise<Stream[]> {
  if (!REAL_DEBRID_TOKEN) return [];
  const query = encodeURIComponent(`${title} pt-br`);
  const sources = [`https://nyaa.si/?f=0&c=0_0&q=${query}`, `https://darkmahou.org/?s=${encodeURIComponent(title)}`];
  for (const source of sources) {
    try {
      const links = magnetLinks(await fetchText(source, new URL(source).hostname));
      for (const item of links) {
        const release = parseRelease(item.name);
        const relevant = season === undefined && episode === undefined ? release.batch || !release.episode : release.season === (season || 1) && (release.batch || release.episode === episode);
        if (!relevant) continue;
        const url = await resolveMagnet(item.magnet, episode ? `S${String(season || 1).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : undefined);
        if (url) return [{ name: `Real-Debrid — ${new URL(source).hostname}`, title: item.name, url }];
      }
    } catch (error) { console.warn('[torrent]', error); }
  }
  return [];
}

async function stream(type: MediaType, rawId: string) {
  const { url, season, episode } = parseContentId(rawId);
  assertAllowedUrl(url);
  const contentUrl = type === 'series' && episode ? `${url}/${episode}` : url;
  let streams = parseStreams(await fetchText(contentUrl));
  if (!streams.length) {
    const cached = await findAnime(url);
    streams = await torrentStreams(cached?.title || url.split('/').pop() || 'anime', season, episode);
  }
  return { streams: streams.map(item => ({ ...item, behaviorHints: { bingeGroup: 'animedex-supabase' } })) };
}

function manifest() {
  return { id: settings.addonId, version: settings.addonVersion, name: settings.addonName, description: 'Catálogo próprio de animes com busca na fonte AnimeDex', resources: ['catalog', 'meta', 'stream'], types: ['series'], catalogs: catalogs.map(catalog => ({ type: catalog.type, id: catalog.id, name: catalog.name, extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] })) };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const requestUrl = new URL(request.url);
    const path = requestUrl.pathname.replace(/^\/functions\/v1\/animedex\/?/, '').replace(/^\//, '');
    if (path === 'manifest.json') return json(manifest());
    const parts = path.split('/');
    if (parts.length === 3 && parts[2].endsWith('.json')) {
      const id = parts[2].slice(0, -5);
      if (parts[0] === 'catalog') return json(await catalog(parts[1] as MediaType, id, requestUrl.searchParams.get('search') || undefined, Math.max(0, Number(requestUrl.searchParams.get('skip') || 0))));
      if (parts[0] === 'meta') return json(await meta(parts[1] as MediaType, id));
      if (parts[0] === 'stream') return json(await stream(parts[1] as MediaType, id));
    }
    return json({ error: 'Rota não encontrada' }, 404);
  } catch (error) {
    console.error('[animedex]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno' }, 502);
  }
});
