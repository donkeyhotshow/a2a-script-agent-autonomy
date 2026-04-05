/**
 * Sessions Routes - Read Operations
 * 
 * API endpoints for session management (GET requests).
 * GET /api/sessions - List all sessions
 * GET /api/sessions/:id - Get session by ID
 * GET /api/sessions/:id/messages - Get all messages from a session
 */

import {Router, Request, Response} from 'express';
import path from 'path';
import fs from 'fs/promises';
import {sessionService} from '../../services/session-service.js';
import {saveServerPromise, saveServerResponse, getStepDir} from '../../services/step-storage.js';
import {getStorageSessionsRoot, isNodeEnoent} from '../../services/storage.js';
import {serverFetch, getServerBaseUrl} from '../../services/index.js';
import {extractA2aExecute} from '../../lib/a2a-invoke-builders.js';
import {pickInvokeContextPatch} from '../../lib/context-invoke-patch.js';
import {buildWebExecute} from '../../lib/web-execute-dto.js';
import {
    applyIncludeContextSessionProjection,
    setStepNum,
    toWebClientSessionPayload,
} from '../../lib/session-routes-shared.js';
import {buildInitialInvokeRequestBody} from '../../../lib/first-invoke-payload.js';
import {
    normalizePromisePollStatus,
    parseA2aInvokeResponse,
    validateClientResultPayload,
    isRecoverableAsyncSnapshot,
} from '../../../client-api-envelope.js';

const router = Router();

/**
 * GET /api/sessions
 * List all sessions (returns summaries)
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const {status, projectId} = req.query;
        let sessions = sessionService.getSessionSummaries();

        // Filter by status if provided
        if (status) {
            sessions = sessions.filter(s => s.status === status);
        }

        // Filter by projectId if provided
        if (projectId) {
            sessions = sessions.filter(s => s.metadata?.projectId === projectId);
        }

        res.json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('[SESSIONS API] Error listing sessions:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_LIST_ERROR',
                message: error instanceof Error ? error.message : 'Failed to list sessions'
            }
        });
    }
});

function isActivePromiseStatus(st: unknown): boolean {
    return st === 'pending' || st === 'processing' || st === 'waiting';
}

async function listSessionStepNums(sessionId: string): Promise<number[]> {
    const dir = path.join(getStorageSessionsRoot(), sessionId);
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return [];
    }
    return entries
        .map((e) => Number(e))
        .filter((n) => Number.isInteger(n) && n > 0)
        .sort((a, b) => a - b);
}

async function findActiveAsyncFromDisk(
    sessionId: string
): Promise<{ stepNum: number; promiseId: string; disk: Record<string, unknown> } | null> {
    for (const stepNum of await listSessionStepNums(sessionId)) {
        const f = path.join(getStepDir(sessionId, stepNum), 'server-promise.json');
        let raw: string;
        try {
            raw = await fs.readFile(f, 'utf-8');
        } catch {
            continue;
        }
        const serverPromise = JSON.parse(raw) as Record<string, unknown>;
        const promiseId = serverPromise.promiseId;
        const st = serverPromise.status;
        const recoverable =
            (st === 'failed' || st === 'error') && isRecoverableAsyncSnapshot(serverPromise);
        if (typeof promiseId === 'string' && (isActivePromiseStatus(st) || recoverable)) {
            return { stepNum, promiseId, disk: serverPromise };
        }
    }
    return null;
}

/**
 * GET /api/sessions/:sessionId/async
 * Vite parity: resolve active server-promise step, poll A2A result, merge retryAfter/asyncPending, persist when terminal.
 */
