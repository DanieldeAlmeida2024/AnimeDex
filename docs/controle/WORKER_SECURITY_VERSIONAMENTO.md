# ANI-SEC-W — controle de versão (proposta)
**v0.1.0, 11/11/2026** — base `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c`. Não é tag nem versão de produção.

- Projeto: [WORKER_AUTH_V1.md](../security/WORKER_AUTH_V1.md)
- Testes: [WORKER_SECURITY_TESTS.md](../testes/WORKER_SECURITY_TESTS.md)
- UML: [05_worker_auth_proxy.puml](../uml/05_worker_auth_proxy.puml)
- Código: `scraper-worker/security.js`, `server.js`, `supabase/functions/animedex/worker-connection.ts` e `index.ts`.
- CI: `.github/workflows/worker-security-ci.yml`.
- Portabilidade: o fluxo legacy Node e a Edge Function Deno usam o mesmo contrato bearer, mas sem deploy até E2E.
- Riscos mantidos: issue #21 npm audit; Chromium sem sandbox; egress DNS, rate limit e testes de conteúdo/licenças.

### Revisão proposta v0.1.1 — gate TypeScript

Correção de tipagem de `ApiAnime.episodeId?: string`, erro TS2339 capturado pelo primeiro GitHub Actions #43126034882. Sem alteração funcional e sem `ts-ignore`; não alegar validação Deno antes do novo run no SHA atualizado.
