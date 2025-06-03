import axios from 'axios';
import {AniListMedia, AniListResponse} from './types/types'
/**
 * Consulta a API do AniList pelo nome do anime e tenta extrair o ID do IMDb (formato 'ttXXXXXXX')
 * dos links externos do resultado mais relevante, priorizando o tipo (filme/série).
 *
 * @param {string} animeName 
 * @param {'movie' | 'series'} desiredStremioType 
 * @returns {Promise<string | null>} 
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
                        native
                        userPreferred
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
                    (item.format === 'TV' || item.format === 'OVA' || item.format === 'ONA' || item.format === 'SPECIAL') && item.title.romaji === animeName
                ) || null;
            }

            // Se não encontrou uma correspondência exata de tipo, use o primeiro resultado mais relevante
            if (!selectedAniListInfo) {
                selectedAniListInfo = media.find(item => item.title.english === animeName) ?? null;
                console.log(`[AniList] Nenhuma correspondência exata de tipo (${desiredStremioType}) encontrada para "${animeName}". Usando o primeiro resultado (formato: ${selectedAniListInfo?.format}).`);
            } else {
                 console.log(`[AniList] Correspondência de tipo (${desiredStremioType}) encontrada para "${selectedAniListInfo.title.english}" (formato: ${selectedAniListInfo.format}).`);
            }


            // Agora, extraia o IMDb ID do resultado selecionado
            const imdbLink = selectedAniListInfo?.externalLinks?.find(link => link.site === 'IMDb');

            if (imdbLink) {
                const match = imdbLink.url.match(/title\/(tt\d+)/);
                if (match && match[1]) {
                    const imdbId = match[1];
                    return imdbId;
                }
            }
            console.log(`[AniList] Nenhum link do IMDb encontrado no resultado selecionado do AniList para: "${selectedAniListInfo?.title.romaji}"`);
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

export async function getAnimeFromAniList(animeName: string, secoundName: string, desiredStremioType: 'movie' | 'series'): Promise<AniListMedia | null> {
    animeName = animeName
        .replace(/Season|Temporada/gi, '') // Remove "Season" ou "Temporada"
        .replace(/\d+/g, '') // Remove todos os números
        .trim() // Remove espaços extras no início/fim
        .split(' ') // Divide a string em um array de palavras
        .join(' '); // Junta as palavras de volta em uma string, separadas por espaço 
    const query = `
        query ($search: String) {
            Page(page: 1, perPage: 10) { # Aumente perPage para ter mais resultados para filtrar
                media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                    id
                    title {
                        romaji
                        english
                        native
                        userPreferred
                    }
                    startDate {
                      year
                    }
                    type
                    genres
                    coverImage{
                        large
                    } 
                    bannerImage
                    status
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
            console.log(`[AniList] Resultado da consulta: ${media.find(item =>
                    item.format === 'TV' || 
                    item.format === 'OVA'  || 
                    item.format === 'ONA' || 
                    item.format === 'SPECIAL' 
                )}`)
            // Tenta encontrar o resultado que corresponde ao tipo desejado
            if (desiredStremioType === 'movie') {
                selectedAniListInfo = media.find(item => item.format === 'MOVIE') || null;
            } else if (desiredStremioType === 'series') {
                // AniList tem 'TV', 'OVA', 'ONA', 'SPECIAL' para séries
                selectedAniListInfo = media.find(item =>
                    item.format === 'TV' || 
                    item.format === 'OVA' || 
                    item.format === 'ONA' || 
                    item.format === 'SPECIAL'
                ) || null;
            }

            // Se não encontrou uma correspondência exata de tipo, use o primeiro resultado mais relevante
            if (!selectedAniListInfo) {
                selectedAniListInfo = media.find(item => item.title.english === secoundName) ?? null;
                console.log(`[AniList] Nenhuma correspondência exata de tipo (${desiredStremioType}) encontrada para "${animeName}". Usando o resultado com título em inglês igual a "${selectedAniListInfo?.title}" ou o primeiro resultado (formato: ${selectedAniListInfo?.format}).`);
            } else {
                 console.log(`[AniList] Correspondência de tipo (${desiredStremioType}) encontrada para "${selectedAniListInfo.title.romaji}" (formato: ${selectedAniListInfo.format}).`);
            }
            return selectedAniListInfo; // Nenhum link IMDb encontrado
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