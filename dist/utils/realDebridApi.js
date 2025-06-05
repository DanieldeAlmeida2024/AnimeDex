"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRealDebridAuthToken = setRealDebridAuthToken;
exports.addTorrent = addTorrent;
exports.getTorrentInfo = getTorrentInfo;
exports.selectFilesInTorrent = selectFilesInTorrent;
exports.unrestrictLink = unrestrictLink;
exports.processMagnetForStreaming = processMagnetForStreaming;
const axios_1 = __importDefault(require("axios"));
const REALDEBRID_API_BASE = 'https://api.real-debrid.com/rest/1.0';
let realDebridAuthToken = null;
const parseUtils_1 = require("./parseUtils");
function setRealDebridAuthToken(token) {
    if (!token || token.trim() === '') {
        realDebridAuthToken = null;
        return;
    }
    realDebridAuthToken = token.trim();
}
function makeRdRequest(endpoint_1) {
    return __awaiter(this, arguments, void 0, function* (endpoint, method = 'get', data) {
        var _a, _b;
        if (!realDebridAuthToken) {
            throw new Error('Real-Debrid API token não está definido. Configure-o primeiro.');
        }
        const headers = {
            'Authorization': `Bearer ${realDebridAuthToken}`,
        };
        if (method === 'post') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        const url = `${REALDEBRID_API_BASE}${endpoint}`;
        try {
            let response;
            if (method === 'post') {
                response = yield axios_1.default.post(url, new URLSearchParams(data).toString(), { headers });
            }
            else if (method === 'put') {
                response = yield axios_1.default.put(url, new URLSearchParams(data).toString(), { headers });
            }
            else if (method === 'delete') {
                response = yield axios_1.default.delete(url, { headers });
            }
            else {
                response = yield axios_1.default.get(url, { headers, params: data });
            }
            return response.data;
        }
        catch (error) {
            const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
            const responseData = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data;
            throw new Error(`Real-Debrid API Error (${status || 'Unknown'}): ${(responseData === null || responseData === void 0 ? void 0 : responseData.error) || error.message}`);
        }
    });
}
function addTorrent(magnetLink) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield makeRdRequest('/torrents/addMagnet', 'post', {
                magnet: magnetLink
            });
            if (response && response.id) {
                return { id: response.id, uri: response.uri };
            }
            else {
                return { id: '', error: (response === null || response === void 0 ? void 0 : response.error) || 'No ID returned from Real-Debrid.' };
            }
        }
        catch (error) {
            return { id: '', error: error.message };
        }
    });
}
function getTorrentInfo(torrentId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield makeRdRequest(`/torrents/info/${torrentId}`, 'get');
    });
}
function selectFilesInTorrent(torrentId, fileIds) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield makeRdRequest(`/torrents/selectFiles/${torrentId}`, 'post', {
            files: fileIds
        });
    });
}
function unrestrictLink(link) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield makeRdRequest('/unrestrict/link', 'post', {
            link: link
        });
        if (response && response.download) {
            return response.download;
        }
        throw new Error('No direct download link returned from Real-Debrid unrestrict.');
    });
}
function processMagnetForStreaming(magnetLink, targetFileHint) {
    return __awaiter(this, void 0, void 0, function* () {
        let torrentId = null;
        try {
            const addResponse = yield addTorrent(magnetLink);
            torrentId = addResponse.id;
            if (!torrentId) {
                console.warn("Falha ao adicionar o torrent ao Real-Debrid. ID do torrent nulo.");
                return null;
            }
            let torrentInfo;
            let attempts = 0;
            const maxAttempts = 20; // Número máximo de tentativas para obter informações do torrent
            const pollInterval = 2000; // Intervalo entre as tentativas (2 segundos)
            let targetSeasonFromHint;
            let targetEpisodeFromHint;
            // Extrai temporada e episódio do hint, se fornecido (ex: "S05E04")
            if (targetFileHint) {
                const hintMatch = targetFileHint.match(/S(\d+)E(\d+)/i);
                if (hintMatch) {
                    targetSeasonFromHint = parseInt(hintMatch[1], 10);
                    targetEpisodeFromHint = parseInt(hintMatch[2], 10);
                }
                else {
                    const seasonHintMatch = targetFileHint.match(/S(\d+)/i);
                    if (seasonHintMatch) {
                        targetSeasonFromHint = parseInt(seasonHintMatch[1], 10);
                    }
                }
            }
            // Aguarda o Real-Debrid processar o torrent e listar os arquivos
            while (attempts < maxAttempts) {
                yield new Promise(resolve => setTimeout(resolve, pollInterval));
                torrentInfo = yield getTorrentInfo(torrentId);
                if (torrentInfo && torrentInfo.files && torrentInfo.files.length > 0) {
                    // Se o status indica que a seleção de arquivos é necessária
                    if (torrentInfo.status === 'waiting_files_selection') {
                        let bestMatchFile = null;
                        let bestMatchScore = -Infinity; // Inicia com pontuação bem baixa para garantir que qualquer match melhore
                        for (const file of torrentInfo.files) {
                            const filePathLower = file.path.toLowerCase();
                            const fileName = file.path.split('/').pop() || file.path;
                            // Pula arquivos irrelevantes ou muito pequenos
                            if (!filePathLower.match(/\.(mkv|mp4|avi|webm|flv)$/i) || // Apenas arquivos de vídeo
                                filePathLower.match(/\.(rar|zip|txt|nfo|url|html|jpg|jpeg|png|gif|exe|srt|idx|sub)$/i) || // Exclui formatos não-vídeo
                                file.bytes < 50 * 1024 * 1024 // Tamanho mínimo de 50MB para ser um vídeo principal
                            ) {
                                continue;
                            }
                            // Parseia as informações do episódio, passando a temporada esperada para inferência
                            const episodeInfo = (0, parseUtils_1.parseEpisodeInfo)(fileName, targetSeasonFromHint || null);
                            const fileSeason = episodeInfo ? episodeInfo.season : undefined;
                            const fileEpisode = episodeInfo ? episodeInfo.episode : undefined;
                            let currentScore = 0;
                            // --- Lógica de Pontuação para Seleção do Episódio ---
                            if (targetEpisodeFromHint !== undefined) {
                                // Se um episódio específico foi solicitado (SXXEXX)
                                if (fileEpisode === targetEpisodeFromHint) {
                                    currentScore += 1000; // Match Perfeito: Episódio exato
                                    // Adiciona pontuação extra se a temporada também bater ou for inferida corretamente
                                    if (fileSeason === targetSeasonFromHint) {
                                        currentScore += 100;
                                    }
                                    else if (targetSeasonFromHint === 1 && fileSeason === undefined) {
                                        currentScore += 50; // Temporada 1 implícita
                                    }
                                    console.log(`DEBUG: Episódio ${targetEpisodeFromHint} encontrado em: ${fileName} com score ${currentScore}`);
                                }
                                else {
                                    // Não é o episódio desejado
                                    currentScore -= 700;
                                    console.log(`DEBUG: Nenhum match claro para ${targetFileHint} em: ${fileName} com score ${currentScore}`);
                                }
                            }
                            else {
                                // Cenário: Nenhuma dica específica de episódio (filmes ou busca muito genérica dentro da temporada)
                                // Prioriza arquivos que tenham um número de episódio detectável (indicando série)
                                if (fileEpisode !== undefined) {
                                    currentScore += 300;
                                }
                                // Para filmes ou conteúdo principal, prioriza o maior arquivo se não houver numeração.
                                else if (file.bytes > 500 * 1024 * 1024) { // Maior que 500MB, pode ser um filme
                                    currentScore += 100;
                                }
                            }
                            // --- Pontuação por Qualidade do Vídeo ---
                            if (filePathLower.includes('2160p') || filePathLower.includes('4k')) {
                                currentScore += 100;
                            }
                            else if (filePathLower.includes('1080p') || filePathLower.includes('fhd')) {
                                currentScore += 50;
                            }
                            else if (filePathLower.includes('720p') || filePathLower.includes('hd')) {
                                currentScore += 30;
                            }
                            else if (filePathLower.includes('480p') || filePathLower.includes('sd')) {
                                currentScore += 10;
                            }
                            // --- Pontuação por Tipo de Release (opcional, pode ser ajustado) ---
                            if (filePathLower.includes('webrip')) {
                                currentScore += 5;
                            }
                            if (filePathLower.includes('bluray') || filePathLower.includes('bdrip')) {
                                currentScore += 10;
                            }
                            // --- Pontuação pelo Tamanho do Arquivo (relevante para qualidade e conteúdo principal) ---
                            currentScore += file.bytes / (1024 * 1024 * 20); // 1 ponto a cada 20MB para ajustar a escala
                            // Atualiza o melhor arquivo encontrado
                            if (currentScore > bestMatchScore) {
                                bestMatchScore = currentScore;
                                bestMatchFile = file;
                            }
                        } // Fim do loop de arquivos
                        // --- Decisão Final de Seleção do Arquivo ---
                        let selectedFileId = null;
                        if (bestMatchFile) {
                            // Se um episódio específico foi solicitado (targetEpisodeFromHint !== undefined)
                            // E a melhor pontuação ainda é baixa (abaixo de 800, que é um match de episódio sem temporada explícita),
                            // isso indica que o torrent NÃO contém o episódio exato com um nome claro.
                            if (targetEpisodeFromHint !== undefined && bestMatchScore < 800) {
                                console.warn(`Alerta: Torrent '${torrentInfo.title || 'Unknown Torrent'}' adicionado, mas o melhor arquivo (${bestMatchFile.path}) para ${targetFileHint} teve pontuação baixa (${bestMatchScore}). Isso sugere que o torrent NÃO contém o episódio exato com um nome claro. Deletando o torrent e retornando null para tentar outro.`);
                                yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(e => console.error("Erro ao deletar torrent após seleção ruim:", e));
                                return null; // Força a aplicação cliente a tentar o próximo torrent
                            }
                            selectedFileId = bestMatchFile.id;
                            console.log(`Selecionado arquivo: ${bestMatchFile.path} com pontuação: ${bestMatchScore}`);
                        }
                        else {
                            // Não foram encontrados arquivos de vídeo válidos para seleção.
                            console.warn(`Nenhum arquivo de vídeo adequado encontrado no torrent '${torrentInfo.title || 'Unknown Torrent'}'. Deletando torrent.`);
                            yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(e => console.error("Erro ao deletar torrent sem arquivos de vídeo:", e));
                            return null;
                        }
                        // Se um arquivo foi selecionado, notifica o Real-Debrid
                        if (selectedFileId !== null) {
                            yield selectFilesInTorrent(torrentId, selectedFileId.toString());
                        }
                        else {
                            console.warn("Nenhum arquivo foi selecionado, deletando o torrent.");
                            yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(e => console.error("Erro ao deletar torrent (nenhum arquivo selecionado):", e));
                            return null;
                        }
                    }
                    // Se o torrent já estiver baixado ou pronto para streaming
                    if (torrentInfo.status === 'downloaded' && torrentInfo.links && torrentInfo.links.length > 0) {
                        break; // Sai do loop de polling
                    }
                }
                attempts++;
                if (attempts === maxAttempts) {
                    console.warn(`Tempo esgotado esperando pelo torrent '${(torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.title) || 'Unknown Torrent'}' ou seleção de arquivo. Deletando torrent.`);
                    yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(e => console.error("Erro ao deletar torrent (nenhum arquivo selecionado):", e));
                    return null;
                }
            } // Fim do while (polling)
            // --- Pós-seleção/download: Obter e unrestringir o link de streaming ---
            if (!torrentInfo || torrentInfo.status !== 'downloaded' || !torrentInfo.links || torrentInfo.links.length === 0) {
                console.error(`Torrent '${(torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.title) || 'Unknown Torrent'}' não baixado ou sem links disponíveis.`);
                return null;
            }
            let finalStreamingLink = null;
            const initialDownloadLink = torrentInfo.links[0]; // Real-Debrid geralmente retorna o link do arquivo selecionado aqui
            try {
                const unrestrictResponse = yield makeRdRequest('/unrestrict/link', 'post', new URLSearchParams({
                    link: initialDownloadLink
                }));
                if (unrestrictResponse && unrestrictResponse.download) {
                    finalStreamingLink = unrestrictResponse.download;
                }
                else {
                    console.error("Unrestrict link não retornou um link de download válido.");
                }
            }
            catch (unrestrictError) {
                console.error(`Erro ao unrestringir link para torrent '${(torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.title) || 'Unknown Torrent'}': ${unrestrictError.message}`);
            }
            if (!finalStreamingLink) {
                return null;
            }
            return finalStreamingLink;
        }
        catch (error) {
            console.error(`Erro inesperado em processMagnetForStreaming: ${error.message}`, error);
            // Tenta deletar o torrent se um ID foi obtido antes do erro
            if (torrentId) {
                yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(e => console.error("Erro ao deletar torrent no catch final:", e));
            }
            return null;
        }
    });
}
