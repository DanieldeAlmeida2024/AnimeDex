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
