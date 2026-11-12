# AnimeDex — contrato de segurança do scraper-worker

> **ANI-WRK v2.0.0 — PROPOSTA, NÃO PUBLICADA** · 11/11/2026 · branch empilhada sobre o PR #20.

## Superfície anterior

O worker Express permitia `GET /render` e `GET /api/*` sem autenticação, com mapeamento Docker `8787:8787` e runbook propondo exposição da porta. O fetch HTML e requisições do Chromium poderiam seguir redirecionamentos externos sem validação de cada destino. A Edge Function continha uma URL HTTP de IP público como fallback.

## Contratos novos

| Componente | Invariante |
|---|---|
| Express | `GET /health` responde sem bearer com dados mínimos; demais rotas exigem `Authorization: Bearer <token>` e retornam 401 caso inválido |
| Secret | `SCRAPER_WORKER_TOKEN` obrigatório no startup, mínimo de 32 bytes, comparação em tempo constante |
| URL/render | `https:`, hostname exato do allowlist, porta padrão, sem userinfo; no máximo 3 redirects, todos validados antes do próximo fetch |
| Puppeteer | Intercepta/aborta requisições de rede fora do allowlist nas renderizações e na captura da home |
| Compose | Bind da porta TCP 8787 restrito ao loopback do host |
| Deno/Supabase | Não tem IP hardcoded; `BROWSER_SCRAPER_TOKEN` enviado como bearer ao worker. Aceita worker externo somente por HTTPS e `redirect: error` |
| Operação | Migração staged com par de secrets, proxy TLS e possibilidade de rollback sem HTTP público |

## Limitações que continuam abertas

A checagem de host **não garante proteção integral contra SSRF** sem DNS/egress confiáveis; DNS rebinding, redirecionamentos em camadas não interceptadas e acesso à rede pelo Chromium precisam de teste específico. A imagem do worker ainda executa Chrome com `--no-sandbox` (risco P0 operacional). Não há rate limiting e quotas de renderização no servidor; existe risco de consumo excessivo de recursos mesmo com token comprometido. Auth não substitui proteção contra vazamento de tokens em trânsito, nem a revisão de dependências `npm audit`. Nenhum navegador, VM ou cloud deploy foi testado por este documento.

## Compatibilidade

Esta alteração é **breaking**: clientes legados sem token recebem 401, e a URL de worker ausente deixa de usar IP público implicitamente. Enquanto o worker estiver indisponível, a Edge ainda pode tentar fallback para API direta em alguns endpoints, conforme `proxy()`; o catálogo home depende do worker. Não liberar o PR até integrar consumidor e serviço juntos e verificar os 401/200 em staging. O código de scraping e a legalidade das fontes de mídia não são validados por esta mudança.

## Grafo de dependências (ANI-DEPS v2.0.1 proposta)

O baseline do npm no worker mostrou 14 findings (12 altos, 2 moderados) e foi criado um commit isolado de atualização para `puppeteer@25.17.0` e lockfile. O teste de preparação [#43126336020](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43126336020) registrou 21 testes PASS e **zero findings** no runtime worker. A imagem passou a instalar dependências de forma determinística com `npm ci`. A triagem e os riscos residuais estão em [AUDITORIA_DEPENDENCIAS_WORKER.md](../seguranca/AUDITORIA_DEPENDENCIAS_WORKER.md). A atualização major Puppeteer não elimina a necessidade de testar Chromium real, sandbox/egress e compatibilidade de páginas. Os 33 findings da raiz do projeto são uma investigação separada.
