# Matriz de testes ANI-SEC-W v0.1.0 (proposta)

| ID | Teste automatizado | Resultado esperado |
|---|---|---|
| W01 | Token fraco ou ausente | Startup bloqueado |
| W02 | Bearer correto | Middleware libera rota |
| W03 | Bearer errado, ausente ou malformado | HTTP 401 |
| W04–W05 | URL autorizada e URLs maliciosas | Somente hosts HTTPS permitidos |
| W06–W08 | Redirect privado, redirect seguro e loop | Bloqueio do privado, limite de 3 |
| E01–E08 | Par Edge URL/token e validação HTTPS | Falha fechada em config incompleta ou insegura |

Automação proposta: `node --test scraper-worker/test/security.test.cjs`, `deno check supabase/functions/animedex/index.ts` e `deno test supabase/functions/animedex/worker-connection_test.ts`. **Não declarar PASS antes de checar os logs do Actions no SHA do PR.**

### Pendente — exige ambiente de teste real
- I01: Edge Supabase → HTTPS → worker, 200 autorizado e 401 não autorizado.
- I02: Puppeteer com CDN real, redirects, scripts de terceiros e limite de recursos.
- I03: ausência de 8787 público, token não logado, proxy com rate limit e validação DNS/egress.
- I04: compatibilidade de manifesto, busca, catálogo, metadata, streams e queda do worker.
