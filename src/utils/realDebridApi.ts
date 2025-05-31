import axios from 'axios';

const REALDEBRID_API_BASE = 'https://api.real-debrid.com/rest/1.0';

let realDebridAuthToken: string | null = null; 
import { parseFileEpisodeInfo } from './parseUtils';

export function setRealDebridAuthToken(token: string) {
    if (!token || token.trim() === '') {
        realDebridAuthToken = null;
        return;
    }
    realDebridAuthToken = token.trim();
}

async function makeRdRequest(endpoint: string, method: 'get' | 'post' | 'put' | 'delete' = 'get', data?: any): Promise<any> {
    if (!realDebridAuthToken) {
        throw new Error('Real-Debrid API token não está definido. Configure-o primeiro.');
    }

    const headers: { [key: string]: string } = {
        'Authorization': `Bearer ${realDebridAuthToken}`,
    };

    if (method === 'post') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const url = `${REALDEBRID_API_BASE}${endpoint}`;

    try {
        let response;
        if (method === 'post') {
            response = await axios.post(url, new URLSearchParams(data).toString(), { headers });
        } else if (method === 'put') {
            response = await axios.put(url, new URLSearchParams(data).toString(), { headers });
        } else if (method === 'delete') {
            response = await axios.delete(url, { headers });
        } else {
            response = await axios.get(url, { headers, params: data });
        }
        return response.data;
    } catch (error: any) {
        const status = error.response?.status;
        const responseData = error.response?.data;
        throw new Error(`Real-Debrid API Error (${status || 'Unknown'}): ${responseData?.error || error.message}`);
    }
}

export async function addTorrent(magnetLink: string): Promise<{ id: string; uri?: string; error?: string }> {
    try {
        const response = await makeRdRequest('/torrents/addMagnet', 'post', {
            magnet: magnetLink
        });

        if (response && response.id) {
            return { id: response.id, uri: response.uri };
        } else {
            return { id: '', error: response?.error || 'No ID returned from Real-Debrid.' };
        }
    } catch (error: any) {
        return { id: '', error: error.message }; 
    }
}

export async function getTorrentInfo(torrentId: string): Promise<any> {
    return await makeRdRequest(`/torrents/info/${torrentId}`, 'get');
}

export async function selectFilesInTorrent(torrentId: string, fileIds: string): Promise<any> {
    return await makeRdRequest(`/torrents/selectFiles/${torrentId}`, 'post', {
        files: fileIds
    });
}

export async function unrestrictLink(link: string): Promise<string> {
    const response = await makeRdRequest('/unrestrict/link', 'post', {
        link: link
    });
    if (response && response.download) {
        return response.download;
    }
    throw new Error('No direct download link returned from Real-Debrid unrestrict.');
}

