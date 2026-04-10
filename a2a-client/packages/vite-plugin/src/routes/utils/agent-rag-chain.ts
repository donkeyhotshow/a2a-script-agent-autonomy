/**
 * Client-side tool execution + chained POST /invoke (agent mode), async-only server.
 * When A2A returns a single client-executable execute key, run it under the session project path and POST /invoke again.
 * Supports: rag-search, read-file, list-directory, grep-search, file-exists, write-file,
 * execute-command, run-script, edit-patch. (execute.script is not auto-chained — use SDK / UI.)
 *
 * Architecture (T021): each iteration is one **tool** action key (optionally with `execute.message` / `execute.completed` alongside — same object).
 * Each iteration: server returns one tool key → client runs tool → client sends `result` → next `/invoke`.
 * See `a2a-server/docs/EXTENDING-LLM-ACTIONS.md` for protocol limits (one action key per `response.tson`).
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
import { getMaxRagChainDepth } from '@a2a-client/shared/agent-rag-chain-depth.js';
import { getProjectPathForSessions } from '@a2a-client/storage/projectSessions.js';
import * as stepHandlers from '../handlers/step-handlers.js';
import { resolveUnderProjectRoot } from '@a2a-client/execution/path-sandbox.js';
import { runClientExecuteCommand } from '@a2a-client/execution/run-agent-command.js';
import { runClientEditPatch } from '@a2a-client/execution/run-agent-edit-patch.js';
import { runClientRegisteredScript } from '@a2a-client/execution/run-agent-registered-script.js';

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
    const safeCwd = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
    const safeProject =
        typeof projectPath === 'string' && projectPath.trim() ? projectPath : safeCwd;
    const p = payload && typeof payload === 'object' ? payload : {};
    switch (toolKey) {
        case 'rag-search':
            return { key: 'rag-search', value: await runClientRagSearchForExecute(safeCwd, safeProject, p) };
        case 'read-file':
            return { key: 'read-file', value: await runClientReadFile(safeProject, p) };
        case 'list-directory':
            return { key: 'list-directory', value: await runClientListDirectory(safeProject, p) };
        case 'file-exists':
            return { key: 'file-exists', value: await runClientFileExists(safeProject, p) };
        case 'write-file':
            return { key: 'write-file', value: await runClientWriteFile(safeProject, p) };
        case 'grep-search':
            return { key: 'grep-search', value: await runClientGrepSearch(safeProject, p) };
        case 'execute-command': {
            let cwdAbs = safeProject;
            if (p.cwd && typeof p.cwd === 'string') {
                const r = resolveUnderProjectRoot(safeProject, p.cwd);
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
        case 'run-script': {
            // LLMs often emit run-script { command: "npm run ..." } instead of scriptId; chain must still run.
            if (typeof p.command === 'string' && p.command.trim()) {
                let cwdAbs = safeProject;
                if (p.cwd && typeof p.cwd === 'string') {
                    const r = resolveUnderProjectRoot(safeProject, p.cwd);
                    if (!r) {
                        return {
                            key: 'run-script',
                            value: {
                                success: false,
                                scriptId: '',
                                inlineCommand: true,
                                error: 'cwd outside project',
                                output: '',
                            },
                        };
                    }
                    cwdAbs = r;
                }
                const inlinePayload =
                    typeof p.timeout === 'number'
                        ? p
                        : {...p, timeout: 600000};
                const ec = await runClientExecuteCommand(cwdAbs, inlinePayload);
                return {
                    key: 'run-script',
                    value: {
                        success: ec.success,
                        scriptId: '',
                        inlineCommand: true,
                        output: [ec.stdout, ec.stderr].filter(Boolean).join('\n'),
                        error: ec.error || (ec.exitCode !== 0 && ec.stderr ? ec.stderr : undefined),
                        exitCode: ec.exitCode,
                        timedOut: ec.timedOut,
                    },
                };
            }
            return { key: 'run-script', value: await runClientRegisteredScript(safeProject, p) };
        }
        case 'edit-patch':
            return { key: 'edit-patch', value: await runClientEditPatch(safeProject, p) };
        default:
            return null;
    }
}

/**
 * Follow-up chained invokes while the latest response asks for a chainable client tool execute key.
 * Stops when POST /invoke returns promiseId (normal async path); outer flow must poll and resume.
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

    let projectPath =
        process.env.A2A_RAG_PROJECT_PATH || process.env.A2A_PROJECT_PATH || getProjectPathForSessions(cwd);
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
        projectPath = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
    }

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
