const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
const port = Number(process.env.PORT || 8787);
const configuredHost = new URL(process.env.ANIMEFIRE_BASE_URL || 'https://animefire.one').hostname;
const allowedHosts = new Set([configuredHost, 'animefire.plus', 'animefire.io', 'animefire.one']);
const timeoutMs = Number(process.env.BROWSER_TIMEOUT_MS || 60000);
const cacheTtlMs = Number(process.env.CACHE_TTL_MS || 30 * 60 * 1000);
const cacheMaxEntries = Math.max(20, Number(process.env.CACHE_MAX_ENTRIES || 500));
const apiBase = 'https://api.animefire.one';
let browserPromise;

// Cache temporário por processo: reiniciar o container limpa tudo.
// A promessa em cada entrada evita scraping duplicado quando o Stremio dispara
// várias solicitações iguais ao mesmo tempo (catálogo, meta ou episódio).
const cache = new Map();

function cacheKey(kind, key) { return `${kind}:${key}`; }

function evictCacheIfNeeded() {
  while (cache.size >= cacheMaxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

async function cached(key, loader) {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }
  if (existing?.promise) return existing.promise;
  if (existing) cache.delete(key);

  evictCacheIfNeeded();
  const entry = { value: undefined, expiresAt: 0, promise: null, createdAt: now };
  entry.promise = Promise.resolve().then(loader).then(value => {
    entry.value = value;
    entry.expiresAt = Date.now() + cacheTtlMs;
    entry.promise = null;
    return value;
  }).catch(error => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, entry);
  return entry.promise;
}

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (!entry.promise && entry.expiresAt <= now) cache.delete(key);
  }
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      dumpio: true,
      timeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-features=UseDBus,Translate',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    }).catch(error => { browserPromise = undefined; throw error; });
  }
  return browserPromise;
}

function assertAllowed(rawUrl) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol) || !allowedHosts.has(url.hostname)) {
    throw new Error('host não permitido');
  }
  return url;
}

async function render(rawUrl) {
  const url = assertAllowed(rawUrl);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36 AnimeDexBrowserWorker/1.0');
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resource = request.resourceType();
      if (['image', 'font', 'media'].includes(resource)) request.abort();
      else request.continue();
    });
    let navigationError;
    let timer;
    try {
      await Promise.race([
        page.goto(url.toString(), { waitUntil: 'commit', timeout: timeoutMs }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`navigation hard timeout after ${timeoutMs} ms`)), timeoutMs);
        }),
      ]);
    } catch (error) {
      navigationError = error;
      console.warn('[navigation]', error.message);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (navigationError) throw navigationError;
    await new Promise(resolve => setTimeout(resolve, 2000));
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, noscript').remove();
    if (!html || html.length < 100) throw navigationError || new Error('HTML vazio após navegação');
    return $.html();
  } finally {
    await page.close().catch(() => {});
  }
}

