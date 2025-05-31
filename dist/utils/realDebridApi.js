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
/**
 * Define o token de autenticação do Real-Debrid.
 * Este token deve ser obtido da sua conta Real-Debrid.
 * @param token O token de API do Real-Debrid.
 */
function setRealDebridAuthToken(token) {
    if (!token || token.trim() === '') {
        console.error('[RealDebrid] Real-Debrid API token não pode ser vazio. Verifique sua configuração.');
        realDebridAuthToken = null;
        return;
    }
    realDebridAuthToken = token.trim();
    console.log('[RealDebrid] Auth token set.');
}
/**
 * Função utilitária para fazer requisições à API do Real-Debrid.
 * Inclui o token de autenticação e trata erros comuns.
 * @param endpoint O endpoint da API (ex: '/torrents/addMagnet').
 * @param method O método HTTP ('get', 'post', 'put').
 * @param data Os dados para enviar (para POST/PUT) ou parâmetros (para GET).
 * @returns A resposta da API.
 * @throws Erro se a requisição falhar ou o token não estiver definido.
 */
function makeRdRequest(endpoint_1) {
    return __awaiter(this, arguments, void 0, function* (endpoint, method = 'get', data) {
        var _a, _b;
        if (!realDebridAuthToken) {
            throw new Error('Real-Debrid API token não está definido. Configure-o primeiro.');
        }
        const headers = {
            'Authorization': `Bearer ${realDebridAuthToken}`,
        };
        // Para requisições POST com magnet links, o Real-Debrid geralmente espera application/x-www-form-urlencoded
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
            console.error(`[RealDebrid] Erro na requisição para ${endpoint} (Status: ${status}):`, responseData || error.message);
            // Lançar um erro com mais detalhes para ser capturado pela função chamadora
            throw new Error(`Real-Debrid API Error (${status || 'Unknown'}): ${(responseData === null || responseData === void 0 ? void 0 : responseData.error) || error.message}`);
        }
    });
}
/**
 * Adiciona um magnet link ao Real-Debrid.
 * @param magnetLink O magnet link a ser adicionado.
 * @returns Um objeto contendo o ID do torrent e URI, ou um erro.
 */
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
                // Caso a API retorne algo inesperado ou um erro sem o campo 'error'
                return { id: '', error: (response === null || response === void 0 ? void 0 : response.error) || 'No ID returned from Real-Debrid.' };
            }
        }
        catch (error) {
            // Captura erros lançados por makeRdRequest
            return { id: '', error: error.message };
        }
    });
}
/**
 * Obtém informações sobre um torrent específico no Real-Debrid.
 * @param torrentId O ID do torrent.
 * @returns As informações do torrent.
 */
function getTorrentInfo(torrentId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield makeRdRequest(`/torrents/info/${torrentId}`, 'get');
    });
}
/**
 * Seleciona arquivos em um torrent para download/streaming.
 * @param torrentId O ID do torrent.
 * @param fileIds Uma string de IDs de arquivo separados por vírgula (ex: "0,1,2").
 * @returns A resposta da API.
 */
function selectFilesInTorrent(torrentId, fileIds) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield makeRdRequest(`/torrents/selectFiles/${torrentId}`, 'post', {
            files: fileIds
        });
    });
}
/**
 * Desrestringe um link direto para obter a URL de streaming.
 * @param link O link restrito do Real-Debrid.
 * @returns O link direto para streaming.
 */