router.get('/:sessionId/async', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        const hit = await findActiveAsyncFromDisk(sessionId);
        if (!hit) {
            res.json({
                asyncPending: false,
                completed: true,
                status: 'idle',
                result: null,
            });
            return;
        }

        let diskPromise: Record<string, unknown> = hit.disk;
        try {
            const f = path.join(getStepDir(sessionId, hit.stepNum), 'server-promise.json');
            diskPromise = JSON.parse(await fs.readFile(f, 'utf-8')) as Record<string, unknown>;
        } catch {
            /* use hit.disk */
        }

        const serverBase = await getServerBaseUrl();
        const upstreamPath = `/requests/${encodeURIComponent(hit.promiseId)}/result`;
        const upstream = await serverFetch('GET', serverBase, upstreamPath, null);
        const rawResponse = (await upstream.json()) as Record<string, unknown>;

        if (!upstream.ok || rawResponse == null) {
            res.status(upstream.status >= 400 ? upstream.status : 502).json({
                error: (rawResponse?.error as string) || 'Failed to get promise result',
            });
            return;
        }

        const promiseStatus = rawResponse.success
            ? (rawResponse.data as Record<string, unknown>)
            : rawResponse;
        if (!promiseStatus || typeof promiseStatus !== 'object') {
            res.status(502).json({ error: 'Invalid upstream response' });
            return;
        }

        const updatedPromise = {
            ...diskPromise,
            ...promiseStatus,
            checkedAt: new Date().toISOString(),
        };
        await saveServerPromise(sessionId, hit.stepNum, updatedPromise as Record<string, unknown>);

        const normalizedStatus = normalizePromisePollStatus(updatedPromise);
        const terminalSnapshot = !normalizedStatus.asyncPending;

        if (terminalSnapshot && normalizedStatus.completed) {
            const unwrapped = parseA2aInvokeResponse(rawResponse);
            await saveServerResponse(sessionId, hit.stepNum, {
                step: hit.stepNum,
                ...promiseStatus,
            });
            setStepNum(sessionId, hit.stepNum);
            if (unwrapped.context && typeof unwrapped.context === 'object') {
                sessionService.updateSessionContext(sessionId, pickInvokeContextPatch(unwrapped.context));
            }
            const fe = extractA2aExecute(promiseStatus);
            if (fe) {
                sessionService.updateSession(sessionId, { currentExecute: fe });
            }
        }

        let safeResult = promiseStatus.result ?? null;
        if (safeResult && typeof safeResult === 'object') {
            safeResult = { ...(safeResult as Record<string, unknown>) };
            delete (safeResult as Record<string, unknown>).context;
        }
        const statusStr = normalizedStatus.status;
        const asyncPending = normalizedStatus.asyncPending;
        const pollCtx = promiseStatus.context;
        const webExecute = promiseStatus.execute
            ? buildWebExecute(promiseStatus.execute, {
                  context:
                      pollCtx && typeof pollCtx === 'object' && pollCtx !== null ? pollCtx : undefined,
              })
            : null;

        res.json({
            asyncPending,
            status: statusStr,
            result: safeResult,
            execute: webExecute,
            completed: normalizedStatus.completed,
            requestPhase: normalizedStatus.requestPhase,
            retryAfter: normalizedStatus.retryAfter,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error in GET /sessions/:sessionId/async:', error);
        res.status(500).json({ error: 'Failed to poll session async' });
    }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 *
 * | Query | `execute` / context |
 * |-------|------------------------|
 * | (none) | Web DTO: `buildWebExecute` strips client-only tool keys; `context` omitted (see `toWebClientSessionPayload`). Response **`{ success, session }`** — Vite `/api/a2a/sessions/:id` returns **unwrapped** session JSON at root (ADR-0028). |
 * | `?includeContext=1` | Full in-memory session + **`stage`**, **`asyncPending`**, **`promiseStatus`** ([`applyIncludeContextSessionProjection`](../../lib/session-routes-shared.ts)) — Vite `toPublicSession(..., true)` parity for those fields. **403 when `NODE_ENV=production`** (same as Vite). |
 * | `?unwrap=1` | **Top-level session JSON** (same object as `session` in the default envelope) — curl parity with Vite’s unwrapped `GET …/sessions/:id` body. |
 */
router.get('/:id', (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const session = sessionService.getSession(id);

        if (!session) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'SESSION_NOT_FOUND',
                    message: `Session ${id} not found`
                }
            });
            return;
        }

        const includeContext =
            req.query.includeContext === '1' || req.query.includeContext === 'true';
        if (includeContext && process.env.NODE_ENV === 'production') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'INCLUDE_CONTEXT_FORBIDDEN',
                    message: 'includeContext is debug-only and not available in production',
                },
            });
            return;
        }

        const unwrap =
            req.query.unwrap === '1' || req.query.unwrap === 'true';

        if (includeContext) {
            const body = applyIncludeContextSessionProjection(session as Record<string, unknown>);
            if (unwrap) {
                res.json(body);
                return;
            }
            res.json({
                success: true,
                session: body,
            });
            return;
        }

        const slim = toWebClientSessionPayload(session as Record<string, unknown>);
        if (unwrap) {
            res.json(slim);
            return;
        }

        res.json({
            success: true,
            session: slim,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error getting session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_GET_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get session'
            }
        });
    }
});