async function fetchRenderedHtml(rawUrl) {
  const url = assertAllowed(rawUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36 AnimeDexWorker/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(Math.min(timeoutMs, 15000)),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} em fetch direto`);
  const html = await response.text();
  if (html.length < 100 || /cf-chl-|challenge-platform|just a moment/i.test(html)) throw new Error('resposta exige navegador');
  const $ = cheerio.load(html);
  $('script, noscript').remove();
  return $.html();
}

async function fetchAnimeApi(path) {
  return cached(cacheKey('api', path), async () => {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 AnimeDexWorker/1.0',
        Accept: 'application/json',
        Referer: 'https://animefire.one/',
        Origin: 'https://animefire.one',
      },
      signal: AbortSignal.timeout(Math.min(timeoutMs, 20000)),
    });
    if (!response.ok) throw new Error(`AnimeFire API HTTP ${response.status}`);
    return await response.json();
  });
}

async function fetchHomeCatalogs() {
  return cached(cacheKey('home', 'catalogs'), async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const apiResponses = [];
    try {
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36 AnimeDexHomeWorker/1.0');
      page.on('response', async response => {
        if (!response.url().includes('api.animefire.one')) return;
        try {
          const payload = await response.json();
          if (extractApiItems(payload).length) apiResponses.push({ url: response.url(), payload });
        } catch (_) {}
      });
      await page.goto('https://animefire.one/', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await new Promise(resolve => setTimeout(resolve, 7000));
      const dom = await page.evaluate(() => [...document.querySelectorAll('app-carousel')].map((carousel, index) => ({
        index,
        name: carousel.querySelector('app-carousel-header h2 span, h2 span')?.textContent?.trim() || `AnimeFire ${index + 1}`,
        items: [...carousel.querySelectorAll('app-anime-card, a[href*="/anime/"], [routerlink*="/anime/"]')].map(card => {
          const link = card.matches('a') ? card : card.querySelector('a[href*="/anime/"], [routerlink*="/anime/"]');
          const href = link?.getAttribute('href') || link?.getAttribute('routerlink') || '';
          const id = href.match(/\/anime\/([^/?#]+)/i)?.[1] || card.getAttribute('data-id') || '';
          return { id, name: card.querySelector('h3, h2, .title')?.textContent?.trim() || card.querySelector('img')?.getAttribute('alt')?.trim() || '', poster: card.querySelector('img')?.getAttribute('src') || '' };
        }).filter(item => item.id || item.name),
      })));
      const sections = [];
      const seen = new Set();
      const addSection = (name, items, sourceUrl = '') => {
        if ((name || '').trim().toLowerCase() === 'continue assistindo') return;
        const valid = Array.isArray(items) ? items.filter(item => item?.id || item?.name || item?.titles) : [];
        if (!valid.length) return;
        const signature = valid.map(item => item.id || item.name || item.titles?.BR || '').join('|');
        if (seen.has(signature)) return;
        seen.add(signature);
        sections.push({ id: `home_${sections.length}`, name: name || `AnimeFire ${sections.length + 1}`, type: 'series', items: valid, sourceUrl });
      };
      // Quando os componentes Angular estão disponíveis, preserva seus títulos.
      dom.forEach((section, index) => addSection(section.name, extractApiItems(apiResponses[index]?.payload).length ? extractApiItems(apiResponses[index].payload) : section.items, apiResponses[index]?.url || ''));
      // Também inclui respostas que não aparecem no DOM por causa de lazy-load,
      // viewport ou mudança nos componentes da página.
      apiResponses.forEach(({ url, payload }) => addSection(labelFromApiUrl(url, sections.length), extractApiItems(payload), url));
      if (!sections.length) throw new Error('Nenhum carrossel foi retornado pela página inicial');
      return sections;
    } finally { await page.close().catch(() => {}); }
  });
}

function extractApiItems(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.animes)) return data.animes;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) if (Array.isArray(value) && value.some(item => item?.id || item?.titles)) return value;
  }
  return [];
}

function labelFromApiUrl(rawUrl, index) {
  const value = rawUrl.toLowerCase();
  if (value.includes('em-breve') || value.includes('lancamentos')) return value.includes('em-breve') ? 'Em breve' : 'Melhores em lançamento';
  if (value.includes('novidade')) return 'Novidades';
  if (value.includes('top') || value.includes('curtid')) return 'Mais curtidos';
  if (value.includes('atual') || value.includes('recent') || value.includes('episod')) return 'Novos episódios';
  return `AnimeFire ${index + 1}`;
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'animedex-scraper-worker', cacheTtlMs, cacheEntries: cache.size }));
app.get('/api/cache/stats', (_req, res) => {
  clearExpiredCache();
  res.json({ ttlMs: cacheTtlMs, maxEntries: cacheMaxEntries, entries: cache.size, keys: [...cache.keys()] });
});
app.get('/api/catalog', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const movies = req.query.kind === 'movies';
    const path = search
      ? `/animes/pesquisar?q=${encodeURIComponent(search)}&page=${page}`
      : movies ? `/animes/filmes?page=${page}` : `/animes?page=${page}`;
    res.json(await fetchAnimeApi(path));
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/api/home/catalogs', async (_req, res) => {
  try { res.json({ data: await fetchHomeCatalogs() }); }
  catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/api/home/catalog/:id', async (req, res) => {
  try {
    const catalogs = await fetchHomeCatalogs();
    const catalog = catalogs.find(item => item.id === req.params.id);
    if (!catalog) return res.status(404).json({ error: 'Carrossel não encontrado' });
    res.json({ data: catalog.items });
  } catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/api/anime/:id', async (req, res) => {
  try { res.json(await fetchAnimeApi(`/anime/${encodeURIComponent(req.params.id)}`)); }
  catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/api/episode/:id', async (req, res) => {
  try { res.json(await fetchAnimeApi(`/episode/${encodeURIComponent(req.params.id)}`)); }
  catch (error) { res.status(502).json({ error: error.message }); }
});
app.get('/render', async (req, res) => {
  try {
    if (typeof req.query.url !== 'string') return res.status(400).json({ error: 'url obrigatória' });
    const url = assertAllowed(req.query.url).toString();
    const html = await cached(cacheKey('render', url), async () => {
      try {
        return await fetchRenderedHtml(url);
      } catch (error) {
        console.warn('[direct-fetch] fallback para Puppeteer:', error.message);
      }
      return await Promise.race([
        render(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`render HTTP timeout after ${timeoutMs + 5000} ms`)), timeoutMs + 5000)),
      ]);
    });
    res.json({ html, cachedForMs: cacheTtlMs });
  } catch (error) {
    console.error('[render]', error.message);
    res.status(502).json({ error: error.message });
  }
});

const server = app.listen(port, '0.0.0.0', () => console.log(`Scraper worker ouvindo na porta ${port}; cache TTL ${cacheTtlMs} ms`));
async function shutdown() {
  server.close();
  if (browserPromise) (await browserPromise).close().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
