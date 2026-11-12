# AnimeDex — Browser Scraper Worker

Worker opcional Express/Puppeteer/Cheerio do AnimeDex. Processa catálogos, detalhes e HTML renderizado. **Não deve ficar diretamente acessível na internet.**

## Inicialização local — ANI-WRK v2.0.0 (proposta)

```bash
cd scraper-worker
cp .env.example .env
# Gere um segredo aleatório (32 bytes = 64 caracteres hex):
openssl rand -hex 32
# Edite .env localmente e preencha SCRAPER_WORKER_TOKEN.
docker compose up -d --build
curl http://127.0.0.1:8787/health
curl -i http://127.0.0.1:8787/api/cache/stats # 401 sem token
```

`SCRAPER_WORKER_TOKEN` é obrigatório e deve possuir pelo menos 32 bytes. Nunca comitar `.env` nem publicar valor do token em logs ou issues. Use `curl -H "Authorization: Bearer $SCRAPER_WORKER_TOKEN" http://127.0.0.1:8787/api/cache/stats` apenas em terminal privado.

## Endpoints e acesso

- `GET /health`: público, resposta mínima `ok`/serviço.
- `GET /api/cache/stats`, `/api/catalog`, `/api/home/catalogs`, `/api/home/catalog/:id`, `/api/anime/:id`, `/api/episode/:id`, `/render?url=...`: exigem `Authorization: Bearer` com segredo compartilhado.
- Sem token ou token incorreto: HTTP 401, antes de consultar cache, chamar fontes ou iniciar renderização.

## Supabase Edge e transporte

Use secrets `BROWSER_SCRAPER_URL=https://DOMINIO-DO-WORKER` e `BROWSER_SCRAPER_TOKEN` (mesmo segredo do worker). A Edge Function encaminha o bearer apenas ao worker; não passa o segredo ao Stremio. O endereço HTTP público antigo deixou de ser utilizado como fallback automático. A Edge Function exige HTTPS externo; HTTP é aceito só para loopback de desenvolvimento.

O `docker-compose.yml` mapeia `127.0.0.1:8787` do host. Para acesso remoto, coloque um reverse proxy TLS na VM, com acesso por loopback ao serviço local. Não libere diretamente 8787 no firewall/NSG.

## Cache e riscos restantes

Por padrão, `CACHE_TTL_MS=1800000` e `CACHE_MAX_ENTRIES=500`. O cache em memória é invalidado por TTL/restart e deduplica requisições simultâneas. A rota de estatísticas fica autenticada. Redirects e URLs usados por `/render` exigem HTTPS e host da allowlist, no máximo 3 saltos.

**Isso não é garantia de segurança para internet pública**: Chromium ainda executa com `--no-sandbox`, e faltam isolamento de egress/DNS, rate limiting/concurrency, triagem de dependências e teste E2E HTTPS. Veja [contrato do worker](../docs/projeto/SECURITY_WORKER.md), [plano de testes](../docs/testes/PLANO_DE_TESTES.md), [UML](../docs/uml/05_seguranca_scraper_worker.puml) e [runbook Oracle](ORACLE-CLOUD.md).
