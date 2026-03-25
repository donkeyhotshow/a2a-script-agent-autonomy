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
import { promises as fsp } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { extractA2aExecute, mergeResponseContext, buildStepRecord } from './builders.js';
import { getProjectPathForSessions } from '../../storage/projectSessions.js';
import { saveRequestToServer, saveServerResponse, getNewStepDir } from '../../storage/newSessions.js';
import { resolveUnderProjectRoot } from '../../../packages/execution/src/path-sandbox.js';
import { runClientExecuteCommand } from '../../../packages/execution/src/run-agent-command.js';
import { runClientEditPatch } from '../../../packages/execution/src/run-agent-edit-patch.js';
import { runClientRegisteredScript } from '../../../packages/execution/src/run-agent-registered-script.js';

export { resolveUnderProjectRoot };

const CHAINABLE_CLIENT_TOOLS = new Set([
    'rag-search',
    'read-file',
    'list-directory',
    'grep-search',
    'file-exists',
    'write-file',
    'execute-command',
    'run-script',
    'edit-patch',
]);

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
    const v = process.env.A2A_AGENT_RAG_CHAIN_MAX ?? process.env.A2A_AGENT_TOOL_CHAIN_MAX;
    if (v === '0' || v === 'false') return 0;
    const n = parseInt(v ?? '8', 10);
    return Number.isFinite(n) && n >= 0 ? n : 8;
}

/** @alias getMaxRagChainDepth */
export function getMaxAgentToolChainDepth() {
    return getMaxRagChainDepth();
}