/**
 * GET /api/sessions/:id/messages
 * Default: `{ success, data, count }`. If **`afterSeq`** query is present, **Vite delta shape**:
 * `{ sessionId, afterSeq, lastSeq, hasMore, messages, asyncPending, promiseStatus, currentStep }` and optional `execute` when `withExecute=1`.
 */
router.get('/:id/messages', (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const session = sessionService.getSession(id);

        if (!session) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'SESSION_NOT_FOUND',
                    message: `Session ${id} not found`
                }
            });
            return;
        }

        const rawAfter = req.query.afterSeq;
        const deltaMode = rawAfter !== undefined;

        if (deltaMode) {
            const afterSeq = Math.max(0, parseInt(String(rawAfter ?? '0'), 10) || 0);
            const limit = Math.min(
                200,
                Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50)
            );
            const withExecute = req.query.withExecute === '1';
            const rawList = sessionService.getMessages(id);
            const messages = rawList.map((m, idx) => {
                const base =
                    m && typeof m === 'object' && !Array.isArray(m)
                        ? { ...(m as Record<string, unknown>) }
                        : { content: m as unknown };
                return { ...base, seq: idx + 1 };
            });
            const lastSeq = messages.length;
            const batch = messages.filter((m) => m.seq > afterSeq).slice(0, limit);
            const s = session as unknown as Record<string, unknown>;
            const promiseId = s.promiseId;
            const promiseStatus = s.promiseStatus;
            const asyncPending =
                s.asyncPending ??
                !!(
                    typeof promiseId === 'string' &&
                    isActivePromiseStatus(promiseStatus)
                );
            const publicLite = toWebClientSessionPayload(session as Record<string, unknown>);
            const execute = withExecute
                ? ((publicLite as Record<string, unknown> | null)?.execute ?? null)
                : undefined;
            const payload: Record<string, unknown> = {
                sessionId: id,
                afterSeq,
                lastSeq,
                hasMore: afterSeq + batch.length < lastSeq,
                messages: batch,
                asyncPending,
                promiseStatus: promiseStatus ?? null,
                currentStep: session.currentStep ?? null,
            };
            if (withExecute) {
                payload.execute = execute;
            }
            res.json(payload);
            return;
        }

        const messages = sessionService.getMessages(id);

        res.json({
            success: true,
            data: messages,
            count: messages.length
        });
    } catch (error) {
        console.error('[SESSIONS API] Error getting session messages:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_MESSAGES_GET_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get session messages'
            }
        });
    }
});

// ============================================================================
// Step File Endpoints (for step-based storage structure)
// ============================================================================

/**
 * GET /api/sessions/:sessionId/step/:stepNum/:file
 * Get step file (server-promise.json, client-result.json, request-to-server.json, server-response.json, messages.json)
 */