export async function processMagnetForStreaming(magnetLink: string, targetFileHint?: string): Promise<string | null> {
    try {
        const addResponse = await addTorrent(magnetLink);
        const torrentId = addResponse.id;
        if (!torrentId) {
            return null;
        }

        let torrentInfo: any;
        let attempts = 0;
        const maxAttempts = 20; 
        const pollInterval = 2000; 
        let filesSelected = false;

        let selectedFileId: number | null = null; 

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            torrentInfo = await getTorrentInfo(torrentId);
            
            if (torrentInfo && torrentInfo.files && torrentInfo.files.length > 0) {
                if (torrentInfo.status === 'waiting_files_selection' && !filesSelected) {
                    let targetSeasonFromHint: number | undefined;
                    let targetEpisodeFromHint: number | undefined;

                    if (targetFileHint) {
                        const hintMatch = targetFileHint.match(/S(\d+)E(\d+)/i);
                        if (hintMatch) {
                            targetSeasonFromHint = parseInt(hintMatch[1], 10);
                            targetEpisodeFromHint = parseInt(hintMatch[2], 10);
                        } else {
                            const seasonHintMatch = targetFileHint.match(/S(\d+)/i);
                            if (seasonHintMatch) {
                                targetSeasonFromHint = parseInt(seasonHintMatch[1], 10);
                            }
                        }
                    }

                    let bestMatchFile: any | null = null;
                    let bestMatchScore = -1;

                    for (const file of torrentInfo.files) {
                        const filePathLower = file.path.toLowerCase();
                        const fileName = file.path.split('/').pop() || file.path;

                        if (!filePathLower.match(/\.(mkv|mp4|avi|webm|flv)$/i) || 
                            filePathLower.match(/\.(rar|zip|txt|nfo|url|html|jpg|jpeg|png|gif|exe|srt|idx|sub|idx)$/i) || 
                            file.bytes < 50 * 1024 * 1024 
                        ) { 
                            continue;
                        }

                        const { season: fileSeason, episode: fileEpisode } = parseFileEpisodeInfo(fileName);
                        let currentScore = 0;

                        if (targetSeasonFromHint !== undefined && targetEpisodeFromHint !== undefined) {
                            if (fileSeason === targetSeasonFromHint && fileEpisode === targetEpisodeFromHint) {
                                currentScore += 1000;
                            } else if (targetSeasonFromHint === 1 && fileSeason === undefined && fileEpisode === targetEpisodeFromHint) {
                                currentScore += 900;
                            } else if (filePathLower.includes(`s${String(targetSeasonFromHint).padStart(2, '0')}e${String(targetEpisodeFromHint).padStart(2, '0')}`)) {
                                currentScore += 950;
                            }
                        } else if (targetSeasonFromHint !== undefined) {
                            if (fileSeason === targetSeasonFromHint) {
                                currentScore += 500;
                            } else if (targetSeasonFromHint === 1 && fileSeason === undefined) {
                                currentScore += 400;
                            }
                        } else {
                            if (fileEpisode !== undefined) {
                                currentScore += 300;
                            }
                        }
                        
                        if (filePathLower.includes('1080p') || filePathLower.includes('fhd')) {
                            currentScore += 50;
                        } else if (filePathLower.includes('720p') || filePathLower.includes('hd')) {
                            currentScore += 30;
                        } else if (filePathLower.includes('480p') || filePathLower.includes('sd')) {
                            currentScore += 10;
                        }

                        currentScore += file.bytes / (1024 * 1024 * 5);

                        if (currentScore > bestMatchScore) {
                            bestMatchScore = currentScore;
                            bestMatchFile = file;
                        }
                    }

                    if (bestMatchFile) {
                        selectedFileId = bestMatchFile.id;
                    } else {
                        const videoFiles = torrentInfo.files.filter((f: any) => 
                            f.path.toLowerCase().match(/\.(mkv|mp4|avi|webm|flv)$/i) && f.bytes > 50 * 1024 * 1024
                        );
                        if (videoFiles.length > 0) {
                            videoFiles.sort((a: any, b: any) => b.bytes - a.bytes);
                            bestMatchFile = videoFiles[0];
                            selectedFileId = bestMatchFile.id;
                        } else {
                            await makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => {});
                            return null;
                        }
                    }

                    if (selectedFileId !== null) {
                        await selectFilesInTorrent(torrentId, selectedFileId.toString());
                        filesSelected = true; 
                    } else {
                        await makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => {});
                        return null;
                    }
                }
                
                if (torrentInfo.status === 'downloaded' && torrentInfo.links && torrentInfo.links.length > 0) {
                    break; 
                }
            }

            attempts++;
        }

        if (!torrentInfo || torrentInfo.status !== 'downloaded' || !torrentInfo.links || torrentInfo.links.length === 0) {
            await makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => {});
            return null;
        }

        let finalStreamingLink: string | null = null;

        if (torrentInfo && torrentInfo.links && torrentInfo.links.length > 0 && selectedFileId !== null) {
            const initialDownloadLink = torrentInfo.links[0];

            try {
                const unrestrictResponse = await makeRdRequest('/unrestrict/link', 'post', new URLSearchParams({
                    link: initialDownloadLink
                }));

                if (unrestrictResponse && unrestrictResponse.download) {
                    finalStreamingLink = unrestrictResponse.download;
                }
            } catch (unrestrictError: any) {
                // Error handling is kept, but its internal logging is removed.
            }
        } else {
            // Error handling is kept, but its internal logging is removed.
        }

        if (!finalStreamingLink) {
            await makeRdRequest(`/torrents/delete/${torrentId}`, 'delete').catch(() => {});
            return null;
        }

        return finalStreamingLink;

    } catch (error: any) {
        if (error.torrentId) {
            await makeRdRequest(`/torrents/delete/${error.torrentId}`, 'delete').catch(() => {});
        }
        return null;
    }
}