'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyBearer, assertAllowedUrl, fetchWithAllowedRedirects } = require('../security-policy.cjs');

const secret = '0123456789abcdef0123456789abcdef';
const hosts = new Set(['animefire.one', 'animefire.plus', 'api.animefire.one']);

test('ANI-W01 bearer forte exato; sem tolerância a alterações', () => {
  assert.equal(verifyBearer('Bearer ' + secret, secret), true);
  for (const token of [null, '', 'bearer ' + secret, 'Bearer wrong', 'Bearer ' + secret + 'x', 'Bearer ' + secret + ' ']) {
    assert.equal(verifyBearer(token, secret), false);
  }
  assert.equal(verifyBearer('Bearer weak', 'weak'), false);
});

for (const url of [
  'http://animefire.one/x',
  'https://127.0.0.1/',
  'https://localhost/',
  'https://169.254.169.254/latest/meta-data/',
  'https://animefire.one:8443/x',
  'https://user:pass@animefire.one/x',
  'https://animefire.one.evil.tld/',
  'file:///etc/passwd',
  'https://animefire.one@127.0.0.1/',
  'https://[::1]/',
]) {
  test('ANI-W02 bloqueia: ' + url, () => assert.throws(() => assertAllowedUrl(url, hosts)));
}
for (const url of [
  'https://animefire.one/anime/slug',
  'https://animefire.plus/search?q=test',
  'https://api.animefire.one/home',
]) {
  test('ANI-W03 permite HTTPS de host exato: ' + url, () => assert.equal(assertAllowedUrl(url, hosts).toString(), url));
}

test('ANI-W04 redirect relativo válido exige modo manual em todos os saltos', async () => {
  const calls = [];
  const result = await fetchWithAllowedRedirects('https://animefire.one/a', {}, hosts, async (url, opts) => {
    calls.push([url, opts.redirect]);
    if (url.endsWith('/a')) return {status:302, headers:{get:()=>'/b'}};
    return {status:200, ok:true, headers:{get:()=>null}};
  });
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [['https://animefire.one/a','manual'],['https://animefire.one/b','manual']]);
});

test('ANI-W05 redirect HTTP para metadata bloqueado antes de novo fetch', async () => {
  const calls = [];
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a', {}, hosts, async url => {
    calls.push(url);
    return {status:302, headers:{get:()=> 'http://169.254.169.254/latest/meta-data/'}};
  }), /política/);
  assert.deepEqual(calls, ['https://animefire.one/a']);
});

test('ANI-W06 redirect HTTPS para host não permitido é bloqueado', async () => {
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a', {}, hosts, async () =>
    ({status:302, headers:{get:()=> 'https://example.org/'}})
  ), /política/);
});

test('ANI-W07 loop não gera redirects ilimitados', async () => {
  let calls = 0;
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a', {}, hosts, async () => {
    calls++;
    return {status:302, headers:{get:()=>'/a'}};
  }), /Limite/);
  assert.equal(calls,4);
});

test('ANI-W08 redirect sem Location gera erro explícito', async () => {
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a', {}, hosts, async () =>
    ({status:301, headers:{get:()=>null}})
  ), /Location/);
});

test('ANI-W09 Edge Function sem IP público embutido e com bearer + redirect:error', () => {
  const fs=require('node:fs');
  const path=require('node:path');
  const code=fs.readFileSync(path.join(__dirname,'../../supabase/functions/animedex/index.ts'),'utf8');
  assert.ok(!code.includes('163.176.133.210'));
  assert.match(code, /BROWSER_SCRAPER_TOKEN/);
  assert.match(code, /workerRequestHeaders\(\)/);
  assert.match(code, /redirect: 'error'/);
});
