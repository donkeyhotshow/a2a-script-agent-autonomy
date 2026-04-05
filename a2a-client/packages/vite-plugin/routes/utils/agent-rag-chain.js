/**
 * Client-side tool execution + sync re-invoke chain (agent mode).
 * When A2A returns a single client-executable execute key, run it under the session project path and POST /invoke again.
 * Supports: rag-search, read-file, list-directory, grep-search, file-exists, write-file,
 * execute-command, run-script, edit-patch. (execute.script is not auto-chained — use SDK / UI.)
 *
 * Architecture (T021): this is a **loop** of single-key `execute` responses — not a multi-key `execute`.
 * Each iteration: server returns one tool key → client runs tool → client sends `result` → next `/invoke`.
 * See `a2a-server/docs/EXTENDING-LLM-ACTIONS.md` for protocol limits (one action key per `response.json`).
 */

import http from 'http';
import fs from 'fs';
import {
    buildStepRecord,
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
} from './builders.js';
import { getMaxRagChainDepth } from '@a2a-client/shared/agent-rag-chain-depth.mjs';
import { getProjectPathForSessions } from '../../storage/projectSessions.js';
import * as stepHandlers from '../handlers/step-handlers.js';
import { resolveUnderProjectRoot } from '@a2a/execution/path-sandbox';
import { runClientExecuteCommand } from '@a2a/execution/run-agent-command';
import { runClientEditPatch } from '@a2a/execution/run-agent-edit-patch';
import { runClientRegisteredScript } from '@a2a/execution/run-agent-registered-script';

import { getValidatedToolKey } from './chain-guards.js';
import { runClientRagSearchForExecute } from './chain-tools-rag.js';
import {
    runClientReadFile,
    runClientListDirectory,
    runClientFileExists,
    runClientWriteFile,
    runClientGrepSearch,
} from './chain-tools-fs.js';

export { resolveUnderProjectRoot, getMaxRagChainDepth, runClientRagSearchForExecute };

/** @alias getMaxRagChainDepth */
export function getMaxAgentToolChainDepth() {
    return getMaxRagChainDepth();
}

function postInvokeJson(a2aServerUrl, body) {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const base = String(a2aServerUrl || '')
            .replace(/\/$/, '')
            .replace(/\/api\/v1$/i, '');
        const urlObj = new URL(`${base}/api/v1/invoke`);
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

/**
 * @param {string} cwd
 * @param {string} projectPath
 * @param {string} toolKey
 * @param {unknown} payload
 * @returns {Promise<{ key: string; value: unknown } | null>}
 */
async function runClientToolForExecute(cwd, projectPath, toolKey, payload) {
    const p = payload && typeof payload === 'object' ? payload : {};
    switch (toolKey) {
        case 'rag-search':
            return { key: 'rag-search', value: await runClientRagSearchForExecute(cwd, projectPath, p) };
        case 'read-file':
            return { key: 'read-file', value: await runClientReadFile(projectPath, p) };
        case 'list-directory':
            return { key: 'list-directory', value: await runClientListDirectory(projectPath, p) };
        case 'file-exists':
            return { key: 'file-exists', value: await runClientFileExists(projectPath, p) };
        case 'write-file':
            return { key: 'write-file', value: await runClientWriteFile(projectPath, p) };
        case 'grep-search':
            return { key: 'grep-search', value: await runClientGrepSearch(projectPath, p) };
        case 'execute-command': {
            let cwdAbs = projectPath;
            if (p.cwd && typeof p.cwd === 'string') {
                const r = resolveUnderProjectRoot(projectPath, p.cwd);
                if (!r) {
                    return {
                        key: 'execute-command',
                        value: {
                            command: typeof p.command === 'string' ? p.command : '',
                            success: false,
                            stdout: '',
                            stderr: '',
                            exitCode: -1,
                            error: 'cwd outside project',
                        },
                    };
                }
                cwdAbs = r;
            }
            return { key: 'execute-command', value: await runClientExecuteCommand(cwdAbs, p) };
        }
        case 'run-script':
            return { key: 'run-script', value: await runClientRegisteredScript(projectPath, p) };
        case 'edit-patch':
            return { key: 'edit-patch', value: await runClientEditPatch(projectPath, p) };
        default:
            return null;
    }
}

/**
 * Follow-up sync invokes while the latest response asks for a chainable client tool execute key.
 *
 * @returns {{ serverResponse: object, stepNum: number, savedContext: object }}
 */
export async function chainSyncInvokesForAgentTools({
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
    let ctx = mergeResponseContext(mergedContext, serverResponse);
    let stepNum = startStepNum;

    if (max <= 0) {
        return { serverResponse: lastResp, stepNum, savedContext: ctx };
    }

    const projectPath =
        process.env.A2A_RAG_PROJECT_PATH || process.env.A2A_PROJECT_PATH || getProjectPathForSessions(cwd);

    let depth = 0;
    while (depth < max) {
        const ex = extractA2aExecute(lastResp);
        const toolKey = getValidatedToolKey(ex);
        if (!toolKey) {
            break;
        }

        depth += 1;

        const toolOut = await runClientToolForExecute(cwd, projectPath, toolKey, ex[toolKey]);
        if (!toolOut) {
            break;
        }

        stepNum += 1;
        const contextForServer = sanitizeContextForServer(ctx);
        const nextBody = sanitizeInvokeBodyForA2aUpstream({
            context: contextForServer,
            result: { [toolOut.key]: toolOut.value },
        });

        const stepDir = stepHandlers.getNewStepDir(cwd, sessionId, stepNum);
        if (!fs.existsSync(stepDir)) {
            fs.mkdirSync(stepDir, { recursive: true });
        }
        stepHandlers.saveRequestToServer(cwd, sessionId, stepNum, nextBody);

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
        if (parsed?.data?.promiseId) {
            console.log('[VitePlugin] Chained invoke returned promiseId — stopping tool chain');
            lastResp = parsed;
            break;
        }

        lastResp = parsed;
        ctx = mergeResponseContext(ctx, lastResp);

        const stepRecord = buildStepRecord({
            sessionId,
            stepNum,
            serverResponse: lastResp,
            messages: messages || [],
            fallbackContext: ctx,
        });
        if (stepRecord) {
            stepHandlers.saveServerResponse(cwd, sessionId, stepNum, stepRecord);
        }
    }

    return { serverResponse: lastResp, stepNum, savedContext: ctx };
}
