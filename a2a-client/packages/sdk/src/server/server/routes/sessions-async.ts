/**
 * Sessions Routes - Async Operations
 * 
 * API endpoints for session management (async/promise handling).
 * POST /api/sessions/:sessionId/action - Submit user action choice
 * POST /api/sessions/:sessionId/next - Continue execution after user response
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
 * POST /api/sessions/:sessionId/action
 * Submit user action choice
 *
 * Accepts: { choice: string, input?: any }
 * Returns: { success, accepted, step, promiseId? } (ack-only; hydrate via GET session)
 */
router.post('/:sessionId/action', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const body = req.body as {
            choice: string;
            input?: unknown;
        };

        // Validate required fields
        if (!body.choice) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ACTION',
                    message: 'Choice is required'
                }
            });
            return;
        }

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

        const stepNum = getStepNum(session);
        await saveClientResult(sessionId, stepNum, {
            result: { choice: body.choice, input: body.input },
            // timestamp is a technical field, not part of protocol
            // timestamp: new Date().toISOString(),
        });

        sessionService.updateSession(sessionId, {
            selectedAction: body.choice,
            metadata: { ...session.metadata, lastUserInput: body.input },
        });
        sessionService.addMessage(
            sessionId,
            { action: body.choice, input: body.input },
            'user',
            { source: 'user-action' }
        );

        const nextStep = stepNum + 1;
        const requestBody = {
            context: {
                version: '2.0',
                execution: { action: 'action', step: body.choice },
                ...session.context,
            },
            result: { choice: body.choice, input: body.input },
        };
        const invokeResult = await invokeAndPersistContinuation({
            sessionId,
            nextStep,
            requestBody,
            upstreamErrorCode: 'ACTION_UPSTREAM',
            res,
        });
        if (!invokeResult) return;

        res.json({
            success: true,
            accepted: true,
            step: invokeResult.ackStep,
            promiseId: invokeResult.promiseId ?? null,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error processing action:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ACTION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to process action'
            }
        });
    }
});

/**
 * POST /api/sessions/:sessionId/next
 * Continue execution after user response
 *
 * Accepts: { result: { message?, choice?, ... } }
 * Returns: { success, accepted, step, promiseId? } — same ack contract as Vite `POST /api/a2a/sessions/:id/next` (hydrate via GET session + poll GET .../promise).
 */
router.post('/:sessionId/next', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const body = req.body as {
            result?: { message?: string; choice?: string; [k: string]: unknown };
        };

        const result = body.result;
        const resultValidationError = validateClientResultPayload(result);
        if (resultValidationError) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CLIENT_RESULT',
                    message: resultValidationError
                }
            });
            return;
        }

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

        const stepNum = getStepNum(session);
        await saveClientResult(sessionId, stepNum, {
            result,
            // timestamp is a technical field, not part of protocol
            // timestamp: new Date().toISOString(),
        });

        sessionService.addMessage(
            sessionId,
            result,
            'user',
            { source: 'user-result' }
        );

        // Extract message from result for the request body
        const messageText = result?.message || result?.choice || '';

        const nextStep = stepNum + 1;
        // Для последующих запросов нужен task в context или на верхнем уровне
        const requestBody = {
            task: messageText, // Используем messageText из result
            context: {
                version: '2.0',
                execution: { action: 'continue', step: 'next' },
                ...session.context,
            },
            result,
        };
        const invokeResult = await invokeAndPersistContinuation({
            sessionId,
            nextStep,
            requestBody,
            upstreamErrorCode: 'NEXT_UPSTREAM',
            res,
        });
        if (!invokeResult) return;

        res.json({
            success: true,
            accepted: true,
            step: invokeResult.ackStep,
            promiseId: invokeResult.promiseId ?? null,
        });
    } catch (error) {
        console.error('[SESSIONS API] Error processing next:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'NEXT_ERROR',
                message: error instanceof Error ? error.message : 'Failed to process next'
            }
        });
    }
});

export default router;