import axios from 'axios';

// Interfaces para os tipos de dados do AniList, conforme definidos anteriormente.
// Certifique-se de que estas interfaces estejam acessíveis (importadas ou no mesmo arquivo).
interface AniListTitle {
    romaji: string;
    english: string | null;
    native: string | null;
}

interface AniListExternalLink {
    url: string;
    site: string;
}

interface AniListMedia {
    id: number;
    title: AniListTitle;
    type: 'ANIME' | 'MANGA';
    format: string; // Ex: TV, MOVIE, OVA, ONA, SPECIAL
    genres: string[];
    description: string | null;
    startDate: {
        year: number;
    };
    coverImage: {
        large: string;
    };
    bannerImage: string | null;
    externalLinks: AniListExternalLink[];
    status: string;
}

interface AniListResponse {
    data: {
        Page: {
            media: AniListMedia[];
        };
    };
}

/**
 * Consulta a API do AniList pelo nome do anime e tenta extrair o ID do IMDb (formato 'ttXXXXXXX')
 * dos links externos do resultado mais relevante, priorizando o tipo (filme/série).
 *
 * @param {string} animeName O nome do anime a ser pesquisado.
 * @param {'movie' | 'series'} desiredStremioType O tipo desejado (do Stremio) para filtrar o resultado.
 * @returns {Promise<string | null>} O ID do IMDb no formato 'ttXXXXXXX' se encontrado, ou null.
 */
export async function getImdbIdFromAniList(animeName: string, desiredStremioType: 'movie' | 'series'): Promise<string | null> {

    const query = `
        query ($search: String) {
            Page(page: 1, perPage: 10) { # Aumente perPage para ter mais resultados para filtrar
                media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                    id
                    title {
                        romaji
                        english
                    }
                    format # Precisamos do formato para filtrar
                    externalLinks {
                        url
                        site
                    }
                }
            }
        }
    `;

    const variables = {
        search: animeName
    };

    try {
        const response = await axios.post<AniListResponse>('https://graphql.anilist.co', {
            query: query,
            variables: variables
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        const media = response.data.data.Page.media;

        if (media && media.length > 0) {
            let selectedAniListInfo: AniListMedia | null = null;

            // Tenta encontrar o resultado que corresponde ao tipo desejado
            if (desiredStremioType === 'movie') {
                selectedAniListInfo = media.find(item => item.format === 'MOVIE') || null;
            } else if (desiredStremioType === 'series') {
                // AniList tem 'TV', 'OVA', 'ONA', 'SPECIAL' para séries
                selectedAniListInfo = media.find(item =>
                    item.format === 'TV' || item.format === 'OVA' || item.format === 'ONA' || item.format === 'SPECIAL'
                ) || null;
            }

            // Se não encontrou uma correspondência exata de tipo, use o primeiro resultado mais relevante
            if (!selectedAniListInfo) {
                selectedAniListInfo = media[0];
                console.log(`[AniList] Nenhuma correspondência exata de tipo (${desiredStremioType}) encontrada para "${animeName}". Usando o primeiro resultado (formato: ${selectedAniListInfo.format}).`);
            } else {
                 console.log(`[AniList] Correspondência de tipo (${desiredStremioType}) encontrada para "${selectedAniListInfo.title.romaji}" (formato: ${selectedAniListInfo.format}).`);
            }


            // Agora, extraia o IMDb ID do resultado selecionado
            const imdbLink = selectedAniListInfo.externalLinks?.find(link => link.site === 'IMDb');

            if (imdbLink) {
                const match = imdbLink.url.match(/title\/(tt\d+)/);
                if (match && match[1]) {
                    const imdbId = match[1];
                    return imdbId;
                }
            }
            console.log(`[AniList] Nenhum link do IMDb encontrado no resultado selecionado do AniList para: "${selectedAniListInfo.title.romaji}"`);
            return null; // Nenhum link IMDb encontrado
        } else {
            console.log(`[AniList] Nenhum anime encontrado no AniList para a pesquisa: "${animeName}" (Tipo: ${desiredStremioType})`);
            return null; // Nenhum anime encontrado
        }
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            console.error(`[AniList] Erro ao buscar no AniList para "${animeName}" (Status: ${error.response.status}):`, error.response.data);
        } else {
            console.error(`[AniList] Erro desconhecido ao buscar no AniList para "${animeName}":`, error);
        }
        return null;
    }
}