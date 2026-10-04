export type MediaType = 'movie' | 'series';

export type CatalogDefinition = {
  id: string;
  name: string;
  type: MediaType;
  sourcePath: string;
  searchPath?: string;
};

const configuredCatalogs: CatalogDefinition[] = [
  { id: 'animedex_movie_catalog', name: 'AnimeDex — Filmes', type: 'movie', sourcePath: '/animes/filmes', searchPath: '/pesquisar' },
  { id: 'animedex_series_catalog', name: 'AnimeDex — Top', type: 'series', sourcePath: '/top-animes/1', searchPath: '/pesquisar' },
  { id: 'animedex_dublados_series_catalog', name: 'AnimeDex — Dublados', type: 'series', sourcePath: '/lista-de-animes-dublados/1', searchPath: '/pesquisar' },
  { id: 'animedex_atualizados_series_catalog', name: 'AnimeDex — Atualizados', type: 'series', sourcePath: '/animes-atualizados/1', searchPath: '/pesquisar' },
  { id: 'animedex_legendados_series_catalog', name: 'AnimeDex — Legendados', type: 'series', sourcePath: '/lista-de-animes-legendados/1', searchPath: '/pesquisar' },
  { id: 'home_0', name: 'Novos episódios', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_1', name: 'Mais curtidos', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_2', name: 'Em breve', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_3', name: 'Melhores em lançamento', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_4', name: 'Top 10 da semana', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_5', name: 'Novidades', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_6', name: 'De volta às aulas', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_7', name: 'Vida em outro mundo', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_8', name: 'Uma segunda vida', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_9', name: 'Deuses e mortais', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_10', name: 'Crime e submundo', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_11', name: 'Vampiros e caçadores', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_12', name: 'Fofura garantida', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_13', name: 'Operações militares', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_14', name: 'Histórias de família', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_15', name: 'Risada garantida', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_16', name: 'Artes marciais', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_17', name: 'Super robôs gigantes', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_18', name: 'Investigações policiais', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_19', name: 'Máquinas que pensam', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
];

export const settings = {
  addonId: Deno.env.get('ADDON_ID') || 'org.stremio.animedex-supabase',
  addonName: Deno.env.get('ADDON_NAME') || 'AnimeDex Supabase',
  addonVersion: Deno.env.get('ADDON_VERSION') || '2.4.0',
  baseUrl: (Deno.env.get('ANIMEFIRE_BASE_URL') || 'https://animefire.one').replace(/\/$/, ''),
  maxCatalogItems: Math.min(Number(Deno.env.get('MAX_CATALOG_ITEMS') || 20), 50),
  maxStreams: Math.min(Number(Deno.env.get('MAX_STREAMS') || 5), 10),
  httpTimeoutMs: Number(Deno.env.get('HTTP_TIMEOUT_MS') || 12_000),
  rdTimeoutMs: Number(Deno.env.get('RD_TIMEOUT_MS') || 35_000),
};

export const catalogs = configuredCatalogs;

export function getCatalog(id: string): CatalogDefinition | undefined {
  return catalogs.find(catalog => catalog.id === id);
}
