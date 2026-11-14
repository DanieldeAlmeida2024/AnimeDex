/** Seleciona a origem do stream pelo contrato de IDs do Stremio legado.
 * IMDb: tt1234567 ou tt1234567:1:2 (temporada e episódio).
 * IDs internos, inclusive com sufixo de episódio, usam AnimeFire.
 */
export type StreamSource = 'imdb' | 'animefire';

const IMDB_STREAM_ID = /^tt[0-9]+(?::[0-9]+:[0-9]+)?$/;

export function selectStreamSource(id: string): StreamSource {
  return IMDB_STREAM_ID.test(id) ? 'imdb' : 'animefire';
}

/** Injeção de adaptadores permite testar o roteamento sem rede, banco ou scraping. */
export function dispatchStream<T>(
  id: string,
  adapters: { imdb: () => Promise<T>; animefire: () => Promise<T> },
): Promise<T> {
  return adapters[selectStreamSource(id)]();
}
