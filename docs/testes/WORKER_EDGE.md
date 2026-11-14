# Plano de teste ANX-SEC — integração Supabase/worker

| Caso | Mecanismo | Critério |
| --- | --- | --- |
| WEA-01 | Teste Node do token | Sem segredo: 503, sem Bearer: 401 |
| WEA-02 | Teste Node do token | Token correto: 200 |
| WEA-03 | Teste de boundary por leitura de código | Auth vem antes do scraping e de /render |
| WEA-04 | Teste Edge por leitura de código | Sem HTTP público hardcoded e token no header |
| WEA-05 | Deno check | Edge Function compila sem erro TypeScript |
| WEA-06 | `docker compose config --format json` | Bind host 127.0.0.1, token injetado |
| WEA-07 | `node --check` | Worker Node tem sintaxe válida |

**Pendências:** WEA-08 container rodando e endpoint 401/503/200 real; WEA-09 proxy HTTPS + hostname; WEA-10 API e navegador via Supabase Edge Function; WEA-11 teste de SSRF e redes privadas; WEA-12 isolamento de Chromium; WEA-13 inspeção de vulnerabilidades e consumo de CPU/memória. Nenhum cenário remoto foi homologado nesta revisão.

O teste de token não executa express/puppeteer; o Compose não inicia containers; o check Deno não faz deploy.
