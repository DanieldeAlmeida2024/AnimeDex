# Deploy do scraper-worker na Oracle Cloud (segurança, ANI-WRK v2.0.0)

> **Proposta não liberada para produção.** Substitui a instrução antiga de expor HTTP 8787 público sem autenticação. Não rodar automaticamente no servidor existente.

## Ambiente

Oracle Linux 9 com Docker Engine, Docker Compose, DNS e reverse proxy **HTTPS**. O container usa Puppeteer; a Edge Function não executa Chromium.

```bash
sudo dnf -y install dnf-plugins-core ca-certificates curl git
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

## Migração sem quebra inesperada

1. Validar a branch em **staging** numa instância/porta distinta, sem alterar serviço ativo. A nova versão **não funciona** com clientes sem token.
2. Em `~/AnimeDex/scraper-worker`, copiar `.env.example` para `.env`, gerar token aleatório de pelo menos 32 bytes (`openssl rand -hex 32`) e definir `SCRAPER_WORKER_TOKEN` localmente. Guardá-lo no secret manager.
3. Configurar um proxy TLS com certificado válido e encaminhamento para `http://127.0.0.1:8787`. Não sobrescrever 80/443 de outros serviços da VM. No compose, 8787 está vinculado apenas à interface loopback do host.
4. Bloquear regras NSG/Security List e firewalld que exponham 8787 à internet. **Nunca liberar 0.0.0.0/0 para essa porta.**
5. Configurar em Supabase staging: `BROWSER_SCRAPER_URL=https://DOMINIO-HTTPS-DO-WORKER` e `BROWSER_SCRAPER_TOKEN`, com **o mesmo segredo** usado no worker. Usar painel Secrets/entrada segura, não passar segredo na linha de comando compartilhada.
6. Testar health, 401 sem token, 200 com token, catálogos, episódio e render autorizado; registrar evidência e fallback. Migrar o tráfego só após revisão e autorização.

## Verificação local sem segredo em log

```bash
cd ~/AnimeDex/scraper-worker
### Não execute `docker compose config` em logs compartilhados: pode imprimir SCRAPER_WORKER_TOKEN.
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8787/health
curl -i http://127.0.0.1:8787/api/cache/stats  # 401 esperado
docker compose logs --tail=100 animedex-scraper
```

Use um processo seguro de teste para o header Bearer, sem imprimir segredo. Um erro 401 em staging indica token ausente/inválido. Desabilitar o token ou abrir HTTP público **não** é rollback aceitável.

## Pendências de segurança e operação

O navegador usa `--no-sandbox`; redes outbound/DNS e taxa de requisições ainda carecem de limites; dependências devem passar por triagem. Não tratar policy URL de aplicação como firewall de rede. Nenhuma alteração nesta documentação autoriza deploy em VM de produção.

**Imutabilidade do lock:** a imagem proposta usa `npm ci --omit=dev` e o lockfile versionado; atualizar a imagem somente após CI e staging confirmados.
