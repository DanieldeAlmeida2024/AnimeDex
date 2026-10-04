# AnimeDex leve para Supabase

Esta adaptação substitui o processo Node.js/Prisma por:

- **Supabase Edge Function** em Deno;
- **Postgres do Supabase** para cache de animes e episódios;
- `fetch` nativo e parsing textual pequeno para o caminho leve;
- fallback opcional para o `scraper-worker`, mantendo Cheerio/Puppeteer nas páginas que exigem DOM renderizado;
- respostas compatíveis com `manifest`, `catalog`, `meta` e `stream` do Stremio.
- cache persistente dos metadados, episódios e links HLS em `public.animes` e `public.episodes`.

## Estrutura

```text
supabase/
├── config.toml
├── functions/animedex/config.ts
├── functions/animedex/index.ts
└── migrations/20261003193000_animedex.sql
```

## Variáveis da Edge Function

Configure no projeto Supabase:

```bash
supabase secrets set \
  ANIMEFIRE_BASE_URL=https://animefire.one \
  MAX_CATALOG_ITEMS=20
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas automaticamente pela plataforma em Edge Functions. A service role key fica exclusivamente no servidor; nunca a coloque no firmware do ESP32 nem no cliente Stremio.

## Páginas dinâmicas: Cheerio e Puppeteer

O caminho original com Cheerio e Puppeteer **não foi removido**. Ele continua no código legado `src/` e foi encapsulado em [`../scraper-worker/`](../scraper-worker/). Puppeteer não deve rodar dentro de uma Supabase Edge Function, então o worker executa em uma VPS/container separado.

```bash
cd scraper-worker
npm install
ANIMEFIRE_BASE_URL=https://animefire.one PORT=8787 npm start
```

Depois configure a URL acessível pela Edge Function:

```bash
supabase secrets set BROWSER_SCRAPER_URL=https://SEU-WORKER.example.com
```

Quando `BROWSER_SCRAPER_URL` está configurado, a função tenta Puppeteer/Cheerio primeiro para páginas AnimeFire e usa `fetch` direto como fallback.

## Deploy

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy animedex --no-verify-jwt
```

A URL para instalar no Stremio será:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/animedex/manifest.json
```

## Catálogo próprio e personalização

O manifesto declara `extra.search`, portanto o Stremio pode enviar consultas para este addon. A busca é **exclusiva do AnimeDex**: a Edge Function transforma o termo em uma consulta para a rota de pesquisa da fonte configurada e retorna somente os títulos encontrados nessa fonte. Ela não consulta nem agrega títulos de outros addons instalados no Stremio. Os catálogos continuam limitados aos IDs definidos em `functions/animedex/config.ts`.

Para adicionar, remover ou renomear catálogos, edite apenas `functions/animedex/config.ts`, alterando `configuredCatalogs`. A configuração também permite mudar `ADDON_ID`, `ADDON_NAME`, `ADDON_VERSION`, limites e domínio via secrets/env.

## Rotas implementadas

- `GET /manifest.json`
- `GET /catalog/{type}/{catalogId}.json?search=...&skip=...`
- `GET /meta/{type}/{id}.json`
- `GET /stream/{type}/{id}.json`

## Limitações conscientes

O parser leve depende da estrutura atual do AnimeFire e pode precisar de ajuste se o HTML mudar. Para páginas que exigem JavaScript ou seletores complexos, use o worker Puppeteer/Cheerio. A função limita o catálogo a 20 itens por chamada e o stream a 5 links.

O backend devolve a URL do stream ao Stremio; ele não retransmite o vídeo. Os links HLS são armazenados como cache operacional e podem expirar na origem; nesse caso, é necessário invalidar ou atualizar o registro.

## Cache de episódios e streams

Quando o Stremio consulta os metadados, a função grava o anime e seus episódios no Postgres. Quando solicita um stream, a função primeiro procura o episódio pelo endpoint `https://api.animefire.one/episode/{id}` salvo em `episodes.episode_url`. Se `episodes.streams` já estiver preenchido, os links HLS são devolvidos diretamente do banco, sem nova consulta à fonte. Caso contrário, a API é consultada uma vez e os streams retornados são gravados para as próximas reproduções.

O cache é feito exclusivamente no servidor com `SUPABASE_SERVICE_ROLE_KEY`; essa chave nunca é enviada ao Stremio, à VM ou ao ESP32.

## Verificação local

```bash
supabase start
supabase db reset
supabase functions serve animedex --no-verify-jwt
curl http://127.0.0.1:54321/functions/v1/animedex/manifest.json
```

## Segurança

A função está pública porque o Stremio precisa conseguir chamá-la sem login. Para produção, considere uma camada adicional de controle de abuso, como rate limit, cache, domínio próprio ou token de instalação. A service role key só deve existir nos secrets da Edge Function.
