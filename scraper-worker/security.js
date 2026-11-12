'use strict';
const { createHash, timingSafeEqual } = require('node:crypto');
function createWorkerAuth(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32 || /\s/.test(secret)) {
    throw new Error('BROWSER_SCRAPER_TOKEN obrigatório: >=32 bytes, sem espaços');
  }
  const expected = createHash('sha256').update(secret).digest();
  return (req, res, next) => {
    const input = req.headers.authorization;
    const match = typeof input === 'string' ? /^Bearer ([^\s]+)$/.exec(input) : null;
    const actual = createHash('sha256').update(match?.[1] || '').digest();
    if (!match || !timingSafeEqual(expected, actual)) {
      return res.set('Cache-Control', 'no-store').status(401).json({ error: 'não autorizado' });
    }
    next();
  };
}
function assertAllowedSourceUrl(raw, hosts) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL inválida'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash ||
      !hosts.has(u.hostname.toLowerCase())) {
    throw new Error('destino de rede não permitido');
  }
  return u;
}
async function fetchWithAllowedRedirects(raw, options, hosts, performFetch = fetch) {
  let current = assertAllowedSourceUrl(raw, hosts);
  const redirects = new Set([301, 302, 303, 307, 308]);
  for (let i = 0; i <= 3; i++) {
    const response = await performFetch(current.toString(), { ...options, redirect: 'manual' });
    if (!redirects.has(response.status)) return response;
    const location = response.headers.get('location');
    if (!location || i === 3) {
      if (response.body) await response.body.cancel().catch(() => {});
      throw new Error('limite de redirecionamentos');
    }
    const next = assertAllowedSourceUrl(new URL(location, current).toString(), hosts);
    if (response.body) await response.body.cancel().catch(() => {});
    current = next;
  }
  throw new Error('limite de redirecionamentos');
}
module.exports = { createWorkerAuth, assertAllowedSourceUrl, fetchWithAllowedRedirects };
