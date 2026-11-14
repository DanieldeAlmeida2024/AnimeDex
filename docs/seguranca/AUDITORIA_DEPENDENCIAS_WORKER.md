# AnimeDex — verificação da cadeia de dependências do scraper-worker

## Revisão de 14/11/2026

A stack do worker é isolada da stack Node/Prisma legada da raiz. Foi adotado o lock preparado e testado na branch histórica `chore/worker-dependency-upgrade-20261111`, atualizando Puppeteer para **25.17.0** e atualizando transitivas com evidência de auditoria anterior. O `package-lock.json` é integralmente versionado; o Dockerfile já usa `npm ci --omit=dev`.

### Portão do GitHub Actions

O job `supply-chain-worker` executa instalação reprodutível, carregamento das bibliotecas e `npm audit --omit=dev --audit-level=moderate`. Falhas da auditoria bloqueiam o workflow. Essa checagem depende do banco público de advisories consultado no momento do CI e **não substitui análise de licença, revisão de código, pinagem de imagens base ou teste da navegação Chromium**.

### Restrições
- PUPPETEER_SKIP_DOWNLOAD=true no job é apenas para auditoria leve; container/runtime final devem instalar e testar navegador.
- Revisar migração do Puppeteer major no ambiente Docker isolado, especialmente sandbox, redirects, timeout, limites de memória e sites autorizados.
- Nenhum deploy/atualização Oracle ou Supabase hospedado faz parte deste PR.
- A raiz Node antiga permanece fora deste job e pode ter avisos independentes.

## Evidência histórica
O [workflow de preparação #43126336020](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43126336020) registrou instalação compatível e auditoria limpa na época, mas é necessário verificar o PR atual em sua própria branch e commit.
