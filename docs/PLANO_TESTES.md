# Plano de testes

1. Documento: rodar `python -m unittest discover -s tests -p test_documentacao.py -v`.
2. Build/fluxo da stack: `Validar manifest/catalog/meta/stream em ambiente de teste.`.
3. Casos negativos: entradas invalidas e serviços indisponíveis.
4. Integração: verificar serviços externos conforme configuração real.
5. Segurança: ausência de senhas e dados sensíveis no versionamento.

Somente o item 1 é abrangido pelo teste documental incluído. Não considerar fontes de streaming e scraping garantidas; respeitar direitos autorais e termos das fontes.

## ANX-SEC 1.1.0 — segurança do worker e Edge Function

| ID | Cenário | Esperado |
| --- | --- | --- |
| ANX-S01 | Sem segredo de worker | HTTP 503 para operações |
| ANX-S02 | Bearer ausente ou inválido | HTTP 401, sem scraping |
| ANX-S03 | Bearer forte e correto | Função de autenticação permite request |
| ANX-S04 | Rotas Express protegidas antes do handler | Nenhuma `/api/*` ou `/render` sem middleware |
| ANX-S05 | Edge sem worker/token | Falha fechada para worker, fallback de API apenas onde previsto |
| ANX-S06 | URL de worker remota em HTTP | Recusada antes de `fetch` |
| ANX-S07 | Manifesto de catálogo dinâmico | Usa proxy autenticado, não `fetch` sem chave |
| ANX-S08 | Docker Compose | Porta host `127.0.0.1:8787`, segredo injetado no servidor |
| ANX-S09 | Função Deno e worker JS | `deno check` / `node --check` aprovados |

Testes automatizados: `node --test scraper-worker/tests/*.test.cjs`, `node --check scraper-worker/server.js`, `deno check supabase/functions/animedex/index.ts`, `docker compose config` no CI. **Pendências**: container real, browser, limites de memória, sandbox, proteção contra navegação SSRF, proxy TLS real, rate limiting, acesso/secretos Supabase hospedados e E2E autorizados.
