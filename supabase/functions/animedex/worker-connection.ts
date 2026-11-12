/** Canal interno Edge -> Worker. Não disponibilizar o token no manifesto/resposta. */
export type WorkerConnection = Readonly<{ baseUrl: string; token: string }>;
export function configureWorker(urlText: string | null | undefined, secret: string | null | undefined): WorkerConnection | null {
  const hasUrl = Boolean(urlText?.trim());
  const hasSecret = Boolean(secret?.trim());
  if (!hasUrl && !hasSecret) return null;
  if (!hasUrl || !hasSecret) throw new Error('BROWSER_SCRAPER_URL e BROWSER_SCRAPER_TOKEN devem ser definidos juntos');
  if (secret !== secret?.trim() || /\s/.test(secret!) || new TextEncoder().encode(secret).length < 32) {
    throw new Error('BROWSER_SCRAPER_TOKEN inválido');
  }
  let url: URL;
  try { url = new URL(urlText!); } catch { throw new Error('BROWSER_SCRAPER_URL inválida'); }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname.toLowerCase());
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && local)) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('BROWSER_SCRAPER_URL exige origin HTTPS ou HTTP em loopback');
  }
  return { baseUrl: url.origin, token: secret! };
}
