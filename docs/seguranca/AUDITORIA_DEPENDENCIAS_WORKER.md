# AnimeDex — triagem de dependências do scraper-worker

> **ANI-DEPS v2.0.1 — proposta, 11/11/2026** · fluxo independente do addon Node legado. Esta análise não é certificação de produção.

## Escopo e evidência

Auditoria do **runtime** `scraper-worker` com Node 22 e `npm audit --omit=dev --json`, usando o `package-lock.json` desse subprojeto. **Não confundir** com os 33 avisos da raiz do addon legado.

| Etapa | SHA/run | Resultado |
|---|---|---|
| Antes | [CI #43125363802](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43125363802), head `ac8b87c14f42` | 14 pacotes afetados: 12 altos, 2 moderados; 0 críticos |
| Atualização descartável | [CI #43126336020](https://github.com/DanieldeAlmeida2024/AnimeDex/actions/runs/43126336020), head `ff5456dd95a0` | `npm install puppeteer@25.17.0 --save-exact --package-lock-only --ignore-scripts`; `npm audit fix --package-lock-only --ignore-scripts`; 21 testes PASS; `npm audit` informa **0 alerts** |
| Lock commitado | `6c0b6bca9650` | Arquivos `scraper-worker/package.json` e `package-lock.json` atualizados; validar novamente pelo CI do PR |

A evidência do teste descartável foi usada para materializar o lockfile no GitHub; o workflow temporário de geração de lock foi **removido** da árvore versionada. A instalação final e os checks serão verificados no head do PR.

## Cadeias corrigidas no grafo de dependências

- **Puppeteer major** `24.x → 25.17.0`, com `puppeteer-core`, `@puppeteer/browsers`, `chromium-bidi` e transitivas: `extract-zip`, `basic-ftp`, `get-uri`, `pac-proxy-agent`, `proxy-agent` e `zod`.
- **Transitiva corrigível no lock:** `body-parser`, `undici`, `ip-address` e `qs`.
- Versões observadas no lock regenerado: `puppeteer 25.17.0`, `chromium-bidi 157.0.8090-0`, `undici 7.30.2`, `zod 4.6.7` e `body-parser 2.4.0`.

Vulnerabilidades reportadas antes incluíam [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) (body-parser), [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) (extract-zip), [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (Zod) e advisories de undici. O resultado é **baseado no banco de advisories disponível ao npm no momento do run**, não prova inexistência de falhas desconhecidas.

## Gates remanescentes

- [ ] CI do SHA final: `npm ci`, teste HTTP local e `npm audit --omit=dev` com zero alertas.
- [ ] E2E de lançamento do Chromium atualizado em container com sandbox, sem fontes de mídia de terceiros.
- [ ] Compatibilidade de `puppeteer@25` com `page.goto`, interceptação, redirects e HTML reais em staging isolado.
- [ ] Hardening do container/browser (o código ainda usa `--no-sandbox`), política DNS/egress, rate-limit e observabilidade.
- [ ] Integração Edge HTTPS + token e runbook de migração da versão incompatível do worker.
- [ ] Auditar dependências **da raiz do AnimeDex separadamente** e decidir descontinuação segura do runtime Node legado.

Sem deploy; uso de fontes autorizadas e limites legais permanecem requisitos operacionais.
