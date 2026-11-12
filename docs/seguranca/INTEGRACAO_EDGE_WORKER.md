# AnimeDex — fronteira Edge Function → scraper-worker

> **ANI-EDGE v2.2.0 proposta** · 12/11/2026 · branch `chore/worker-dependency-upgrade-20261111`, dependente de PR #22 e da cadeia #19 → #20. Não é configuração de produção nem autorização para implantação.

## Cenário e ameaça

O catálogo é servido por uma função Supabase Edge (Deno), que solicita dados estruturados ao scraper-worker Node/Puppeteer. Antes das correções de segurança, havia fallback para endereço HTTP público fixo; a revisão ANI-WRK v2.0.0 removeu isso e exigiu token interno. Porém, a validação da origin estava implementada dentro da função Edge, sem testes de contrato Deno independentes, e aceitava caminhos adicionais na URL fornecida por variável de ambiente. Isso permitiria uma configuração de prefixo inesperado em `BROWSER_SCRAPER_URL`.

## Contrato final desta revisão

A função `configureWorker()`, em `supabase/functions/animedex/worker-connection.ts`, valida o par de configuração e **não faz chamadas de rede**. É utilizada tanto pelo proxy de dados quanto pelo manifesto dinâmico.

| Parâmetro | Condição |
|---|---|
| `BROWSER_SCRAPER_URL` | Origin HTTPS com esquema e host válidos. HTTP aceito **somente** para loopback explícito: `localhost`, `127.0.0.1`, `[::1]`. |
| `BROWSER_SCRAPER_TOKEN` | Obrigatório junto com URL; pelo menos 32 bytes UTF-8, sem espaços em branco. |
| URL com path, query, fragment ou userinfo | Rejeitada. Usar `https://host/` ou `https://host`, sem rota `/api` ou parâmetros. |
| Ambos ausentes | Retorna `null`; operações que precisam do worker falham explicitamente. A API leve externa pode ser usada pelo fallback **somente para operações previstas**. |
| Somente URL ou somente token | Erro de configuração. Não é autorizado fazer HTTP em claro ou prosseguir sem bearer. |

No worker (Node), a configuração correspondente é `SCRAPER_WORKER_TOKEN`. **Os nomes são distintos propositalmente por implantação, mas os valores efetivos têm de ser iguais quando o canal é configurado**. Essas credenciais devem permanecer fora do GitHub, ser fornecidas por secrets de execução e transmitidas somente por TLS confiável. Nenhuma rota de emissão de token foi criada.

As solicitações Edge usam `Authorization: Bearer <token>` e `redirect: 'error'`. A validação é compartilhada por `proxy(path)` e `manifest()`; assim não existem dois caminhos de configuração divergentes. O Worker mantém whitelist HTTPS e rejeição de redirects para destinos externos, mas **a resolução DNS, egress de rede, TLS real, isolamento de Chromium e cabeçalhos do container não foram validados em staging**.

## Integração com o PR alternativo #23

O PR #23 implementava uma abordagem paralela da mesma autenticação a partir da `main`. Esta revisão **incorporou** seu contrato/testes `worker-connection.ts` e `worker-connection_test.ts` à cadeia já testada de PRs #22 e #24, ampliando para dez casos Deno. O PR #23 ainda não deve ser mesclado separadamente: a sobreposição pode duplicar código com nomes de variáveis e módulos incompatíveis. A equivalência total requer revisar quaisquer diferenças residuais antes de encerrar o PR alternativo.

## Contratos e evidência de testes

`deno check supabase/functions/animedex/index.ts` valida a compilação da Edge Function (sem deploy), e `deno test supabase/functions/animedex/worker-connection_test.ts` valida dez casos determinísticos, sem chamadas de rede. O CI também mantém os 21 testes Node do worker, a auditoria npm runtime com gate zero findings, além do build/roteamento legado. Resultados só devem ser chamados PASS depois de verificar os jobs do HEAD exato.

## Critérios bloqueadores antes de publicação

1. TLS de ponta a ponta Edge → worker, cadeia de certificados e rotação dos tokens em secret manager. Nunca distribuir `BROWSER_SCRAPER_TOKEN` no cliente.
2. Restrições de saída (egress/DNS), prevenção de DNS rebinding, limites de rede de Chromium, sandbox do browser e política de rate limiting.
3. E2E de rede, redirects, falha de DNS, indisponibilidade de worker, API externa e quotas. Nenhuma credencial de produção deve ser usada nos testes.
4. Reavaliar dependências Node **depois de qualquer upgrade** e executar testes reais de Chromium em container descartável.
5. Revisão legal e de direitos de uso do conteúdo acessado, além da exposição de streams externos. Os testes desta revisão não baixam mídia.

[Plano de testes dedicado](../testes/EDGE_WORKER_DENO.md) · [Diagrama](../uml/06_edge_worker_config.puml) · [Changelog](../controle/VERSIONAMENTO.md).
