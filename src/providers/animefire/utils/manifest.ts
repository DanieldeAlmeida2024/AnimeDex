export const manifest = {
    id: 'org.stremio.animefire-plus-addon',
    version: '1.0.0',
    name: 'AnimeFire.plus Addon',
    description: 'Busca animes (filmes e séries) do AnimeFire.plus para o Stremio.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'series',
            id: 'animefire_lancamentos_series_catalog',
            name: 'AnimeDex (Lançamentos)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animefire_lancamentos_movies_catalog',
            name: 'AnimeDex Filmes (Lançamentos)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animefire_dublados_series_catalog',
            name: 'AnimeDex (Dublados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animefire_movies_catalog', 
            name: 'AnimeDex Filmes (Dublados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
                {
            type: 'series',
            id: 'animefire_series_catalog',
            name: 'AnimeDex (Top)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animefire_atualizados_series_catalog',
            name: 'AnimeDex (Atualizados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie',
            id: 'animefire_atualizados_movies_catalog',
            name: 'AnimeDex Filmes (Atualizados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series', // Assumindo que 'lista-de-animes-legendados' é para séries
            id: 'animefire_legendados_series_catalog',
            name: 'AnimeDex (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'movie', // Assumindo que 'lista-de-filmes-legendados' é para filmes
            id: 'animefire_legendados_movies_catalog',
            name: 'AnimeDex Filmes (Legendados)',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
};