/**
 * Sessions Routes - Mutation Operations
 * 
 * API endpoints for session management (POST, PUT, DELETE requests except async/promise).
 * POST /api/sessions - Create new session
 * POST /api/sessions/:id/messages - Add a message to a session
 * POST /api/sessions/:sessionId/cancel - Cancel a running session
 * PUT /api/sessions/:sessionId/step/:stepNum/:file - Save step file
 * DELETE /api/sessions/:id - Delete session
 * PATCH /api/sessions/:id - Update session
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
import {extractA2aExecute, sanitizeInvokeBodyForA2aUpstream} from '../../lib/a2a-invoke-builders.js';
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
        const upstreamBody = sanitizeInvokeBodyForA2aUpstream(requestBody) as Record<string, unknown>;
        const err = validateRequestToServer({ context: upstreamBody.context as Record<string, unknown> });
        if (err) {
            res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
            return null;
        }
        await saveRequestToServer(sessionId, nextStep, {
            step: nextStep,
            ...upstreamBody,
        });
        const upstream = await serverFetch('POST', serverBase, '/api/v1/invoke', upstreamBody);
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
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body as {
            id?: string;
            title?: string;
            task?: string;
            projectId?: string;
            context?: string;
            suggestedAction?: string;
            actionParams?: Record<string, unknown>;
        };

        const sessionId =
            typeof body.id === 'string' && body.id.trim().length > 0 ? body.id.trim() : `sess_${Date.now()}`;

        // Create session via service
        const session = sessionService.createSession(sessionId, {
            metadata: {
                title: body.title || 'New Session',
                task: body.task,
                projectId: body.projectId,
                context: body.context,
                suggestedAction: body.suggestedAction,
                actionParams: body.actionParams,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                stepNum: 1,
            }
        });

        let serverResponse = null;

        // If task is provided, call a2a-server to get initial response
        if (body.task) {
            try {
                const serverBase = await getServerBaseUrl();
                const requestBody = buildInitialInvokeRequestBody({
                    sessionId,
                    task: body.task,
                    extraContext: session.context && typeof session.context === 'object' ? session.context : {},
                });
                const upstreamBody = sanitizeInvokeBodyForA2aUpstream(requestBody) as Record<string, unknown>;

                const err = validateRequestToServer({ task: body.task, context: upstreamBody.context });
                if (err) {
                    res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
                    return;
                }
                await saveRequestToServer(sessionId, 1, {
                    step: 1,
                    // timestamp is a technical field, not part of protocol
                    // timestamp: new Date().toISOString(),
                    ...upstreamBody,
                });

                const upstream = await serverFetch('POST', serverBase, '/api/v1/invoke', upstreamBody);
                serverResponse = await upstream.json().catch(() => null);

                if (upstream.ok && serverResponse) {
                    const unwrapped = parseA2aInvokeResponse(serverResponse as Record<string, unknown>);
                    if (unwrapped.promiseId) {
                        await saveServerPromise(sessionId, 1, {
                            promiseId: unwrapped.promiseId,
                            status: (unwrapped.data?.status as string) || 'pending',
                            submittedAt: new Date().toISOString(),
                        });
                        setStepNum(sessionId, 1);
                    } else if (unwrapped.data) {
                        await saveServerResponse(sessionId, 1, {
                            step: 1,
                            // timestamp is a technical field, not part of protocol
                            // timestamp: new Date().toISOString(),
                            ...unwrapped.data,
                        });
                        setStepNum(sessionId, 1);
                    }
                    if (unwrapped.context && typeof unwrapped.context === 'object') {
                        sessionService.updateSessionContext(
                            sessionId,
                            pickInvokeContextPatch(unwrapped.context)
                        );
                    }
                    if (unwrapped.execute && typeof unwrapped.execute === 'object') {
                        sessionService.updateSession(sessionId, {
                            currentExecute: unwrapped.execute as Record<string, unknown>,
                        });
                    }
                    await persistSyncThenRagChain(
                        sessionId,
                        1,
                        serverResponse as Record<string, unknown>,
                        unwrapped.promiseId
                    );
                    console.log('[SESSIONS API] Got initial server response for task:', body.task);
                } else {
                    console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
                }
            } catch (serverError) {
                console.warn('[SESSIONS API] Failed to call server for task:', serverError);
            }
        }

        const detail = sessionService.getSession(sessionId);
        const sessionPayload = toWebClientSessionPayload((detail ?? session) as Record<string, unknown>);

        res.status(201).json({
            success: true,
            session: sessionPayload,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error creating session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_CREATE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to create session'
            }
        });
    }
});

/**
 * POST /api/sessions/:id/messages
 * Add a message to a session
 */
