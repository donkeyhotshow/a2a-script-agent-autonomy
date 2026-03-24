/**
 * Client-side rag-search execution and sync re-invoke chain (ISSUE 8b).
 * When A2A returns execute["rag-search"], run @a2a/rag against the project index and POST /invoke again.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { extractA2aExecute, mergeResponseContext, buildStepRecord } from './builders.js';
import { getProjectPathForSessions } from '../../storage/projectSessions.js';
import { saveRequestToServer, saveServerResponse, getNewStepDir } from '../../storage/newSessions.js';

function postInvokeJson(a2aServerUrl, body) {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const urlObj = new URL(`${a2aServerUrl.replace(/\/$/, '')}/api/v1/invoke`);
        const req = http.request(
            {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload, 'utf8'),
                },
            },
            (res) => {
                let data = '';
                res.on('data', (c) => {
                    data += c;
                });
                res.on('end', () => {
                    try {
                        if (!data || !data.trim()) {
                            resolve({ parsed: null, statusCode: res.statusCode });
                            return;
                        }
                        resolve({ parsed: JSON.parse(data), statusCode: res.statusCode });
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

export function getMaxRagChainDepth() {
    const v = process.env.A2A_AGENT_RAG_CHAIN_MAX;
    if (v === '0' || v === 'false') return 0;
    const n = parseInt(v ?? '8', 10);
    return Number.isFinite(n) && n >= 0 ? n : 8;
}

/**
 * @param {string} cwd - usually a2a-client root (Vite project)
 * @param {string} projectPath - repo root with .a2a/index
 * @param {object} ragPayload - execute["rag-search"]
 */
export async function runClientRagSearchForExecute(cwd, projectPath, ragPayload) {
    const query = ragPayload && typeof ragPayload.query === 'string' ? ragPayload.query : '';
    if (!query.trim()) {
        return { query: '', results: [], files: [], error: 'missing query' };
    }

    const distPath = path.join(cwd, 'packages', 'rag', 'dist', 'searcher', 'rag-searcher.js');
    if (!fs.existsSync(distPath)) {
        console.warn('[VitePlugin] RAG dist missing at', distPath, '— run: npm run build --prefix packages/rag');
        return { query, results: [], files: [], error: 'rag module not built' };
    }

    try {
        const mod = await import(pathToFileURL(distPath).href);
        const RAGSearcher = mod.RAGSearcher;
        if (!RAGSearcher) {
            return { query, results: [], files: [], error: 'RAGSearcher export missing' };
        }
        const searcher = new RAGSearcher({ projectPath });
        const protocol = await searcher.searchWithProtocol(query, {
            maxResults: ragPayload.limit ?? 20,
            page: ragPayload.page,
            pageSize: ragPayload.pageSize,
        });
        return { query: protocol.query ?? query, ...protocol };
    } catch (e) {
        console.error('[VitePlugin] RAG search failed:', e?.message || e);
        return { query, results: [], files: [], error: e?.message || String(e) };
    }
}

/**
 * Follow-up sync invokes while the latest response asks for execute["rag-search"].
 *
 * @returns {{ serverResponse: object, stepNum: number, savedContext: object }}
 */
export async function chainSyncInvokesForRagSearch({
    cwd,
    sessionId,
    a2aServerUrl,
    startStepNum,
    serverResponse,
    mergedContext,
    messages,
    maxDepth,
}) {
    const max = maxDepth ?? getMaxRagChainDepth();
    let lastResp = serverResponse;
    let ctx = mergeResponseContext(sessionId, mergedContext, serverResponse);
    let stepNum = startStepNum;

    if (max <= 0) {
        return { serverResponse: lastResp, stepNum, savedContext: ctx };
    }

    let depth = 0;
    while (depth < max) {
        const ex = extractA2aExecute(lastResp);
        const ragPayload = ex && ex['rag-search'];
        if (!ragPayload || typeof ragPayload.query !== 'string' || !ragPayload.query.trim()) {
            break;
        }

        depth += 1;
        const projectPath =
            process.env.A2A_RAG_PROJECT_PATH || process.env.A2A_PROJECT_PATH || getProjectPathForSessions(cwd);

        const ragResult = await runClientRagSearchForExecute(cwd, projectPath, ragPayload);
        stepNum += 1;

        const nextBody = { context: ctx, result: { 'rag-search': ragResult } };

        const stepDir = getNewStepDir(cwd, sessionId, stepNum);
        if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, { recursive: true });
        saveRequestToServer(cwd, sessionId, stepNum, nextBody);

        let parsed;
        let statusCode;
        try {
            ({ parsed, statusCode } = await postInvokeJson(a2aServerUrl, nextBody));
        } catch (e) {
            console.error('[VitePlugin] Chained invoke HTTP error:', e?.message || e);
            break;
        }

        if (!parsed || statusCode < 200 || statusCode >= 300) {
            console.error('[VitePlugin] Chained invoke failed', statusCode);
            break;
        }
        if (parsed.data?.promiseId) {
            console.log('[VitePlugin] Chained invoke returned promiseId — stopping RAG chain');
            lastResp = parsed;
            break;
        }

        lastResp = parsed;
        ctx = mergeResponseContext(sessionId, ctx, lastResp);

        const stepRecord = buildStepRecord({
            sessionId,
            stepNum,
            serverResponse: lastResp,
            messages: messages || [],
            fallbackContext: ctx,
        });
        if (stepRecord) {
            saveServerResponse(cwd, sessionId, stepNum, stepRecord);
        }
    }

    return { serverResponse: lastResp, stepNum, savedContext: ctx };
}
