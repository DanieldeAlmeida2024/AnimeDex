# AnimeDex — especificação do addon de catálogos

> **ANI-DOC v1.0.0** · 11/11/2026 · base analisada `017f5ad16e7d4fa14fb318c6d76f6f3b351f902c` · revisão estática.


## Objetivo e interfaces
Addon compatível com `stremio-addon-sdk`, expondo recursos `catalog`, `meta` e `stream` para animes `movie` e `series`. `src/utils/manifest.ts` declara `org.stremio.animedex-plus-addon`, versão de manifesto `0.0.1` e quatro catálogos de séries (dublados, top, atualizados e legendados), com `search` e `skip` opcionais. `src/main.ts` registra três handlers e serve HTTP na porta **7000**.

## Fluxos de código
**Catálogo:** `animeFireHeadler` escolhe a origem de scraping por `id`, converte `skip` em página, consulta AniList, tenta localizar IMDb e TMDB, salva/atualiza metadados pelo adaptador de persistência e retorna `metas[]`.

**Metadata:** `defineMetaHandler` diferencia IDs do formato IMDb `tt123...` de IDs internos e chama `animeFireMetaHeadler` apenas para os internos, conforme código.

**Streams:** `defineStreamHandler` consulta serviços de scraping AnimeFire ou torrent; trata exceções com rejeição. No snapshot há a condição `isImdbIdOnly && isStremioImdbEpisodeId`: as expressões regulares têm formatos mutuamente exclusivos, então essa ramificação **não é alcançável**. Requer correção e testes próprios; documentação não a resolve.

## Persistência e dados
`prisma/schema.prisma` usa SQLite com `file:./dev.db`; `Anime` possui `id`, `imdbId?`, `animefireUrl` e `stremioId` únicos, `title`, `type`, imagens, gêneros, `episodesData`, datas de criação/alteração/última busca e `secoundName` (grafia real do schema). `SearchLog` contém ID, IMDb ID e data de busca.

Há histórico de migrations em `prisma/migrations` e um arquivo `prisma/dev.db` versionado. Isso pode incorporar dados de desenvolvimento; revisar e retirar do versionamento apenas após avaliar histórico e preservar dados necessários.

## Dependências e riscos
- Provedores e páginas de terceiros podem alterar HTML, URLs, metadados ou políticas de acesso.
- Scraping deve respeitar direitos, termos e autorização do conteúdo; documentação técnica não legitima acesso a mídia sem licença.
- O campo `search` é declarado como string, mas o código usa `search?.search` numa condição; revisar tipagem e teste de filtro.
- O método de persistência tem ramos de fallback AniList/TMDB/Google; não assumir cobertura ou cache correto sem testes de integração.
- Os arquivos `dist/` e a base SQLite versionada exigem política clara para evitar divergência com `src/`.