router.post('/:id/messages', (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const body = req.body as {
            content: unknown;
            role?: 'user' | 'assistant' | 'system';
            metadata?: Record<string, unknown>;
        };

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

        if (!body.content) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_MESSAGE_CONTENT',
                    message: 'Message content is required'
                }
            });
            return;
        }

        const updatedSession = sessionService.addMessage(
            id,
            body.content,
            body.role || 'assistant',
            body.metadata
        );

        res.json({
            success: true,
            data: updatedSession?.messages
        });
    } catch (error) {
        console.error('[SESSIONS API] Error adding session message:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_MESSAGE_ADD_ERROR',
                message: error instanceof Error ? error.message : 'Failed to add session message'
            }
        });
    }
});

/**
 * POST /api/sessions/:sessionId/cancel
 * Cancel a running session
 * 
 * Accepts: empty body
 * Returns: { success: true, cancelled: true }
 */
router.post('/:sessionId/cancel', (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Get session
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'SESSION_NOT_FOUND',
                    message: `Session ${sessionId} not found`
                }
            });
            return;
        }

        // Check if session can be cancelled
        if (session.status === 'cancelled' || session.status === 'completed' || session.status === 'failed') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'SESSION_NOT_CANCELLABLE',
                    message: `Session is already ${session.status}`
                }
            });
            return;
        }

        // Update session status to cancelled
        const updatedSession = sessionService.updateSession(sessionId, {
            status: 'cancelled',
            endTime: new Date().toISOString()
        });

        // Add cancellation message
        sessionService.addMessage(
            sessionId,
            { action: 'cancelled', reason: 'User requested cancellation' },
            'system',
            { source: 'session-cancelled' }
        );

        res.json({
            success: true,
            data: {
                id: sessionId,
                status: 'cancelled',
                cancelled: true,
                endTime: updatedSession?.endTime
            }
        });
    } catch (error) {
        console.error('[SESSIONS API] Error cancelling session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CANCEL_ERROR',
                message: error instanceof Error ? error.message : 'Failed to cancel session'
            }
        });
    }
});

/**
 * PUT /api/sessions/:sessionId/step/:stepNum/:file
 * Save step file
 */
router.put('/:sessionId/step/:stepNum/:file', async (req: Request, res: Response) => {
    try {
        const { sessionId, stepNum, file } = req.params;
        const stepDir = getStepDir(sessionId, Number(stepNum));
        const validFiles = ['server-promise.json', 'client-result.json', 'request-to-server.json', 'server-response.json', 'messages.json'];
        
        if (!validFiles.includes(file)) {
            res.status(400).json({ error: 'Invalid file name' });
            return;
        }
        
        await fs.mkdir(stepDir, { recursive: true });
        const filePath = path.join(stepDir, file);
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ success: true });
    } catch (error) {
        console.error('[SESSIONS API] Error saving step file:', error);
        res.status(500).json({ error: 'Failed to save step file' });
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete session
 */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        // Get session first to return it
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

        // Delete from service
        sessionService.deleteSession(id);

        res.json({
            success: true,
            data: {id, deleted: true}
        });
    } catch (error) {
        console.error('[SESSIONS API] Error deleting session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_DELETE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to delete session'
            }
        });
    }
});

/**
 * PATCH /api/sessions/:id
 * Update session
 */
router.patch('/:id', (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const updates = req.body;

        const session = sessionService.updateSession(id, updates);

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

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('[SESSIONS API] Error updating session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SESSION_UPDATE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to update session'
            }
        });
    }
});

export default router;