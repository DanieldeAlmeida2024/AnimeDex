# AnimeDex — plano de testes e regressão

> **ANI-DOC v1.0.0** · 11/11/2026 · base analisada `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c` · revisão estática.


## Inventário
A documentação estrutural existente está em `tests/test_documentacao.py`; não foi encontrada nesta revisão uma suíte funcional completa do SDK Stremio. Os testes abaixo são **plano**, não relatório de execução.

| ID | Prioridade | Entrada / cenário | Resultado esperado |
|---|---|---|---|
| ANI-T01 | P0 | Obter manifesto do addon | ID, version, resources e catalogs válidos |
| ANI-T02 | P0 | `catalog` top/dublado/legendado/atualizados | `{metas:[]}` ou lista de metas válidas |
| ANI-T03 | P1 | `skip=0,20,40` | Páginas coerentes sem duplicata inesperada |
| ANI-T04 | P0 | Busca com `extra.search` | Termo passado corretamente ao scraper |
| ANI-T05 | P0 | Meta interna Stremio | DTO compatível com manifest |
| ANI-T06 | P0 | IMDb `tt1234567` | Adaptador IMDb selecionado; ID interno não encaminhado para IMDb |
| ANI-T07 | P0 | IMDb episódio `tt123:1:2` | Adaptador IMDb selecionado; ID interno `anime123:2:7` usa AnimeFire; erro do adaptador propagado |
| ANI-T08 | P1 | AniList indisponível | Fallback previsível e sem loop |
| ANI-T09 | P1 | TMDB sem resultado | Resultado vazio/erro controlado, sem dados falsos |
| ANI-T10 | P0 | Inserir metadado existente | Chaves únicas respeitadas em SQLite |
| ANI-T11 | P1 | Scraper HTML alterado | Retorno degrada com mensagem segura |
| ANI-T12 | P1 | `dev.db` sujo / migrations | Schema inicializável em banco descartável |
| ANI-T13 | P0 | Dados malformados vindos do provedor | Sem injeção HTML ou crash do addon |
| ANI-T14 | P1 | Build TypeScript | `npm run build` conforme package.json após conferir script |

## Preparação
Usar uma cópia descartável do banco SQLite e stubs de AniList/TMDB/scraper. Não testar automaticamente fornecedores com excesso de requisições nem baixar conteúdo protegido. Registrar versão do SDK e commit, URL de contrato local e resultado observado.

## Execução delimitada — ANI-SR v1.1.0 (proposta)

`tests/stream-routing.test.cjs` contém 16 casos determinísticos do contrato de IDs, dispatch dos adaptadores e propagação de falha. O teste isolado foi executado localmente com TypeScript 5.8.3, Node.js 22.16.0 e `tsc --target es2020 --module commonjs --strict --rootDir src --outDir dist src/utils/stream-routing.ts`: **16/16 PASS** em 11/11/2026. Isso NÃO equivale ao build total do projeto nem testa scraping/Prisma/SDK.

O workflow `.github/workflows/legacy-routing-ci.yml` acrescenta `npm ci`, `npx prisma generate`, `npm run build`, 16 testes e testes documentais em pull request. Estado do workflow: **pendente de execução/validação no GitHub** até obter o run no SHA exato. Não publicar nem mesclar sem revisar logs e check runs. O caminho Supabase/Deno, os provedores externos e os cenários de segurança ANI-T08..T13 continuam pendentes de E2E e não são cobertos pelo teste unitário.

### CI de compilação — bloqueio transitivo registrado em 11/11/2026

A execução do workflow no commit `2b361fbb` falhou em `npm run build` com **TS7016** dentro de `node_modules/parse5/dist/tokenizer/index.d.ts`, na importação `entities/decode`. Foi ajustado `tsconfig.json` para `skipLibCheck: true`, mantendo `strict: true` e sem suprimir a checagem de fontes `src/`. A correção depende de nova execução do GitHub Actions no SHA atualizado; **não declarar build verde antes da confirmação**.

O `npm ci` reportou **33 vulnerabilidades** no conjunto completo de dependências (3 baixas, 5 moderadas, 22 altas, 3 críticas). Isso não mede exposição explorável em produção; exige triagem separada por dependência, dependências de desenvolvimento vs. runtime, e análise do caminho Supabase/worker. Não executar automaticamente `npm audit fix --force` nem aceitar riscos sem justificação.

## ANI-WRK v2.0.0 — suíte de segurança do worker (PR em preparação)

| IDs | Natureza | Verificações |
|---|---|---|
| ANI-W01 | Unitário | Bearer forte e exato; tokens alterados/incorretos recusados |
| ANI-W02 | Unitário | `http`, localhost, metadata IP, porta extra, URL com userinfo, hostname falso e IPv6 recusados |
| ANI-W03 | Unitário | URLs HTTPS em allowlist estrita permitidas |
| ANI-W04 | Unitário | Redirecionamento relativo com `redirect: manual` |
| ANI-W05..W06 | Unitário | Redirects para metadata IP e hosts externos bloqueados antes do segundo fetch |
| ANI-W07..W08 | Unitário | Loop ou Location ausente provocam erro explícito |
| ANI-W09 | Estático | Edge Function sem IP de fallback e com token e `redirect: error` |
| ANI-W10 | HTTP local | Health 200 sem token, stats/render 401, stats 200 com token, token errado 401 |

**Evidência inicial:** CI [#43125363802](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43125363802) no commit `ac8b87c14f42`, com `npm ci --prefix scraper-worker`, checagem de sintaxe e **21/21 testes PASS**. Este resultado é do commit anterior à documentação e exige CI novamente no SHA final do PR.

**Auditoria runtime do worker:** `npm audit --prefix scraper-worker --omit=dev` no mesmo run registrou **14 alertas (2 moderados, 12 altos, 0 críticos)**. Separar dos 33 alertas da raiz do addon legado; não significa correção nem exposição comprovada. Evidência JSON no artifact `worker-npm-audit` (retenção 7 dias). 

**Pendentes:** regressão funcional HTTPS Supabase-worker, egress/DNS, rate-limit, hardening Chromium sandbox, revisão das dependências, integração com proxy TLS e teste remoto autorizado. O workflow não visita fornecedores reais nem consome conteúdo licenciado. Sem deploy.

## ANI-DEPS v2.0.1 — validação de dependências corrigidas

| ID | Cenário | Exigência |
|---|---|---|
| ANI-W11 | `npm ci --prefix scraper-worker` após atualização do lock | Instalável sem inconsistência de versões |
| ANI-W12 | `npm audit --prefix scraper-worker --omit=dev --json` | Zero vulnerabilidades reportadas; CI deve falhar se o inventário não puder ser gerado |
| ANI-W13 | `node --test scraper-worker/test/*.test.cjs` com Puppeteer 25.17.0 instalado | 21 regressões de policy/HTTP passam |
| ANI-W14 | Navegação Chromium real em container seguro (staging) | Ainda pendente; não é testada pelo CI |
| ANI-W15 | Edge Function HTTPS + Bearer contra worker real | Ainda pendente; sem deploy automático |

[Detalhamento da auditoria e correções](../seguranca/AUDITORIA_DEPENDENCIAS_WORKER.md). No run de preparação [#43126336020](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43126336020) houve **21/21 PASS e 0 alertas npm do runtime do worker**. Exigir nova evidência no SHA final após o PR. Os 33 alertas da raiz continuam em triagem.
