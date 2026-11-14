const { createHash, timingSafeEqual } = require('node:crypto');

/**
 * Autenticação simples entre Edge Function e worker privado.
 * Retorna código HTTP; não emite, registra nem persiste segredos.
 */
function verificarTokenWorker(cabecalho, segredo) {
  if (typeof segredo !== 'string' || segredo.length < 32) return 503;
  if (typeof cabecalho !== 'string' || !cabecalho.startsWith('Bearer ')) return 401;
  const token = cabecalho.slice('Bearer '.length);
  if (token.length < 32) return 401;
  const esperado = createHash('sha256').update(segredo).digest();
  const recebido = createHash('sha256').update(token).digest();
  return timingSafeEqual(esperado, recebido) ? 200 : 401;
}

module.exports = { verificarTokenWorker };
