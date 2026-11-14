const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const worker = readFileSync(join(root, 'server.js'), 'utf8');
const edge = readFileSync(join(root, '..', 'supabase/functions/animedex/index.ts'), 'utf8');

test('ANX-S01: worker checks authorization before dynamic routes', () => {
  assert.ok(worker.includes("require('./security/worker-token.cjs')"));
  assert.ok(worker.includes("verificarTokenWorker(req.get('authorization'), process.env.WORKER_API_TOKEN)"));
  assert.ok(worker.indexOf('app.use((req, res, next) =>') < worker.indexOf("app.get('/api/catalog'"));
  assert.ok(worker.indexOf('app.use((req, res, next) =>') < worker.indexOf("app.get('/render'"));
});

test('ANX-S02: worker default network bind is loopback', () => {
  assert.ok(worker.includes("process.env.BIND_HOST || '127.0.0.1'"));
  assert.ok(worker.includes('app.listen(port, bindHost,'));
});

test('ANX-S03: direct fetch rejects cross-origin redirects', () => {
  assert.ok(worker.includes("redirect: 'error'"));
  assert.ok(!worker.includes("redirect: 'follow'"));
});

test('ANX-S04: Edge never uses literal public HTTP address and sends bearer token', () => {
  assert.ok(!edge.includes('http://163.176.133.210:8787'));
  assert.ok(edge.includes("Deno.env.get('WORKER_API_TOKEN')"));
  assert.ok(edge.includes("workerUrl.protocol !== 'https:'"));
  assert.ok(edge.includes('redirect: \'error\''));
  assert.ok(edge.includes('Authorization: `Bearer ${WORKER_API_TOKEN}`'));
});

test('ANX-S05: dynamic manifest uses authenticated proxy', () => {
  assert.ok(edge.includes("await proxy<{ data?: Array<{ id: string; name: string; type: MediaType }> }>('/api/home/catalogs')"));
  assert.ok(!edge.includes("fetch(`${PROXY}/api/home/catalogs`"));
});
