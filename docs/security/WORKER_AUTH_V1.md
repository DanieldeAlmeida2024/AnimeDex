# AnimeDex: segurança do Browser Worker

**ANI-SEC-W v0.1.0 — proposta em PR (11/11/2026).** Base `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c`. Não é release nem deploy.

## Vulnerabilidades constatadas por leitura de código

`scraper-worker/server.js` expunha catálogo, busca, metadata, episódio, estatísticas e renderização HTML sem autenticação. O endpoint `/render` verificava o hostname da URL inicial, mas usava `fetch` com redirecionamentos automáticos. A Edge Function continha endereço IP remoto HTTP como fallback e `scraper-worker/docker-compose.yml` publicava 8787 em todas as interfaces. Não foi verificada a exposição real da VM; a análise é estática do repositório.

## Contrato da implementação

- Worker exige `BROWSER_SCRAPER_TOKEN` (mínimo 32 bytes, sem espaços), falhando no startup sem ele. `/health` continua público, com informação mínima; demais rotas recebem bearer em `Authorization` e retornam 401 sem token válido. Comparação é de hashes com `timingSafeEqual`.
- Edge exige URL e token juntos, preservados em secrets. Origem worker requer HTTPS, exceto HTTP explícito em loopback de teste. Ausência dos dois desativa o worker opcional, usando fallback da API direta apenas nas rotas já suportadas; não existe endereço IP de fallback.
- O proxy interno injeta Authorization somente em chamadas para o worker. O manifesto público e os resultados ao Stremio não recebem token.
- `/render` requer HTTPS com hostname exato permitido, e redirecionamentos são inspecionados manualmente, no máximo três saltos. Navegação Puppeteer rejeita requests secundários fora da whitelist (permitido também `api.animefire.one`), o que pode impactar recursos/CDNs externos e precisa de E2E.
- Compose expõe porta 8787 apenas em `127.0.0.1`; qualquer acesso remoto precisa passar por reverse proxy próprio HTTPS, firewall e rate limit. Estatísticas de cache deixam de devolver chaves com buscas.

## Riscos residuais e fronteira de responsabilidade

**Não há segurança completa de SSRF**: controle por hostname sozinho não resolve DNS rebinding, e a política de rede/egress precisa impedir alcance a metadados cloud e rede interna. Chromium permanece com `--no-sandbox`, exigindo arquitetura de sandbox/hardening em tarefa dedicada. O token protege serviço-servidor, **não** autentica usuários finais do addon público. O npm reportou anteriormente 33 vulnerabilidades no lockfile raiz; issue #21 faz triagem de raiz e worker. Não presumir acesso lícito a conteúdo de terceiros.

## Publicação e rollback (não executados)

Gerar token aleatório (`openssl rand -hex 32`) e salvar em `scraper-worker/.env` restrito e Supabase secrets. Não exibir valor em console/logs ou versionamento. Testar primeiro Edge/worker em ambiente isolado, incluindo 401, HTTPS real, redirects, manifesto/catalog/meta/stream e comportamento de JS externo. Publicar worker protegido e reverse proxy antes da Edge. Rollback deve restaurar versões compatíveis sem remover autenticação temporariamente.
