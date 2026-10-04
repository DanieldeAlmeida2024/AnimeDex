# AnimeDex

Addon para o Stremio com catálogo e streams de animes. A implantação recomendada agora usa **Supabase Edge Functions + Supabase Postgres**, sem Node.js, Prisma, SQLite ou Cheerio no caminho de produção.

## Arquitetura atual

```text
Stremio
  │ HTTPS
  ▼
Supabase Edge Function (Deno)
  ├── manifest / catalog / meta / stream
  ├── scraping leve via fetch
  ├── fallback opcional para Browser Scraper
  ├── AniList + TMDB para metadados opcionais
  ├── AnimeFire para streams diretos
  ├── Nyaa/DarkMahou + Real-Debrid opcionais
  └── Supabase Postgres para cache
```

A implementação oficial está em [`supabase/`](./supabase/). O código legado Node/Prisma em `src/` e `dist/` permanece no repositório para referência e migração gradual, mas não é necessário para o deploy Supabase. A busca do addon é própria: o Stremio pode enviar uma consulta ao AnimeDex, e a função pesquisa somente a fonte/catalogo do AnimeDex.

Quando a página depende de JavaScript, DOM renderizado ou seletores complexos, o projeto **mantém o caminho Cheerio/Puppeteer**. Esse caminho roda no [`scraper-worker/`](./scraper-worker/) como processo separado, porque Puppeteer não pode ser executado dentro de uma Supabase Edge Function. A Edge Function chama o worker quando `BROWSER_SCRAPER_URL` está configurado e volta para `fetch` direto se ele estiver indisponível.

## Funcionalidades da versão Supabase

- Manifesto compatível com Stremio.
- Catálogos Top, Dublados, Atualizados e Legendados.
- Catálogo próprio fechado e personalizável.
- Busca do Stremio limitada aos títulos disponíveis na fonte do AnimeDex.
- Metadados e episódios raspados sob demanda.
- Cache de animes e episódios no Postgres.
- Enriquecimento opcional com AniList/TMDB.
- Streams diretos do AnimeFire.
- Fallback opcional para Nyaa/DarkMahou através do Real-Debrid.
- Limite de catálogo, limite de streams, timeout e validação de hostname.

## Pré-requisitos

- Conta e projeto no [Supabase](https://supabase.com/).
- [Supabase CLI](https://supabase.com/docs/guides/cli).
- Um projeto Stremio na mesma rede ou acesso à internet — a função publicada usa HTTPS público.

## Deploy no Supabase

Na raiz do repositório:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Configure os secrets mínimos:

```bash
supabase secrets set \
  ANIMEFIRE_BASE_URL=https://animefire.plus \
  MAX_CATALOG_ITEMS=20 \
  MAX_STREAMS=5 \
  HTTP_TIMEOUT_MS=12000
```

Para metadados enriquecidos:

```bash
supabase secrets set TMDB_API_KEY=SEU_TOKEN_TMDB
```

Para fallback opcional de torrents:

```bash
supabase secrets set REAL_DEBRID_API_TOKEN=SEU_TOKEN_REAL_DEBRID
```

Para manter o scraping com navegador nas páginas dinâmicas:

```bash
cd scraper-worker
npm install
ANIMEFIRE_BASE_URL=https://animefire.plus PORT=8787 npm start
```

Em outra sessão, configure a URL acessível pela Edge Function:

```bash
supabase secrets set BROWSER_SCRAPER_URL=https://SEU-WORKER.example.com
```

O worker também possui [`Dockerfile`](./scraper-worker/Dockerfile) para execução em VPS/container.

Para Oracle Cloud, consulte o guia [`scraper-worker/ORACLE-CLOUD.md`](./scraper-worker/ORACLE-CLOUD.md), que inclui Docker Compose, Caddy/HTTPS, DNS, firewall e conexão com o Supabase.

Publique a função:

```bash
npm run supabase:deploy
# equivalente a:
# supabase functions deploy animedex --no-verify-jwt
```

Instale o addon no Stremio usando:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/animedex/manifest.json
```

## Rotas implementadas

- `GET /manifest.json`
- `GET /catalog/{type}/{catalogId}.json?search=...&skip=...`
- `GET /meta/{type}/{id}.json`
- `GET /stream/{type}/{id}.json`

## Desenvolvimento local

```bash
supabase start
npm run supabase:serve
curl http://127.0.0.1:54321/functions/v1/animedex/manifest.json
```

A migração está em [`supabase/migrations/20261003193000_animedex.sql`](./supabase/migrations/20261003193000_animedex.sql), e a função em [`supabase/functions/animedex/index.ts`](./supabase/functions/animedex/index.ts).

## Variáveis da função

| Variável | Obrigatória | Função |
|---|---:|---|
| `SUPABASE_URL` | Automática | URL interna do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Automática | Escrita do cache pelo servidor; nunca expor ao cliente |
| `ANIMEFIRE_BASE_URL` | Não | Domínio da fonte AnimeFire |
| `TMDB_API_KEY` | Não | Metadados, imagens e descrições enriquecidas |
| `REAL_DEBRID_API_TOKEN` | Não | Fallback de torrent para link direto |
| `BROWSER_SCRAPER_URL` | Não | Worker Puppeteer/Cheerio para páginas dinâmicas |
| `MAX_CATALOG_ITEMS` | Não | Limite por catálogo; padrão 20 |
| `MAX_STREAMS` | Não | Limite de streams; padrão 5 |
| `HTTP_TIMEOUT_MS` | Não | Timeout das fontes HTML/API; padrão 12 s |
| `RD_TIMEOUT_MS` | Não | Timeout do processamento Real-Debrid; padrão 35 s |

A service role key deve permanecer somente nos secrets da Edge Function. Nunca a coloque no firmware de um ESP32 ou no manifesto do Stremio.

## Limitações e operação

- O parser não usa um parser HTML completo para manter a função leve; mudanças no HTML da fonte podem exigir ajuste nos seletores/regex.
- A função retorna URLs de mídia ao Stremio e não retransmite o vídeo.
- Links de Real-Debrid podem expirar e são resolvidos sob demanda.
- A função pública deve receber rate limiting/caching adicional se for disponibilizada para muitos usuários.
- O serviço deve ser utilizado apenas com fontes, conteúdo e links cuja distribuição seja autorizada.

## Código legado

O fluxo original Node/Prisma ainda está disponível em `src/` para referência. Ele exige `npm install`, Prisma Client e um banco SQLite, mas não faz parte do caminho recomendado para produção Supabase.

## Comandos úteis

```bash
npm run supabase:serve
npm run supabase:db:push
npm run supabase:deploy
npm run build             # legado Node/TypeScript
npm run prisma:generate   # legado Prisma
```

## Autor

[Daniel de Almeida](https://github.com/DanieldeAlmeida2024)
