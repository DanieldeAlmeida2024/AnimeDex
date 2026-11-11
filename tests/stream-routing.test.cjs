const test = require('node:test');
const assert = require('node:assert/strict');
const { selectStreamSource, dispatchStream } = require('../dist/utils/stream-routing.js');

const cases = [
  ['tt1234567', 'imdb'],
  ['tt1234567:1:2', 'imdb'],
  ['tt1234567:0:0', 'imdb'],
  ['tt9:100:999', 'imdb'],
  ['animefire-abc', 'animefire'],
  ['animefire-abc:1:2', 'animefire'],
  ['tt1234567:1', 'animefire'],
  ['tt1234567:1:2:3', 'animefire'],
  ['tt1234567:one:two', 'animefire'],
  ['TT1234567', 'animefire'],
  ['https://animefire.one/anime/slug', 'animefire'],
  ['', 'animefire'],
];

for (const [id, expected] of cases) {
  test(`ANI-T06/07 seleciona ${expected} para ${JSON.stringify(id)}`, () => {
    assert.equal(selectStreamSource(id), expected);
  });
}

test('ANI-T06 — encaminha IMDb isolado somente ao adaptador IMDb', async () => {
  const calls = [];
  const result = await dispatchStream('tt1234567', {
    imdb: async () => { calls.push('imdb'); return { streams: ['imdb'] }; },
    animefire: async () => { calls.push('animefire'); return { streams: ['animefire'] }; },
  });
  assert.deepEqual(calls, ['imdb']);
  assert.deepEqual(result, { streams: ['imdb'] });
});

test('ANI-T07 — encaminha episódio IMDb somente ao adaptador IMDb', async () => {
  const calls = [];
  await dispatchStream('tt1234567:1:2', {
    imdb: async () => { calls.push('imdb'); return { streams: [] }; },
    animefire: async () => { calls.push('animefire'); return { streams: [] }; },
  });
  assert.deepEqual(calls, ['imdb']);
});

test('ANI-T07 — preserva roteamento AnimeFire para ID interno com episódio', async () => {
  const calls = [];
  await dispatchStream('anime123:2:7', {
    imdb: async () => { calls.push('imdb'); return { streams: [] }; },
    animefire: async () => { calls.push('animefire'); return { streams: [] }; },
  });
  assert.deepEqual(calls, ['animefire']);
});

test('ANI-T07 — propaga falha do adaptador selecionado, sem fallback silencioso', async () => {
  await assert.rejects(
    dispatchStream('tt123', {
      imdb: async () => { throw new Error('imdb indisponível'); },
      animefire: async () => ({ streams: [] }),
    }),
    /imdb indisponível/,
  );
});
