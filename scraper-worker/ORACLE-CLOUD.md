# AnimeDex — implantação protegida do scraper na Oracle Cloud

> Revisão de segurança de 13/11/2026. Documento de orientação, **não** evidência de deploy efetuado. Não altera serviços alheios ao AnimeDex na VM.

## Topologia e isolamento

Supabase Edge Function (HTTPS) → reverse proxy HTTPS autenticado → `127.0.0.1:8787` do host Oracle → contêiner AnimeDex. A porta 8787 **não** deve ser aberta na Security List/NSG nem em `firewalld`. O `docker-compose.yml` publica somente no loopback do host. Dentro do contêiner, `BIND_HOST=0.0.0.0` permite tráfego encaminhado pela publicação local do Docker.

## Configuração do worker

```bash
cd ~/AnimeDex/scraper-worker
cp .env.example .env
# Edite .env localmente com WORKER_API_TOKEN aleatório de 32+ caracteres.
# Não faça commit nem inclua token em URL, logs ou exemplo público.
docker compose config
docker compose up -d --build
curl --fail http://127.0.0.1:8787/health
```

Se `WORKER_API_TOKEN` estiver ausente, o Compose falha ao iniciar. Mesmo se contornar essa checagem, rotas fora de `/health` recusam acesso com 503. Com token errado ou ausente, retornam 401. **Nunca usar o token dentro do frontend/browser.** Não exponha `/api` nem `/render` sem autenticação; essas rotas podem consumir CPU e memória ao executar Chromium.

O reverse proxy de HTTPS já disponível no host deve direcionar o domínio do worker para `http://127.0.0.1:8787`. Para este serviço, configurar TLS válido e limites de requisições/timeouts; não alterar serviços de outros projetos. Certifique-se de que o proxy não publica a porta interna diretamente.

## Conectar a Supabase Edge Function

Defina em **Supabase Edge Functions → Secrets**:

- `BROWSER_SCRAPER_URL` = `https://worker.seu-dominio.example` (domínio real com HTTPS válido)
- `WORKER_API_TOKEN` = exatamente o mesmo segredo configurado no worker.

O código rejeita HTTP remoto, endereços sem esquema válido e worker sem token forte; em rotas com alternativa leve, cai no fetch direto quando o worker estiver ausente. Os carrosséis que dependem de navegador continuarão indisponíveis sem worker seguro, por decisão de segurança.

## Verificações

```bash
node --test scraper-worker/tests/*.test.cjs
node --check scraper-worker/server.js
cd scraper-worker && docker compose config
```

No servidor: consultar `/health` localmente, verificar 503 sem token configurado, 401 com token inválido e 200 autenticado em endpoint não destrutivo com token válido. O último teste deve ocorrer por canal HTTPS para não expor credenciais. Não fazer teste de carga em host compartilhado sem planejar isolamento e limites de memória.

## Pendências antes de promover a produção

Atualizar vulnerabilidades abertas nas dependências Node e no worker (issue P0), validar o build do contêiner e os caminhos com autenticação real, implementar rate limiting/quotas e revisar uso de `--no-sandbox` do Chromium. As proteções do PR reduzem superfície exposta, mas não substituem pentest, análise de SSRF/redirects nem homologação.
