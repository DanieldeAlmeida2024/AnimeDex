"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifest = void 0;
exports.manifest = {
    id: 'org.stremio.animedex-plus-addon',
    version: '0.0.1',
    name: 'AnimeDex Addon',
    description: 'Busca animes (filmes e séries) para o Stremio.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
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
            type: 'series',
            id: 'animedex_legendados_series_catalog',
            name: 'AnimeDex (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
};
