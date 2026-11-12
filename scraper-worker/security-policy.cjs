'use strict';
const { timingSafeEqual } = require('node:crypto');

function verifyBearer(header, secret) {
  if (typeof header !== 'string' || typeof secret !== 'string' || !header.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  if (!token || /\s/.test(token)) return false;
  const expected = Buffer.from(secret, 'utf8');
  const received = Buffer.from(token, 'utf8');
  return expected.length >= 32 && received.length === expected.length && timingSafeEqual(received, expected);
}

function assertAllowedUrl(value, allowedHosts) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error('URL fora da política de destinos permitidos');
  }
  return url;
}

async function fetchWithAllowedRedirects(rawUrl, init, hosts, fetchImpl = fetch, maxRedirects = 3) {
  let url = assertAllowedUrl(rawUrl, hosts);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetchImpl(url.toString(), { ...init, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers?.get('location');
    if (!location) throw new Error('Redirecionamento sem Location');
    if (response.body?.cancel) await response.body.cancel();
    if (hop === maxRedirects) throw new Error('Limite de redirecionamentos excedido');
    url = assertAllowedUrl(new URL(location, url).toString(), hosts);
  }
  throw new Error('Limite de redirecionamentos excedido');
}

module.exports = { verifyBearer, assertAllowedUrl, fetchWithAllowedRedirects };