router.get('/:sessionId/step/:stepNum/:file', async (req: Request, res: Response) => {
    try {
        const { sessionId, stepNum, file } = req.params;
        const stepDir = getStepDir(sessionId, Number(stepNum));
        const validFiles = ['server-promise.json', 'client-result.json', 'request-to-server.json', 'server-response.json', 'messages.json'];
        
        if (!validFiles.includes(file)) {
            res.status(400).json({ error: 'Invalid file name' });
            return;
        }
        
        const filePath = path.join(stepDir, file);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            res.json(JSON.parse(content));
        } catch (err: unknown) {
            if (isNodeEnoent(err)) {
                res.status(404).json({ error: 'File not found' });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('[SESSIONS API] Error reading step file:', error);
        res.status(500).json({ error: 'Failed to read step file' });
    }
});

/**
 * GET /api/sessions/:sessionId/promise/:promiseId
 * Align with Vite plugin: proxy A2A GET /api/v1/requests/:id/result → { promiseId, status, execute, result, completed }.
 */
router.get('/:sessionId/promise/:promiseId', async (req: Request, res: Response) => {
    try {
        const { sessionId: _sessionId, promiseId } = req.params;
        void _sessionId;

        const serverBase = await getServerBaseUrl();
        const path = `/requests/${encodeURIComponent(promiseId)}/result`;
        const upstream = await serverFetch('GET', serverBase, path, null);
        const rawResponse = (await upstream.json()) as Record<string, unknown>;

        if (!upstream.ok || rawResponse == null) {
            res.status(upstream.status || 500).json({
                error: (rawResponse?.error as string) || 'Failed to get promise result',
            });
            return;
        }

        const promiseStatus = rawResponse.success
            ? (rawResponse.data as Record<string, unknown>)
            : rawResponse;
        if (!promiseStatus || typeof promiseStatus !== 'object') {
            res.status(502).json({ error: 'Invalid upstream response' });
            return;
        }

        const normalizedStatus = normalizePromisePollStatus(promiseStatus);
        let safeResult = promiseStatus.result ?? null;
        if (safeResult && typeof safeResult === 'object') {
            safeResult = {...(safeResult as Record<string, unknown>)};
            delete (safeResult as Record<string, unknown>).context;
        }

        const pollCtx = (promiseStatus as Record<string, unknown>).context;
        const webExecute = promiseStatus.execute
            ? buildWebExecute(promiseStatus.execute, {
                  context:
                      pollCtx && typeof pollCtx === 'object' && pollCtx !== null ? pollCtx : undefined,
              })
            : null;
        res.json({
            promiseId,
            status: normalizedStatus.status,
            result: safeResult,
            execute: webExecute,
            completed: normalizedStatus.completed,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error checking promise:', error);
        res.status(500).json({ error: 'Failed to check promise status' });
    }
});

/**
 * GET /api/sessions/:sessionId/history/:fromStep
 * Get session history from a specific step
 */
router.get('/:sessionId/history/:fromStep', async (req: Request, res: Response) => {
    try {
        const { sessionId, fromStep } = req.params;
        const startStep = Number(fromStep);
        const sessionDir = path.join(getStorageSessionsRoot(), sessionId);
        
        const messages: Array<{step: number; content: unknown}> = [];
        
        // Read all step directories from startStep
        let step = startStep;
        while (true) {
            const stepDir = path.join(sessionDir, String(step));
            const messagesFile = path.join(stepDir, 'messages.json');
            try {
                const content = await fs.readFile(messagesFile, 'utf-8');
                const stepMessages = JSON.parse(content);
                messages.push({ step, content: stepMessages });
            } catch (err: unknown) {
                if (isNodeEnoent(err)) {
                    break; // No more steps
                }
                throw err;
            }
            step++;
        }
        
        res.json({ history: messages });
    } catch (error) {
        console.error('[SESSIONS API] Error getting history:', error);
        res.status(500).json({ error: 'Failed to get session history' });
    }
});

/**
 * GET /api/sessions/:sessionId/latest
 * Get latest step data
 */
router.get('/:sessionId/latest', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const sessionDir = path.join(getStorageSessionsRoot(), sessionId);
        
        // Find the highest step number
        let latestStep = 0;
        try {
            const entries = await fs.readdir(sessionDir);
            for (const entry of entries) {
                const num = Number(entry);
                if (!isNaN(num) && num > latestStep) {
                    latestStep = num;
                }
            }
        } catch (err: unknown) {
            if (!isNodeEnoent(err)) throw err;
        }
        
        if (latestStep === 0) {
            res.status(404).json({ error: 'No steps found' });
            return;
        }
        
        const stepDir = path.join(sessionDir, String(latestStep));
        const result: Record<string, unknown> = { step: latestStep };
        
        // Try to read various files
        const files = ['server-response.json', 'messages.json', 'execute.json'];
        for (const file of files) {
            try {
                const filePath = path.join(stepDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const key = file.replace('.json', '');
                result[key] = JSON.parse(content);
            } catch (e) {
                if (!isNodeEnoent(e)) {
                    console.error('[SESSIONS API] Step file read/parse failed:', file, e instanceof Error ? e.message : e);
                }
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('[SESSIONS API] Error getting latest step:', error);
        res.status(500).json({ error: 'Failed to get latest step' });
    }
});

export default router;