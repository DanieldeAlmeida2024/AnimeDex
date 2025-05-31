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
            type: 'series',
            id: 'animedex_lancamentos_series_catalog',
            name: 'AnimeDex (Lançamentos)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
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
            type: 'series', // Assumindo que 'lista-de-animes-legendados' é para séries
            id: 'animedex_legendados_series_catalog',
            name: 'AnimeDex (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie', // Assumindo que 'lista-de-filmes-legendados' é para filmes
            id: 'animedex_legendados_movies_catalog',
            name: 'AnimeDex Filmes (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
};
