# AnimeDex Browser Scraper Worker

Worker opcional para páginas que só funcionam corretamente com DOM renderizado ou exigem um navegador real.

Ele mantém as dependências do fluxo original:

- **Puppeteer** para JavaScript, redirecionamentos e DOM renderizado;
- **Cheerio** para normalizar o HTML renderizado;
- Express para expor uma API interna pequena.

## Execução

```bash
cd scraper-worker
npm install
ANIMEFIRE_BASE_URL=https://animefire.plus PORT=8787 npm start
```

Endpoint:

```text
GET /health
GET /render?url=https%3A%2F%2Fanimefire.plus%2F...
```

## Ligação com a Edge Function

Publique o worker em uma rede privada/VPS/container que a Edge Function consiga acessar e configure:

```bash
supabase secrets set BROWSER_SCRAPER_URL=https://SEU-WORKER.example.com
```

A Edge Function tenta primeiro o Puppeteer quando `BROWSER_SCRAPER_URL` está configurado. Se o worker estiver indisponível, faz fallback para `fetch` direto e mantém o comportamento leve.

## Segurança

- O worker aceita apenas o hostname de `ANIMEFIRE_BASE_URL`.
- Não exponha esse endpoint sem autenticação ou rate limit em produção.
- Use HTTPS, firewall/rede privada e um token interno se o worker ficar público.
- O worker não deve receber URLs arbitrárias de usuários.
- Puppeteer não deve ser executado dentro da Edge Function Supabase; ele fica neste processo separado por causa das limitações do runtime Edge.
