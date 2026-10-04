# Deploy na Oracle Cloud

O worker Puppeteer/Cheerio roda na instância Oracle Linux 9. A Edge Function Supabase não hospeda Chromium diretamente.

## 1. Preparar a instância

```bash
sudo dnf -y update
sudo dnf -y install dnf-plugins-core ca-certificates curl git
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

## 2. Baixar o projeto do Git

Na instância Oracle Linux 9, clone o repositório oficial:

```bash
cd ~
git clone https://github.com/DanieldeAlmeida2024/AnimeDex.git
cd ~/AnimeDex
git status
```

Para atualizar uma instalação existente:

```bash
cd ~/AnimeDex
git pull --ff-only origin main
```

Se o repositório for privado, configure uma chave SSH ou um token do GitHub na instância; não coloque credenciais dentro do `.env` do worker.

## 3. Publicar o worker na porta 8787

A porta 80 já é usada pelo microservidor. O worker será publicado diretamente na porta **8787**.

```bash
cd ~/AnimeDex/scraper-worker
cp .env.example .env
nano .env

docker compose up -d --build
curl http://IP_PUBLICO_DA_VM:8787/health
```

A resposta esperada é:

```json
{"ok":true,"service":"animedex-scraper-worker"}
```

O `docker-compose.yml` publica somente `8787:8787`. O Caddy continua disponível no repositório como alternativa, mas não é iniciado nessa composição porque as portas 80/443 já estão ocupadas.

## 4. Firewall da Oracle Cloud

No painel da Oracle Cloud, crie uma regra de entrada TCP `8787` para o CIDR necessário. Para teste, pode ser `0.0.0.0/0`; em produção, restrinja aos IPs de saída conhecidos ou coloque o worker atrás de um proxy HTTPS.

No Oracle Linux 9:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=8787/tcp
sudo firewall-cmd --reload
```

A porta 8787 também precisa estar liberada na Security List ou Network Security Group da instância Oracle Cloud.

## 5. Conectar ao Supabase

Depois de confirmar o endpoint, configure a variável da Edge Function:

```bash
supabase secrets set BROWSER_SCRAPER_URL=http://IP_PUBLICO_DA_VM:8787
```

Ou use o painel Supabase em **Edge Functions → Secrets**:

```text
Nome: BROWSER_SCRAPER_URL
Valor: http://IP_PUBLICO_DA_VM:8787
```

## 6. Testar

```bash
curl https://ievgjejyyhirohyoubdu.supabase.co/functions/v1/animedex/manifest.json
curl 'https://ievgjejyyhirohyoubdu.supabase.co/functions/v1/animedex/catalog/series/animedex_series_catalog.json?search=naruto'
```

## Operação

```bash
docker compose ps
docker compose logs -f --tail=100 animedex-scraper
docker compose up -d --build
```

O container reinicia automaticamente após reboot ou falha.

## HTTPS em produção

A porta 8787 funciona para validar e operar rapidamente, mas HTTP público não é ideal para produção. Como as portas 80/443 já estão ocupadas, as opções são:

1. colocar o worker atrás do reverse proxy HTTPS já existente no microservidor;
2. usar uma segunda interface/IP público;
3. usar uma porta TLS dedicada com certificado válido;
4. configurar o Caddy deste diretório em outra porta externa, usando DNS challenge.

Depois, altere para:

```text
BROWSER_SCRAPER_URL=https://seu-dominio:PORTA
```

## Segurança

- Não exponha segredos neste worker.
- Restrinja `/render` a chamadas da Edge Function com autenticação interna antes de produção pública.
- Mantenha a porta 8787 liberada somente para as origens necessárias quando possível.
- Não coloque `SUPABASE_SERVICE_ROLE_KEY`, TMDB ou Real-Debrid neste worker.
- Monitore CPU/RAM: Chromium consome mais memória que o processo Edge.
