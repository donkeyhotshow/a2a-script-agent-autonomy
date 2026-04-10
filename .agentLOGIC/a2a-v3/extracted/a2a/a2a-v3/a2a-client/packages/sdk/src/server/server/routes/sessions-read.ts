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
import {
    saveRequestToServer,
    saveClientResult,
    saveServerPromise,
    saveServerResponse,
    getStepDir,
} from '../../services/step-storage.js';
import {getStorageDir} from '../../services/storage.js';
import {serverFetch, getServerBaseUrl} from '../../services/index.js';
import {applyAgentRagChainAfterSyncInvoke} from '../../lib/agent-rag-chain.js';
import {extractA2aExecute} from '../../lib/a2a-invoke-builders.js';
import {pickInvokeContextPatch} from '../../lib/context-invoke-patch.js';
import {buildWebExecute, sanitizeApiRecordExecuteFields} from '../../lib/web-execute-dto.js';
import {buildInitialInvokeRequestBody} from '../../../lib/first-invoke-payload.js';
import {
    normalizePromisePollStatus,
    parseA2aInvokeResponse,
    validateClientResultPayload,
} from '../../../client-api-envelope.js';

function getStepNum(session: { metadata?: Record<string, unknown> }): number {
    const n = session.metadata?.stepNum;
    return typeof n === 'number' ? n : 1;
}

function setStepNum(sessionId: string, stepNum: number): void {
    const s = sessionService.getSession(sessionId);
    if (s) {
        sessionService.updateSession(sessionId, {
            metadata: { ...s.metadata, stepNum },
        });
    }
}

/** Match Vite `toPublicSession(..., false)` — omit context in JSON. */
function stripContextForWeb<T extends Record<string, unknown>>(obj: T | null | undefined): Omit<T, 'context'> | null {
    if (!obj || typeof obj !== 'object') return null;
    const {context: _c, ...rest} = obj;
    return rest as Omit<T, 'context'>;
}

function toWebClientSessionPayload<T extends Record<string, unknown>>(obj: T | null | undefined) {
    const stripped = stripContextForWeb(obj);
    if (!stripped) return null;
    return sanitizeApiRecordExecuteFields(stripped as Record<string, unknown>);
}

/** Validate request-to-server before sending to A2A: task|context required, context.execution valid when present */
function validateRequestToServer(body: { task?: string; context?: Record<string, unknown> }): string | null {
    const hasTask = typeof body.task === 'string' && body.task.length > 0;
    const ctx = body.context;
    const hasContext = ctx && typeof ctx === 'object';
    if (!hasTask && !hasContext) return 'task or context is required';
    if (hasContext && ctx.execution !== undefined) {
        const ex = ctx.execution as Record<string, unknown>;
        if (ex && typeof ex === 'object' && ex.action !== undefined && typeof ex.action !== 'string') {
            return 'context.execution.action must be a string when present';
        }
    }
    return null;
}

