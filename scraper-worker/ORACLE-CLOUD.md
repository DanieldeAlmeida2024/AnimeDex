# AnimeDex Worker — migração de implantação segura (ANI-SEC-W v0.1.0 proposta)

**Nenhum deploy foi realizado.** Não abrir 8787 na Internet. Os comandos antigos que publicavam `0.0.0.0/0` e HTTP no IP público são inseguros para o worker protegido.

1. Fazer backup das configurações existentes da VM, sem tocar em outros serviços.
2. Gerar segredo aleatório de no mínimo 32 bytes (`openssl rand -hex 32`) e guardá-lo em `scraper-worker/.env` **não versionado**, com permissões restritas. Definir a mesma variável `BROWSER_SCRAPER_TOKEN` nos secrets do projeto Supabase (verificar `supabase --version`, `supabase secrets --help`; CLI v3 passou a operar local-first por padrão).
3. `docker compose up -d --build` na pasta `scraper-worker`, após revisão. O compose vincula **127.0.0.1:8787**, não IP público. Verificar `curl -fsS http://127.0.0.1:8787/health` (200) e `curl -i http://127.0.0.1:8787/api/cache/stats` (401).
4. Ligar um domínio de **HTTPS válido** ao serviço via reverse proxy confiável. O proxy deve passar `Authorization`, limitar taxa e tamanho de request. Nunca liberar diretamente a porta interna 8787. Testar 401 sem token e 200 com token (não colocar token real em comandos salvos, logs ou issues).
5. Configurar `BROWSER_SCRAPER_URL=https://worker.seu-dominio` na Edge e manter `BROWSER_SCRAPER_TOKEN` idêntico. Verificar `supabase functions deploy --help` e testar em staging antes de qualquer deploy real.
6. Ensaiar catálogo, home, metadata, streaming, redirects bloqueados, timeout, quedas e efeitos sobre JavaScript/CDNs. Implementar controle de egress/DNS e Chromium sandbox antes de promover produção.

Rollback coordenado: voltar ambos os componentes a versões compatíveis após reavaliar exposição, mantendo firewall fechado. Não desabilitar o token para mascarar falhas de integração.
