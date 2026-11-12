# AnimeDex — testes da configuração do canal Edge → worker

**ANI-EDGE-TST v2.2.0 proposta** · 12/11/2026 · suíte Deno 2, sem navegador e sem chamadas de rede.

| ID | Teste Deno | Critério |
|---|---|---|
| ANI-EDGE-01 | URL e token ausentes | Retorna `null`, sem tentar obter worker |
| ANI-EDGE-02 | Origin HTTPS + bearer forte | Origin normalizada e token preservado |
| ANI-EDGE-03 | Apenas uma das variáveis definida | Erro; não há conexão sem par configurado |
| ANI-EDGE-04 | Segredo curto, em branco ou com espaços | Erro explícito sem exibir valor de token |
| ANI-EDGE-05 | HTTP público, metadata e protocolos incorretos | Rejeitado |
| ANI-EDGE-06 | Loopback HTTP (`localhost`, `127.0.0.1`) | Permitido **apenas** como exceção local |
| ANI-EDGE-07 | Userinfo em URL | Rejeitado |
| ANI-EDGE-08 | Path/query/hash na origin | Rejeitado |
| ANI-EDGE-09 | Espaços e URL sem esquema | Rejeitado |
| ANI-EDGE-10 | HTTP IP privado não loopback e host disfarçado | Rejeitado |
| ANI-EDGE-11 | `deno check` da função completa | TypeScript válido, sem deployment |
| ANI-EDGE-12 | Regressão Node worker (CI existente) | 21 testes de autenticação, redirects e HTTP local |
| ANI-EDGE-13 | Audit runtime worker (CI existente) | Gate obrigatório zero findings |
| ANI-EDGE-14 | E2E TLS, DNS/egress, proxy, browser Chromium | **Pendente staging** |
| ANI-EDGE-15 | Segurança de autorização dos dados e direitos do conteúdo | **Pendente revisão legal/segurança** |

Comandos:

```sh
deno check supabase/functions/animedex/index.ts
deno test supabase/functions/animedex/worker-connection_test.ts
node --test scraper-worker/test/*.test.cjs
npm audit --prefix scraper-worker --omit=dev
```

O teste Deno verifica **somente o contrato puro** `configureWorker`; não simula respostas HTTP reais e não demonstra que um deployment Supabase utiliza secrets corretos. A CI de Node não executa Chromium real. Registre o SHA, runs e versões dos runners após conclusão; não inferir PASS de um workflow anterior.
