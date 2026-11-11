# Instruções para agentes — AnimeDex

Addon Stremio de catálogo de animes com Supabase/Deno e worker opcional de scraping.

Leia README, `supabase/, scraper-worker/, src/` e docs/REQUISITOS.md. Preserve a stack existente (Deno, Supabase, PostgreSQL; Node/Prisma legado) e a autoria do projeto.

- Distinguir implementado, conceitual e integração não verificada.
- Preferir nomes em português em novos componentes quando compatível com contratos existentes.
- Não alterar deploy, fonte de dados, cobrança ou credenciais sem aprovação.
- Não colocar segredos ou dados pessoais no repositório.
- Executar testes nativos (Validar manifest/catalog/meta/stream em ambiente de teste.) e, se houver, testes de integração.
- Testes em Python do diretório tests verificam somente documentos.

**Risco:** Não considerar fontes de streaming e scraping garantidas; respeitar direitos autorais e termos das fontes.
