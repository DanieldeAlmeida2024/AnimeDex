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
ANIMEFIRE_BASE_URL=https://animefire.one PORT=8787 CACHE_TTL_MS=1800000 npm start
```

Endpoint:

```text
GET /health
GET /api/cache/stats
GET /render?url=https%3A%2F%2Fanimefire.one%2F...
```

## Cache temporário

O worker mantém em memória, por padrão durante **30 minutos**, as respostas de:

- catálogos e paginação;
- buscas;
- detalhes de animes e filmes;
- detalhes de episódios e streams;
- carrosséis da página inicial;
- HTML de páginas renderizadas pelo Puppeteer.

O cache é por processo: ele é limpo quando o container é reiniciado. Solicitações
iguais feitas simultaneamente compartilham a mesma promessa, evitando scrapers
duplicados quando o Stremio dispara várias requisições ao mesmo tempo.

As opções podem ser alteradas no `.env` ou no `docker-compose.yml`:

```dotenv
CACHE_TTL_MS=1800000
CACHE_MAX_ENTRIES=500
```

Após o TTL, a próxima solicitação daquela URL/consulta atualiza o valor no
servidor. O endpoint `/health` informa o TTL e a quantidade de entradas atuais;
`/api/cache/stats` informa também o limite configurado.

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

## Execução protegida (padrão atual)

A execução sem `WORKER_API_TOKEN` não fornece endpoints operacionais. Para laboratório local, copie `.env.example` para `.env`, configure um segredo forte de **32+ caracteres** e use:

```bash
cd scraper-worker
cp .env.example .env
# Edite o token no .env local, sem versioná-lo:
docker compose config
docker compose up --build -d
curl --fail http://127.0.0.1:8787/health
```

`/health` é liberado somente para sondagem; `/api/*`, `/render` e estatísticas do cache exigem `Authorization: Bearer <token>`. A publicação Docker da porta é restrita ao loopback do host, não serve tráfego público. Para acesso remoto da Edge Function, instale proxy HTTPS que encaminhe ao loopback, **sem expor 8787 em Security Lists, firewall ou roteadores**.

Configure `BROWSER_SCRAPER_URL` e o mesmo `WORKER_API_TOKEN` nos secrets da Edge Function. O código recusa URL remota não HTTPS e não segue redirecionamentos na requisição direta de HTML. Chromium/Puppeteer e redirecionamentos de navegador ainda exigem auditoria de isolamento antes de exposição pública.

O procedimento de `npm start` fora de Docker requer as mesmas variáveis de ambiente. O exemplo antigo sem token é apenas histórico e não ativa o worker atual.
