"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifest = void 0;
exports.manifest = {
    id: 'org.stremio.animedex-plus-addon',
    version: '1.0.0',
    name: 'AnimeDex Addon',
    description: 'Busca animes (filmes e séries) para o Stremio.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'kitsu'],
    catalogs: [
        {
            type: 'movie',
            id: 'animedex_lancamentos_movies_catalog',
            name: 'AnimeDex Filmes (Lançamentos)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animedex_dublados_series_catalog',
            name: 'AnimeDex (Dublados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animedex_movies_catalog',
            name: 'AnimeDex Filmes (Dublados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animedex_series_catalog',
            name: 'AnimeDex (Top)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animedex_atualizados_series_catalog',
            name: 'AnimeDex (Atualizados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animedex_atualizados_movies_catalog',
            name: 'AnimeDex Filmes (Atualizados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animedex_legendados_series_catalog',
            name: 'AnimeDex (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animedex_legendados_movies_catalog',
            name: 'AnimeDex Filmes (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
};
