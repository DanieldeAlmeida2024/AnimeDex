const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
const port = Number(process.env.PORT || 8787);
const configuredHost = new URL(process.env.ANIMEFIRE_BASE_URL || 'https://animefire.one').hostname;
const allowedHosts = new Set([configuredHost, 'animefire.plus', 'animefire.io', 'animefire.one']);
const timeoutMs = Number(process.env.BROWSER_TIMEOUT_MS || 60000);
let browserPromise;

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
    // Cheerio permanece aqui para normalizar o DOM renderizado antes de devolver o HTML.
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

app.get('/health', (_req, res) => res.json({ ok: true, service: 'animedex-scraper-worker' }));
app.get('/render', async (req, res) => {
  try {
    if (typeof req.query.url !== 'string') return res.status(400).json({ error: 'url obrigatória' });
    try {
      const html = await fetchRenderedHtml(req.query.url);
      return res.json({ html, method: 'fetch' });
    } catch (error) {
      console.warn('[direct-fetch] fallback para Puppeteer:', error.message);
    }
    const html = await Promise.race([
      render(req.query.url),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`render HTTP timeout after ${timeoutMs + 5000} ms`)), timeoutMs + 5000)),
    ]);
    res.json({ html });
  } catch (error) {
    console.error('[render]', error.message);
    res.status(502).json({ error: error.message });
  }
});

const server = app.listen(port, '0.0.0.0', () => console.log(`Scraper worker ouvindo na porta ${port}`));
async function shutdown() {
  server.close();
  if (browserPromise) (await browserPromise).close().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
