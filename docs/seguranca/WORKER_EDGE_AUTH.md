# AnimeDex — contrato de autenticação Edge ⇄ worker

**ANX-SEC v1.1.0 · 14/11/2026 · ambiente não implantado.**

## Fluxo e decisões de segurança

1. A Supabase Edge Function lê exclusivamente de seu runtime `BROWSER_SCRAPER_URL` e `WORKER_API_TOKEN`. Um token ausente/curto ou URL malformada impede chamada ao worker.
2. Em produção, o destino precisa usar HTTPS. HTTP só é permitido para destinos `localhost` e `127.0.0.1` de laboratório. Redirect HTTP é rejeitado na requisição da Edge.
3. A Edge envia o token em `Authorization: Bearer`, não em query string. Também usa esse caminho para catálogos dinâmicos do manifesto.
4. O Express verifica token antes de toda rota operacional. Sem segredo o retorno é 503; sem Bearer válido é 401; `/health` fica isenta para healthcheck.
5. Docker publica somente `127.0.0.1:8787` no host. `BIND_HOST=0.0.0.0` opera apenas **dentro** do contêiner, para que o mapeamento de loopback do Docker funcione.

## Implantação: ordem segura

Configurar proxy HTTPS, firewall e segredo compartilhado antes de atualizar a Edge Function no ambiente hospedado. Para proteger serviços já instalados, não alterar rotas, certificados, containers ou volumes de outras aplicações. Um worker antigo sem token deixa de funcionar com a Edge revisada **intencionalmente**.

## Limites não homologados

A verificação de token e porta local não substitui rate limiting, isolamento de Chromium (o worker usa `--no-sandbox`), política de redirects em Puppeteer, revisão de dependências, segredos em ambiente hospedado e testes reais com proxy TLS. Não alegar ambiente seguro para exposição pública até resolver esses pontos.

## Evidências automatizadas

- `scraper-worker/tests/worker-token.test.cjs`: autorização em ambiente isolado.
- `scraper-worker/tests/worker-boundaries.test.cjs`: garantias estáticas de middleware, Edge, redirects e bind.
- `.github/workflows/security-worker.yml`: Node 22, Deno check e configuração declarativa Docker.
