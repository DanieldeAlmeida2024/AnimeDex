# AnimeDex — catálogo de animes para Stremio

Addon de catálogo para Stremio com **Supabase Edge Functions (Deno)**, armazenamento no PostgreSQL e worker opcional para páginas que exigem processamento no navegador.

O projeto inclui rotas `manifest`, `catalog`, `meta` e `stream`, integração de metadados e cache. A disponibilidade das fontes externas depende de seus serviços, termos e autorizações.

**Condições de uso:** o worker opcional precisa de autenticação e HTTPS antes de qualquer exposição remota. Utilize apenas fontes de conteúdo cuja distribuição e consulta sejam autorizadas.

[Arquitetura](docs/ARQUITETURA.md) · [Requisitos](docs/REQUISITOS.md) · [UML](docs/UML.puml) · [Plano de testes](docs/PLANO_TESTES.md).

## Arquitetura do addon

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

A implementação oficial está em [`supabase/`](./supabase/). O código Node/Prisma em `src/` e `dist/` permanece no repositório para referência e migração gradual, mas não é necessário para o deploy Supabase. A busca do addon é própria: o Stremio pode enviar uma consulta ao AnimeDex, e a função pesquisa somente a fonte/catalogo do AnimeDex.

Quando a página depende de JavaScript, DOM renderizado ou seletores complexos, o projeto **mantém o caminho Cheerio/Puppeteer**. Esse caminho roda no [`scraper-worker/`](./scraper-worker/) como processo separado, porque Puppeteer não pode ser executado dentro de uma Supabase Edge Function. A Edge Function chama o worker quando `BROWSER_SCRAPER_URL` está configurado e volta para `fetch` direto se ele estiver indisponível.

## Funcionalidades da integração Supabase

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
  ANIMEFIRE_BASE_URL=https://animefire.one \
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
ANIMEFIRE_BASE_URL=https://animefire.one PORT=8787 npm start
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
- O serviço deve ser utilizado apenas com fontes, conteúdo e links cuja distribuição seja autorizada; componentes remotos exigem proteção do canal e controle de acesso.

## Módulos Node/Prisma de referência

O fluxo Node/Prisma está disponível em `src/` para referência. Ele exige `npm install`, Prisma Client e um banco SQLite, mas não faz parte do caminho recomendado para produção Supabase.

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

## Proteção entre a Edge Function e o Browser Scraper

O worker não deve receber chamadas HTTP públicas sem autenticação. Esta revisão remove o endereço HTTP/IP fixo da Edge Function e passa a exigir duas variáveis privadas: `BROWSER_SCRAPER_URL` (HTTPS válido em ambiente remoto) e `WORKER_API_TOKEN` (segredo compartilhado aleatório com pelo menos 32 caracteres). A Edge Function envia o token no header `Authorization: Bearer` ao consultar o worker; inclusive o manifesto usa o proxy autenticado.

`scraper-worker/docker-compose.yml` expõe **somente `127.0.0.1:8787`** no host e exige o segredo no ambiente. A API rejeita acesso sem chave. Não coloque `WORKER_API_TOKEN` em JavaScript enviado ao navegador, nas URLs, nem em commits Git.

**Mudança incompatível intencional:** um worker anteriormente acessível por HTTP na porta 8787 deixará de ser utilizado pela Edge Function até haver proxy HTTPS e token configurados em ambas as pontas. Não libere a porta pública para contornar o bloqueio.

[Instruções de configuração e teste protegido](scraper-worker/ORACLE-CLOUD.md) · [Contrato de segurança](docs/seguranca/WORKER_EDGE_AUTH.md) · [Testes](docs/testes/WORKER_EDGE.md). Essa alteração não foi implantada na VM nem no Supabase.

## Manutenção do adaptador Node legado — seleção de streams

O código legado Node/Prisma agora distingue IDs IMDb de filme (`tt1234567`) e episódio (`tt1234567:1:2`) de identificadores próprios AnimeFire. Execute `npm ci && npx prisma generate && npm run build && node --test tests/stream-routing.test.cjs`. O pipeline `legacy-routing-ci.yml` verifica o build e **16 testes de seleção**, não provedores externos, conteúdo de mídia ou infraestrutura Supabase.
