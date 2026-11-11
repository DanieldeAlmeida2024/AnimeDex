# AnimeDex — plano de testes e regressão

> **ANI-DOC v1.0.0** · 11/11/2026 · base analisada `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c` · revisão estática.


## Inventário
A documentação estrutural existente está em `tests/test_documentacao.py`; não foi encontrada nesta revisão uma suíte funcional completa do SDK Stremio. Os testes abaixo são **plano**, não relatório de execução.

| ID | Prioridade | Entrada / cenário | Resultado esperado |
|---|---|---|---|
| ANI-T01 | P0 | Obter manifesto do addon | ID, version, resources e catalogs válidos |
| ANI-T02 | P0 | `catalog` top/dublado/legendado/atualizados | `{metas:[]}` ou lista de metas válidas |
| ANI-T03 | P1 | `skip=0,20,40` | Páginas coerentes sem duplicata inesperada |
| ANI-T04 | P0 | Busca com `extra.search` | Termo passado corretamente ao scraper |
| ANI-T05 | P0 | Meta interna Stremio | DTO compatível com manifest |
| ANI-T06 | P0 | IMDb `tt1234567` | Adaptador IMDb selecionado; ID interno não encaminhado para IMDb |
| ANI-T07 | P0 | IMDb episódio `tt123:1:2` | Adaptador IMDb selecionado; ID interno `anime123:2:7` usa AnimeFire; erro do adaptador propagado |
| ANI-T08 | P1 | AniList indisponível | Fallback previsível e sem loop |
| ANI-T09 | P1 | TMDB sem resultado | Resultado vazio/erro controlado, sem dados falsos |
| ANI-T10 | P0 | Inserir metadado existente | Chaves únicas respeitadas em SQLite |
| ANI-T11 | P1 | Scraper HTML alterado | Retorno degrada com mensagem segura |
| ANI-T12 | P1 | `dev.db` sujo / migrations | Schema inicializável em banco descartável |
| ANI-T13 | P0 | Dados malformados vindos do provedor | Sem injeção HTML ou crash do addon |
| ANI-T14 | P1 | Build TypeScript | `npm run build` conforme package.json após conferir script |

## Preparação
Usar uma cópia descartável do banco SQLite e stubs de AniList/TMDB/scraper. Não testar automaticamente fornecedores com excesso de requisições nem baixar conteúdo protegido. Registrar versão do SDK e commit, URL de contrato local e resultado observado.

## Execução delimitada — ANI-SR v1.1.0 (proposta)

`tests/stream-routing.test.cjs` contém 16 casos determinísticos do contrato de IDs, dispatch dos adaptadores e propagação de falha. O teste isolado foi executado localmente com TypeScript 5.8.3, Node.js 22.16.0 e `tsc --target es2020 --module commonjs --strict --rootDir src --outDir dist src/utils/stream-routing.ts`: **16/16 PASS** em 11/11/2026. Isso NÃO equivale ao build total do projeto nem testa scraping/Prisma/SDK.

O workflow `.github/workflows/legacy-routing-ci.yml` acrescenta `npm ci`, `npx prisma generate`, `npm run build`, 16 testes e testes documentais em pull request. Estado do workflow: **pendente de execução/validação no GitHub** até obter o run no SHA exato. Não publicar nem mesclar sem revisar logs e check runs. O caminho Supabase/Deno, os provedores externos e os cenários de segurança ANI-T08..T13 continuam pendentes de E2E e não são cobertos pelo teste unitário.
