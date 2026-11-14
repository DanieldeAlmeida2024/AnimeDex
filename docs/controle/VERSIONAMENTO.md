# Histórico técnico — AnimeDex

## ANX-SEC v1.1.0 · 14/11/2026 — proteção Edge ⇄ worker

- Retirado IP HTTP público fixo do código da Edge Function.
- Integrada credencial `WORKER_API_TOKEN` exclusivamente servidor-servidor.
- Worker Express protege rotas operacionais e falha fechado sem segredo.
- Docker publica 8787 somente no loopback; exige token definido no ambiente.
- Consulta direta de HTML não segue redirects HTTP; manifesto dinâmico usa proxy autenticado.
- Dockerfile usa `npm ci --omit=dev` e inclui módulo de autenticação.
- Criados testes Node, Deno check e validação de Compose em GitHub Actions.
- Documentação específica: arquitetura, segurança, matriz de testes, guia Oracle Cloud.

**Não implantado / não homologado:** nenhuma alteração no Oracle Cloud, Supabase hospedado, secrets remotos ou banco. Ainda há revisão de vulnerabilidades, SSRF em navegação de navegador, rate limiting, TLS real e sandbox Chromium a concluir.

## Repositório e referências

O código legado Node/Prisma continua para referência; a integração ativa do addon depende da Edge Function e do Browser Scraper opcional. Histórico anterior permanece no Git; nenhuma migração de banco foi criada.

## ANX-LEGACY v1.2.0 · 14/11/2026 — correção de roteamento Stremio

- Corrigida a condição mutuamente exclusiva no adaptador legado: identificadores `tt1234567` e `tt1234567:1:2` usam o destino IMDb, demais IDs continuam AnimeFire.
- Classificador puro testado com **16 cenários** Node, sem scraping, banco ou rede; adicionado build TypeScript e CI dedicado.
- `skipLibCheck` no compilador afeta somente definições transitivas de terceiros; o código-fonte continua com `strict`.
- Diagrama de fluxo: `docs/uml/04_roteamento_streams.puml`.
- Limite: suíte testa roteamento determinístico, não disponibilidade de streams nem uso autorizado das fontes.