function escapeRegexLiteral(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
async function runClientReadFile(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    if (!p.trim()) {
        return { path: '', error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, error: 'path outside project' };
    }
    try {
        const stat = await fsp.stat(abs);
        if (!stat.isFile()) {
            return { path: p, error: 'not a file' };
        }
        let content = await fsp.readFile(abs, 'utf8');
        const sl = payload.startLine;
        const el = payload.endLine;
        if (typeof sl === 'number' && sl > 0) {
            const lines = content.split('\n');
            const end = typeof el === 'number' ? el : lines.length;
            content = lines.slice(sl - 1, end).join('\n');
        }
        return { path: p, content };
    } catch (e) {
        return { path: p, error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
async function runClientListDirectory(projectPath, payload) {
    const raw =
        typeof payload.path === 'string'
            ? payload.path
            : typeof payload.dirPath === 'string'
              ? payload.dirPath
              : '';
    if (!raw.trim()) {
        return { path: '', entries: [], success: false, error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, raw);
    if (!abs) {
        return { path: raw, entries: [], success: false, error: 'path outside project' };
    }
    try {
        const stat = await fsp.stat(abs);
        if (!stat.isDirectory()) {
            return { path: raw, entries: [], success: false, error: 'not a directory' };
        }
        const dirents = await fsp.readdir(abs, { withFileTypes: true });
        const entries = dirents.map((d) => ({
            name: d.name,
            isFile: d.isFile(),
            isDirectory: d.isDirectory(),
        }));
        return { path: raw, entries, success: true };
    } catch (e) {
        return {
            path: raw,
            entries: [],
            success: false,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

/**
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
async function runClientFileExists(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    if (!p.trim()) {
        return { path: '', exists: false, success: false, error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, exists: false, success: false, error: 'path outside project' };
    }
    const want = typeof payload.type === 'string' ? payload.type : 'any';
    try {
        const st = await fsp.stat(abs);
        const ok =
            want === 'any' ||
            (want === 'file' && st.isFile()) ||
            (want === 'directory' && st.isDirectory());
        return { path: p, exists: ok, success: true };
    } catch {
        return { path: p, exists: false, success: true };
    }
}

/**
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
async function runClientWriteFile(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    const content = payload.content;
    if (!p.trim() || content === undefined) {
        return { path: p || '', success: false, error: 'missing path or content' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, success: false, error: 'path outside project' };
    }
    try {
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, String(content), 'utf8');
        return { path: p, success: true };
    } catch (e) {
        return { path: p, success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * Bounded directory grep (no `rg` dependency). Skips `node_modules` / `.git`.
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
async function runClientGrepSearch(projectPath, payload) {
    const pattern = typeof payload.pattern === 'string' ? payload.pattern : '';
    if (!pattern.trim()) {
        return { pattern: '', matches: [], success: false, error: 'missing pattern' };
    }
    const opts = payload.options && typeof payload.options === 'object' ? payload.options : {};
    const useRegex = opts.regex === true;
    const maxResults = Math.min(typeof opts.maxResults === 'number' ? opts.maxResults : 500, 1000);
    let body;
    try {
        if (useRegex) {
            body = pattern;
        } else {
            body = escapeRegexLiteral(pattern);
            if (opts.wholeWord === true) {
                body = `\\b(?:${body})\\b`;
            }
        }
    } catch (e) {
        return { pattern, matches: [], success: false, error: String(e) };
    }

    const relScope = typeof payload.path === 'string' && payload.path ? payload.path : '.';
    const scopeAbs = resolveUnderProjectRoot(projectPath, relScope);
    if (!scopeAbs) {
        return { pattern, matches: [], success: false, error: 'path outside project' };
    }

    const rootResolved = path.resolve(projectPath);
    const matches = [];

    /**
     * @param {string} line
     * @param {string} lineReSource
     * @param {string} flags
     */
    function lineMatches(line, lineReSource, flags) {
        try {
            return new RegExp(lineReSource, flags).test(line);
        } catch {
            return false;
        }
    }

    const flags = opts.caseSensitive === true ? '' : 'i';

    async function scanFile(fullPath) {
        const relFile = path.relative(rootResolved, fullPath).replace(/\\/g, '/');
        let text;
        try {
            text = await fsp.readFile(fullPath, 'utf8');
        } catch {
            return;
        }
        if (text.length > 500_000) {
            return;
        }
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
            if (lineMatches(lines[i], body, flags)) {
                matches.push({
                    file: relFile,
                    line: i + 1,
                    column: 0,
                    content: lines[i].slice(0, 500),
                    match: pattern,
                });
            }
        }
    }

    async function walkDir(absDir, depth) {
        if (depth > 12 || matches.length >= maxResults) {
            return;
        }
        let entries;
        try {
            entries = await fsp.readdir(absDir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const ent of entries) {
            if (matches.length >= maxResults) {
                break;
            }
            const name = ent.name;
            if (name === 'node_modules' || name === '.git') {
                continue;
            }
            const full = path.join(absDir, name);
            if (ent.isDirectory()) {
                await walkDir(full, depth + 1);
            } else if (ent.isFile()) {
                await scanFile(full);
            }
        }
    }

    try {
        const st = await fsp.stat(scopeAbs);
        if (st.isFile()) {
            await scanFile(scopeAbs);
        } else {
            await walkDir(scopeAbs, 0);
        }
        return {
            pattern,
            path: relScope,
            matches,
            success: true,
            total: matches.length,
        };
    } catch (e) {
        return {
            pattern,
            matches: [],
            success: false,
            error: e instanceof Error ? e.message : String(e),
        };
    }
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
        case 'rag-search': {
            const ragResult = await runClientRagSearchForExecute(cwd, projectPath, p);
            return { key: 'rag-search', value: ragResult };
        }
        case 'read-file': {
            return { key: 'read-file', value: await runClientReadFile(projectPath, p) };
        }
        case 'list-directory': {
            return { key: 'list-directory', value: await runClientListDirectory(projectPath, p) };
        }
        case 'file-exists': {
            return { key: 'file-exists', value: await runClientFileExists(projectPath, p) };
        }
        case 'write-file': {
            return { key: 'write-file', value: await runClientWriteFile(projectPath, p) };
        }
        case 'grep-search': {
            return { key: 'grep-search', value: await runClientGrepSearch(projectPath, p) };
        }
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
            const value = await runClientExecuteCommand(cwdAbs, p);
            return { key: 'execute-command', value };
        }
        case 'run-script': {
            return { key: 'run-script', value: await runClientRegisteredScript(projectPath, p) };
        }
        case 'edit-patch': {
            return { key: 'edit-patch', value: await runClientEditPatch(projectPath, p) };
        }
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
    let ctx = mergeResponseContext(sessionId, mergedContext, serverResponse);
    let stepNum = startStepNum;

    if (max <= 0) {
        return { serverResponse: lastResp, stepNum, savedContext: ctx };
    }

    const projectPath =
        process.env.A2A_RAG_PROJECT_PATH || process.env.A2A_PROJECT_PATH || getProjectPathForSessions(cwd);

    let depth = 0;
    while (depth < max) {
        const ex = extractA2aExecute(lastResp);
        if (!ex || typeof ex !== 'object' || Array.isArray(ex)) {
            break;
        }
        const keys = Object.keys(ex);
        if (keys.length !== 1) {
            break;
        }
        const toolKey = keys[0];
        if (!CHAINABLE_CLIENT_TOOLS.has(toolKey)) {
            break;
        }

        if (toolKey === 'rag-search') {
            const ragPayload = ex['rag-search'];
            if (!ragPayload || typeof ragPayload.query !== 'string' || !ragPayload.query.trim()) {
                break;
            }
        }

        if (toolKey === 'execute-command') {
            const cp = ex['execute-command'];
            if (!cp || typeof cp.command !== 'string' || !cp.command.trim()) {
                break;
            }
        }

        if (toolKey === 'run-script') {
            const rs = ex['run-script'];
            if (!rs || typeof rs.scriptId !== 'string' || !rs.scriptId.trim()) {
                break;
            }
        }

        if (toolKey === 'edit-patch') {
            const ep = ex['edit-patch'];
            if (
                !ep ||
                typeof ep.path !== 'string' ||
                !Array.isArray(ep.operations) ||
                ep.operations.length === 0
            ) {
                break;
            }
        }

        depth += 1;

        const toolOut = await runClientToolForExecute(cwd, projectPath, toolKey, ex[toolKey]);
        if (!toolOut) {
            break;
        }

        stepNum += 1;
        const nextBody = { context: ctx, result: { [toolOut.key]: toolOut.value } };

        const stepDir = getNewStepDir(cwd, sessionId, stepNum);
        if (!fs.existsSync(stepDir)) {
            fs.mkdirSync(stepDir, { recursive: true });
        }
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
            console.log('[VitePlugin] Chained invoke returned promiseId — stopping tool chain');
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

/** @deprecated Use chainSyncInvokesForAgentTools */
export const chainSyncInvokesForRagSearch = chainSyncInvokesForAgentTools;
