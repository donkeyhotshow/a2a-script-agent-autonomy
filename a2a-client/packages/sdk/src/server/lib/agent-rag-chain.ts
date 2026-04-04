/**
 * After a sync A2A invoke, run client-side rag-search and re-invoke (ISSUE 8b, SDK parity with Vite stepRoutes).
 */

import { RAGSearcher } from '@a2a/rag';
import { saveRequestToServer, saveServerResponse } from '../services/step-storage.js';
import { serverFetch, getServerBaseUrl } from '../services/upstream.service.js';
import { loadProjects } from '../services/projects.service.js';
import {
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
} from './a2a-invoke-builders.js';
import { parseA2aInvokeResponse } from '../../client-api-envelope.js';
import { getMaxRagChainDepth } from '../../../../../shared/agent-rag-chain-depth.mjs';

export { extractA2aExecute as extractExecuteFromEnvelope };

async function defaultProjectPath(): Promise<string> {
    const projects = await loadProjects();
    const p = projects.find((x) => x?.path) || projects[0];
    const pathVal = p?.path;
    return typeof pathVal === 'string' && pathVal.length > 0 ? pathVal : process.cwd();
}

async function runRagSearch(
    projectPath: string,
    ragPayload: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const query = typeof ragPayload.query === 'string' ? ragPayload.query : '';
    if (!query.trim()) {
        return { query: '', results: [], files: [], error: 'missing query' };
    }
    try {
        const searcher = new RAGSearcher({ projectPath });
        const protocol = await searcher.searchWithProtocol(query, {
            maxResults: (typeof ragPayload.limit === 'number' ? ragPayload.limit : undefined) ?? 20,
            page: typeof ragPayload.page === 'number' ? ragPayload.page : undefined,
            pageSize: typeof ragPayload.pageSize === 'number' ? ragPayload.pageSize : undefined,
        });
        return { query: protocol.query ?? query, ...protocol } as Record<string, unknown>;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[SDK] RAG search failed:', msg);
        return { query, results: [], files: [], error: msg };
    }
}

export type AgentRagChainResult = {
    finalStep: number;
    finalResponse: Record<string, unknown> | null;
    finalContext: Record<string, unknown>;
};

/**
 * If the latest sync response requests execute["rag-search"], run RAG and POST /invoke until it stops or max depth.
 */
export async function applyAgentRagChainAfterSyncInvoke(options: {
    sessionId: string;
    startStepNum: number;
    serverResponse: Record<string, unknown> | null;
    context: Record<string, unknown>;
}): Promise<AgentRagChainResult> {
    const { sessionId, startStepNum, serverResponse, context } = options;
    const max = getMaxRagChainDepth();

    let lastResp = serverResponse;
    let ctx = { ...context };
    let stepNum = startStepNum;

    if (max <= 0 || !lastResp) {
        return { finalStep: stepNum, finalResponse: lastResp, finalContext: ctx };
    }

    const serverBase = await getServerBaseUrl();
    let depth = 0;

    while (depth < max) {
        const ex = extractA2aExecute(lastResp);
        const ragPayload = ex?.['rag-search'] as Record<string, unknown> | undefined;
        if (!ragPayload || typeof ragPayload.query !== 'string' || !ragPayload.query.trim()) {
            break;
        }

        depth += 1;
        const projectPath =
            process.env.A2A_RAG_PROJECT_PATH ||
            process.env.A2A_PROJECT_PATH ||
            (await defaultProjectPath());

        const ragResult = await runRagSearch(projectPath, ragPayload);
        stepNum += 1;

        const contextForServer = sanitizeContextForServer(ctx);
        const body = sanitizeInvokeBodyForA2aUpstream({
            context: contextForServer,
            result: { 'rag-search': ragResult },
        }) as Record<string, unknown>;
        await saveRequestToServer(sessionId, stepNum, { step: stepNum, ...body });

        const upstream = await serverFetch('POST', serverBase, '/api/v1/invoke', body);
        const json = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

        if (!json || !upstream.ok) {
            console.warn('[SDK] Chained invoke failed', upstream.status);
            break;
        }

        const { promiseId, data } = parseA2aInvokeResponse(json);
        if (promiseId) {
            console.log('[SDK] Chained invoke returned promiseId — stopping RAG chain');
            lastResp = json;
            break;
        }

        if (!data) {
            break;
        }

        await saveServerResponse(sessionId, stepNum, { step: stepNum, ...data });
        lastResp = json;
        ctx = mergeResponseContext(ctx, json);
    }

    return { finalStep: stepNum, finalResponse: lastResp, finalContext: ctx };
}

export { getMaxRagChainDepth };
