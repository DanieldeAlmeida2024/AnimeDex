# Controle de versões — AnimeDex

Versão **1.0.0**, 11/11/2026. Base de código: `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c`.

| ID | Documento | Versão |
|---|---|---|
| ANI-PROJ | [Projeto](../projeto/ESPECIFICACAO.md) | 1.0.0 |
| ANI-UML | [Diagramas](../uml/README.md) | 1.0.0 |
| ANI-TST | [Testes](../testes/PLANO_DE_TESTES.md) | 1.0.0 |

Versão MAJOR quando contrato/entidades mudarem; MINOR para novos fluxos; PATCH para revisão editorial. Testes devem registrar SHA, fixtures e evidência. Diagramas e plano não comprovam funcionamento por si só.

## ANI-SR v1.1.0 — proposta de correção funcional (11/11/2026)

| ID | Artefato | Versão proposta | Mudança |
|---|---|---|---|
| ANI-SR | `src/utils/stream-routing.ts` | 1.1.0 | Roteamento IMDb sem condição impossível |
| ANI-APP | `src/main.ts` | 1.1.0 | Integra dispatcher em `defineStreamHandler` |
| ANI-TST | `tests/stream-routing.test.cjs` e plano de testes | 1.1.0 | 16 testes locais de seleção e despacho |
| ANI-UML | `docs/uml/04_roteamento_streams.puml` | 1.1.0 | Sequência editável do fluxo corrigido |
| ANI-CI | `.github/workflows/legacy-routing-ci.yml` | 1.1.0 | Gate de build, Prisma, roteamento e documentação |

Dependência de publicação: PR documental v1.0.0 deve ser integrado antes da correção v1.1.0 (PR empilhado). **Não é release nem produção validada**. Não remove `dist/` nem `prisma/dev.db`; higiene do versionamento e investigação de dados históricos são uma etapa separada.

### ANI-BUILD v1.1.1 — ajuste de CI proposto, 11/11/2026

- `tsconfig.json`: `skipLibCheck` apenas para tipagens transitivas `parse5/entities`; `strict` preservado.
- Evidência: CI do primeiro commit falhou em TS7016; `npm ci` exibiu 33 alertas (3 críticos). Reexecutar CI no novo SHA; não anunciar release.

## ANI-WRK v2.0.0 — proposta de mudança incompatível, 11/11/2026

| ID | Local | Responsabilidade |
|---|---|---|
| ANI-WRK-API | `scraper-worker/server.js` | Exigir Bearer nas rotas privadas; health mínimo |
| ANI-WRK-POL | `scraper-worker/security-policy.cjs` | Verificar token, URLs HTTPS, redirects |
| ANI-WRK-EDGE | `supabase/functions/animedex/index.ts` | Sem IP hardcoded, segredo interno, rejeitar redirects de proxy |
| ANI-WRK-OPS | `scraper-worker/docker-compose.yml`, `.env.example`, README, ORACLE-CLOUD | Bind loopback e migração TLS explícita |
| ANI-WRK-TST | `scraper-worker/test/*.test.cjs`, `.github/workflows/worker-security-ci.yml` | 21 testes e inventário de auditoria |
| ANI-WRK-UML | `docs/uml/05_seguranca_scraper_worker.puml` | Sequência editável do fluxo protegido |

PR empilhado **após #20** (que depende de #19); merge/deploy bloqueados até CI do head exato, integração staged e revisão de egress/Chromium. O run inicial da suíte 21/21 passou no commit `ac8b87c14f42`; inventário npm reportou 14 alertas no worker (12 altos, 2 moderados). Issue #21 continua aberta. **Nenhuma release é declarada.**

## ANI-DEPS v2.0.1 — atualização do grafo de dependências (proposta, 11/11/2026)

| ID | Arquivo | Mudança | Evidência |
|---|---|---|---|
| ANI-DEPS-PKG | `scraper-worker/package.json` | Fixar Puppeteer em 25.17.0 | CI de geração #43126336020 |
| ANI-DEPS-LOCK | `scraper-worker/package-lock.json` | Regenerar transições e dependências transitivas | 0 alertas `npm audit --omit=dev` no teste de preparação |
| ANI-DEPS-CI | `.github/workflows/worker-security-ci.yml` | Falhar se `npm audit` indisponível ou houver findings | A verificar no head final |
| ANI-DEPS-SEC | `docs/seguranca/AUDITORIA_DEPENDENCIAS_WORKER.md` | Baseline 14 → proposta 0; riscos residuais e evidência | `ANI-W11..W15` |

Versão documental de proposta. **Não é release nem permite deploy**. Não abrange os 33 alertas npm da raiz. Teste Chromium real, sandbox, egress e compatibilidade permanecem gates.
