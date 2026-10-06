export type MediaType = 'movie' | 'series';

export type CatalogDefinition = {
  id: string;
  name: string;
  type: MediaType;
  sourcePath: string;
  searchPath?: string;
};

const configuredCatalogs: CatalogDefinition[] = [
  { id: 'home_0', name: 'Novos episódios — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_1', name: 'Mais curtidos — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_2', name: 'Em breve — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_3', name: 'Melhores em lançamento — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_4', name: 'Top 10 da semana — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_5', name: 'Novidades — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_6', name: 'De volta às aulas — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_7', name: 'Vida em outro mundo — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_8', name: 'Uma segunda vida — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_9', name: 'Deuses e mortais — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_10', name: 'Crime e submundo — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_11', name: 'Vampiros e caçadores — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_12', name: 'Fofura garantida — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_13', name: 'Operações militares — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_14', name: 'Histórias de família — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_15', name: 'Risada garantida — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_16', name: 'Artes marciais — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_17', name: 'Super robôs gigantes — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_18', name: 'Investigações policiais — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
  { id: 'home_19', name: 'Máquinas que pensam — AnimeDex Supabase', type: 'series', sourcePath: '/', searchPath: '/pesquisar' },
]

export const settings = {
  addonId: Deno.env.get('ADDON_ID') || 'org.stremio.animedex-supabase',
  addonName: Deno.env.get('ADDON_NAME') || 'AnimeDex Supabase',
  addonVersion: Deno.env.get('ADDON_VERSION') || '2.4.7',
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