async function invokeAndPersistContinuation(params: {
    sessionId: string;
    nextStep: number;
    requestBody: Record<string, unknown>;
    upstreamErrorCode: string;
    res: Response;
}): Promise<{ ackStep: number; promiseId: string | null } | null> {
    const { sessionId, nextStep, requestBody, upstreamErrorCode, res } = params;
    let serverResponse: Record<string, unknown> | null = null;
    let promiseId: string | null = null;
    let ackStep = nextStep;
    try {
        const serverBase = await getServerBaseUrl();
        const err = validateRequestToServer({ context: requestBody.context as Record<string, unknown> });
        if (err) {
            res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
            return null;
        }
        await saveRequestToServer(sessionId, nextStep, {
            step: nextStep,
            ...requestBody,
        });
        const upstream = await serverFetch('POST', serverBase, '/api/v1/invoke', requestBody);
        serverResponse = await upstream.json().catch(() => null);
        if (!upstream.ok || !serverResponse) {
            res.status(upstream.status >= 400 ? upstream.status : 502).json({
                success: false,
                error: { code: upstreamErrorCode, message: 'A2A invoke failed' },
            });
            return null;
        }
        const unwrapped = parseA2aInvokeResponse(serverResponse as Record<string, unknown>);
        promiseId = unwrapped.promiseId;
        if (promiseId) {
            await saveServerPromise(sessionId, nextStep, {
                promiseId,
                status: (unwrapped.data?.status as string) || 'pending',
                submittedAt: new Date().toISOString(),
            });
            setStepNum(sessionId, nextStep);
        } else if (unwrapped.data) {
            await saveServerResponse(sessionId, nextStep, {
                step: nextStep,
                ...unwrapped.data,
            });
            setStepNum(sessionId, nextStep);
        }
        if (unwrapped.context && typeof unwrapped.context === 'object') {
            sessionService.updateSessionContext(sessionId, pickInvokeContextPatch(unwrapped.context));
        }
        if (unwrapped.execute && typeof unwrapped.execute === 'object') {
            sessionService.updateSession(sessionId, {
                currentExecute: unwrapped.execute as Record<string, unknown>,
            });
        }
        ackStep = await persistSyncThenRagChain(
            sessionId,
            nextStep,
            serverResponse as Record<string, unknown>,
            unwrapped.promiseId
        );
        return { ackStep, promiseId };
    } catch (serverError) {
        res.status(503).json({
            success: false,
            error: {
                code: upstreamErrorCode,
                message: serverError instanceof Error ? serverError.message : 'Upstream error',
            },
        });
        return null;
    }
}

/** After context/execute updates from a sync invoke, run client rag-search chain (parity with Vite stepRoutes). */
async function persistSyncThenRagChain(
    sessionId: string,
    startStep: number,
    serverResponse: Record<string, unknown> | null,
    promiseId: string | null
): Promise<number> {
    if (!serverResponse || promiseId) return startStep;
    const sess = sessionService.getSession(sessionId);
    const rawCtx = sess?.context;
    if (!rawCtx || typeof rawCtx !== 'object') return startStep;
    const ctx = rawCtx as Record<string, unknown>;
    const out = await applyAgentRagChainAfterSyncInvoke({
        sessionId,
        startStepNum: startStep,
        serverResponse,
        context: ctx,
    });
    if (out.finalStep > startStep) {
        setStepNum(sessionId, out.finalStep);
        sessionService.updateSessionContext(sessionId, out.finalContext);
        const fe = extractA2aExecute(out.finalResponse);
        if (fe) {
            sessionService.updateSession(sessionId, {currentExecute: fe});
        }
    }
    return out.finalStep;
}

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

/**
 * GET /api/sessions/:id
 * Get session by ID
 *
 * | Query | `execute` / context |
 * |-------|------------------------|
 * | (none) | Web DTO: `buildWebExecute` strips client-only tool keys; `context` omitted (see `toWebClientSessionPayload`). |
 * | `?includeContext=1` | Raw session snapshot: full `execute` keys + `context` (debug / tooling only; parity with Vite `toPublicSession(..., true)`). |
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
        if (includeContext) {
            res.json({
                success: true,
                session: session as Record<string, unknown>,
            });
            return;
        }

        res.json({
            success: true,
            session: toWebClientSessionPayload(session as Record<string, unknown>),
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
 * Get all messages from a session
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
            if ((err as { code?: string })?.code === 'ENOENT') {
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
        const rawResponse = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

        if (!upstream.ok || !rawResponse) {
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

        const webExecute = promiseStatus.execute ? buildWebExecute(promiseStatus.execute) : null;
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
        const sessionDir = path.join(getStorageDir(), 'sessions', sessionId);
        
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
                if ((err as { code?: string })?.code === 'ENOENT') {
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
        const sessionDir = path.join(getStorageDir(), 'sessions', sessionId);
        
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
            if ((err as { code?: string })?.code !== 'ENOENT') throw err;
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
            } catch {
                // File doesn't exist, skip
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('[SESSIONS API] Error getting latest step:', error);
        res.status(500).json({ error: 'Failed to get latest step' });
    }
});

export default router;