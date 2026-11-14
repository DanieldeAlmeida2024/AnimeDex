const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verificarTokenWorker } = require('../security/worker-token.cjs');
const segredo = 'segredo_sintetico_de_teste_com_mais_de_32_caracteres';

test('sem segredo configurado, worker falha fechado', () => {
  assert.equal(verificarTokenWorker(undefined, ''), 503);
  assert.equal(verificarTokenWorker('Bearer 123', 'abc'), 503);
});
test('sem autorização ou credencial incorreta, worker retorna 401', () => {
  assert.equal(verificarTokenWorker(undefined, segredo), 401);
  assert.equal(verificarTokenWorker('Basic ' + segredo, segredo), 401);
  assert.equal(verificarTokenWorker('Bearer ' + 'x'.repeat(48), segredo), 401);
});
test('a chave exata é autorizada', () => {
  assert.equal(verificarTokenWorker('Bearer ' + segredo, segredo), 200);
});