function unrestrictLink(link) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield makeRdRequest('/unrestrict/link', 'post', {
            link: link
        });
        // A API de unrestrict/link retorna o link direto em response.download
        if (response && response.download) {
            return response.download;
        }
        throw new Error('No direct download link returned from Real-Debrid unrestrict.');
    });
}
// src/utils/realDebridApi.ts (apenas a função processMagnetForStreaming alterada)
// ... (outras imports e a função makeRdRequest, getTorrentInfo, addTorrent, selectFilesInTorrent) ...
function processMagnetForStreaming(magnetLink, targetFileHint) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const addResponse = yield addTorrent(magnetLink);
            const torrentId = addResponse.id;
            if (!torrentId) {
                console.error('[RealDebrid] Falha ao adicionar magnet (no ID):', addResponse.error || 'Erro desconhecido');
                return null;
            }
            console.log(`[RealDebrid] Magnet adicionado. Torrent ID: ${torrentId}`);
            let torrentInfo; // Mantenha o tipo 'any' ou adicione uma interface para torrentInfo
            let attempts = 0;
            const maxAttempts = 20;
            const pollInterval = 2000;
            let filesSelected = false; // Flag para saber se já selecionamos os arquivos
            // *************** AQUI ESTÁ A CORREÇÃO ***************
            // Declare selectedFileId fora do loop, inicialize como null
            let selectedFileId = null;
            // ****************************************************
            while (attempts < maxAttempts) {
                yield new Promise(resolve => setTimeout(resolve, pollInterval));
                torrentInfo = yield getTorrentInfo(torrentId);
                console.log(`[RealDebrid] Aguardando torrent ${torrentId} ficar pronto... Tentativa ${attempts + 1}/${maxAttempts}, Status: ${torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.status}`);
                // *******************************************************************
                // NOVO LOG AQUI para ver o estado de torrentInfo.files
                console.log(`[RealDebrid] Files length: ${(_a = torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.files) === null || _a === void 0 ? void 0 : _a.length}, filesSelected: ${filesSelected}`);
                // *******************************************************************
                if (torrentInfo && torrentInfo.files && torrentInfo.files.length > 0) {
                    // Se o status é 'waiting_files_selection' e ainda não selecionamos os arquivos
                    if (torrentInfo.status === 'waiting_files_selection' && !filesSelected) {
                        console.log(`[RealDebrid] Status é 'waiting_files_selection'. Tentando selecionar arquivos...`);
                        let targetSeasonFromHint;
                        let targetEpisodeFromHint;
                        if (targetFileHint) {
                            const hintMatch = targetFileHint.match(/S(\d+)E(\d+)/i);
                            if (hintMatch) {
                                targetSeasonFromHint = parseInt(hintMatch[1], 10);
                                targetEpisodeFromHint = parseInt(hintMatch[2], 10);
                                console.log(`[RealDebrid] Hint do target: S${targetSeasonFromHint}E${targetEpisodeFromHint}`);
                            }
                            else {
                                const seasonHintMatch = targetFileHint.match(/S(\d+)/i);
                                if (seasonHintMatch) {
                                    targetSeasonFromHint = parseInt(seasonHintMatch[1], 10);
                                    console.log(`[RealDebrid] Hint do target: S${targetSeasonFromHint} (apenas temporada).`);
                                }
                            }
                        }
                        let bestMatchFile = null;
                        let bestMatchScore = -1;
                        for (const file of torrentInfo.files) {
                            const filePathLower = file.path.toLowerCase();
                            const fileName = file.path.split('/').pop() || file.path;
                            // Adicione mais extensões de vídeo comuns se necessário, e verifique o tamanho mínimo
                            if (!filePathLower.match(/\.(mkv|mp4|avi|webm|flv)$/i) ||
                                filePathLower.match(/\.(rar|zip|txt|nfo|url|html|jpg|jpeg|png|gif|exe|srt|idx|sub|idx)$/i) ||
                                file.bytes < 50 * 1024 * 1024 // 50 MB
                            ) {
                                continue;
                            }
                            const { season: fileSeason, episode: fileEpisode } = (0, parseUtils_1.parseFileEpisodeInfo)(fileName);
                            let currentScore = 0;
                            console.log(`[RealDebrid] Avaliando arquivo: "${fileName}" (S: ${fileSeason}, E: ${fileEpisode})`);
                            if (targetSeasonFromHint !== undefined && targetEpisodeFromHint !== undefined) {
                                if (fileSeason === targetSeasonFromHint && fileEpisode === targetEpisodeFromHint) {
                                    currentScore += 1000; // Pontuação alta para match exato
                                    console.log(`[RealDebrid] -> Match exato S${targetSeasonFromHint}E${targetEpisodeFromHint}.`);
                                }
                                else if (targetSeasonFromHint === 1 && fileSeason === undefined && fileEpisode === targetEpisodeFromHint) {
                                    currentScore += 900; // Match de episódio, assumindo S1
                                    console.log(`[RealDebrid] -> Match E${targetEpisodeFromHint}, assumindo S1.`);
                                }
                                else if (filePathLower.includes(`s${String(targetSeasonFromHint).padStart(2, '0')}e${String(targetEpisodeFromHint).padStart(2, '0')}`)) {
                                    currentScore += 950; // Match por string para SXXEXX
                                    console.log(`[RealDebrid] -> Match por string S${targetSeasonFromHint}E${targetEpisodeFromHint}.`);
                                }
                            }
                            else if (targetSeasonFromHint !== undefined) {
                                if (fileSeason === targetSeasonFromHint) {
                                    currentScore += 500; // Match de temporada
                                    console.log(`[RealDebrid] -> Match temporada S${targetSeasonFromHint}.`);
                                }
                                else if (targetSeasonFromHint === 1 && fileSeason === undefined) {
                                    currentScore += 400; // Match temporada S1 implícita
                                    console.log(`[RealDebrid] -> Match temporada S1 implícita.`);
                                }
                            }
                            else {
                                if (fileEpisode !== undefined) {
                                    currentScore += 300; // Prioriza arquivos com número de episódio se não há hint de temporada
                                    console.log(`[RealDebrid] -> Arquivo com episódio (E${fileEpisode}).`);
                                }
                            }
                            // Pontuação por qualidade
                            if (filePathLower.includes('1080p') || filePathLower.includes('fhd')) {
                                currentScore += 50;
                            }
                            else if (filePathLower.includes('720p') || filePathLower.includes('hd')) {
                                currentScore += 30;
                            }
                            else if (filePathLower.includes('480p') || filePathLower.includes('sd')) {
                                currentScore += 10;
                            }
                            // Pontuação por tamanho do arquivo (para preferir arquivos maiores/melhores versões)
                            currentScore += file.bytes / (1024 * 1024 * 5); // Cada 5MB = 1 ponto
                            console.log(`[RealDebrid] -> Pontuação total: ${currentScore}`);
                            if (currentScore > bestMatchScore) {
                                bestMatchScore = currentScore;
                                bestMatchFile = file;
                                console.log(`[RealDebrid] -> Novo melhor match encontrado: ${bestMatchFile.path} (Score: ${bestMatchScore})`);
                            }
                        }
                        if (bestMatchFile) {
                            selectedFileId = bestMatchFile.id; // <--- AQUI selectedFileId é setado
                            console.log(`[RealDebrid] Selecionado arquivo para desrestrição: ${bestMatchFile.path} (ID: ${selectedFileId}, Score: ${bestMatchScore})`);
                        }
                        else {
                            // Fallback: se nenhum arquivo foi selecionado por pontuação, tenta o maior arquivo de vídeo
                            const videoFiles = torrentInfo.files.filter((f) => f.path.toLowerCase().match(/\.(mkv|mp4|avi|webm|flv)$/i) && f.bytes > 50 * 1024 * 1024);
                            if (videoFiles.length > 0) {
                                videoFiles.sort((a, b) => b.bytes - a.bytes); // Ordena por tamanho descendente
                                bestMatchFile = videoFiles[0];
                                selectedFileId = bestMatchFile.id; // <--- AQUI selectedFileId é setado no fallback
                                console.warn(`[RealDebrid] Fallback: Selecionando o maior arquivo de vídeo encontrado: ${bestMatchFile.path}`);
                            }
                            else {
                                console.error('[RealDebrid] Nenhum arquivo de vídeo válido encontrado no torrent para seleção.');
                                yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => { });
                                return null;
                            }
                        }
                        // Se um arquivo foi selecionado, faça a chamada à API
                        if (selectedFileId !== null) { // Garante que selectedFileId não é null
                            yield selectFilesInTorrent(torrentId, selectedFileId.toString());
                            filesSelected = true;
                            console.log(`[RealDebrid] Arquivos selecionados para torrent ${torrentId}.`);
                        }
                        else {
                            console.error('[RealDebrid] selectedFileId ficou null após a lógica de seleção. Erro inesperado.');
                            yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => { });
                            return null;
                        }
                    }
                    // Se o status for 'downloaded' e houver links, podemos sair do loop
                    if (torrentInfo.status === 'downloaded' && torrentInfo.links && torrentInfo.links.length > 0) {
                        console.log(`[RealDebrid] Torrent ${torrentId} está "downloaded" e tem links. Finalizando polling.`);
                        // *******************************************************************
                        // NOVO LOG AQUI para ver os links antes de sair do loop
                        console.log(`[RealDebrid] Links disponíveis para torrent ${torrentId}:`, torrentInfo.links);
                        // *******************************************************************
                        break;
                    }
                }
                attempts++;
            }
            // *************** AQUI ESTÁ A CONTINUAÇÃO DA CORREÇÃO ***************
            // Após o loop, use o selectedFileId que foi setado
            if (!torrentInfo || torrentInfo.status !== 'downloaded' || !torrentInfo.links || torrentInfo.links.length === 0) {
                console.error(`[RealDebrid] Torrent ${torrentId} não ficou pronto (status: ${torrentInfo === null || torrentInfo === void 0 ? void 0 : torrentInfo.status}) ou não tem arquivos após polling.`);
                yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => { });
                return null;
            }
            console.log(`[RealDebrid] Verificando selectedFileId para link final: ${selectedFileId}`);
            // Encontra o link correspondente ao selectedFileId
            let finalStreamingLink = null;
            if (torrentInfo && torrentInfo.links && torrentInfo.links.length > 0 && selectedFileId !== null) {
                const initialDownloadLink = torrentInfo.links[0]; // Este é o link "https://real-debrid.com/d/..."
                console.log(`[RealDebrid] Tentando desrestringir o link: ${initialDownloadLink}`);
                try {
                    const unrestrictResponse = yield makeRdRequest('/unrestrict/link', 'post', new URLSearchParams({
                        link: initialDownloadLink
                    }));
                    if (unrestrictResponse && unrestrictResponse.download) {
                        finalStreamingLink = unrestrictResponse.download; // Este é o link direto de streaming!
                        console.log(`[RealDebrid] Link de streaming direto obtido: ${finalStreamingLink}`);
                    }
                    else {
                        console.error('[RealDebrid] Falha ao desrestringir o link. Resposta:', unrestrictResponse);
                    }
                }
                catch (unrestrictError) {
                    console.error(`[RealDebrid] Erro ao chamar /unrestrict/link:`, unrestrictError.message);
                }
            }
            else {
                console.error('[RealDebrid] Não foi possível obter o link inicial do torrent ou selectedFileId é null.');
            }
            if (!finalStreamingLink) {
                console.error(`[RealDebrid] Torrent ${torrentId} não resultou em um link de streaming válido.`);
                yield makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => { });
                return null;
            }
            return finalStreamingLink;
        }
        catch (error) {
            console.error(`[RealDebrid] Erro no processamento do magnet:`, error.message, error.stack);
            // Se houver um torrentId, tente deletá-lo
            if (error.torrentId) {
                yield makeRdRequest(`/torrents/delete/${error.torrentId}`, 'delete').catch(() => { });
                console.log(`[RealDebrid] Torrent ${error.torrentId} deletado após erro.`);
            }
            return null;
        }
    });
}
