/**
 * Sessions Routes - Async Operations
 * 
 * API endpoints for session management (async/promise handling).
 * POST /api/sessions/:sessionId/action - Submit user action choice
 * POST /api/sessions/:sessionId/next - Continue execution after user response
 */

import {Router, Request, Response} from 'express';
import {sessionService} from '../../services/session-service.js';
import {readServerResponse, saveClientResult} from '../../services/step-storage.js';
import {
    buildMinimalNextAck,
    getStepNum,
    invokeAndPersistContinuation,
} from '../../lib/session-routes-shared.js';
import {
    buildSubmitResult,
    normalizeRouterStepSubmit,
    routerFormHasChoices,
    validateSubmitResult,
} from '@a2a-client/shared/router-submit.mjs';
import {
    mergeContext,
    prepareServerRequest,
    processTaskAndContext,
} from '@a2a-client/shared/next-invoke-pipeline.mjs';

const router = Router();

/**
 * POST /api/sessions/:sessionId/action
 * Submit user action choice
 *
 * Accepts: { choice: string, input?: any }
 * Returns: { success, accepted, step, asyncPending } (ack-only; hydrate via GET session / async)
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

        res.json(buildMinimalNextAck(invokeResult.ackStep, invokeResult.promiseId));
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
 * Accepts: same as Vite — `{ result }` or top-level **`task`** shorthand; router normalization + invoke merge via `@a2a-client/shared/next-invoke-pipeline.mjs`.
 * Returns: { success, accepted, step, asyncPending } — same as Vite `toMinimalNextAck` (no `promiseId` on the wire).
 */
router.post('/:sessionId/next', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const body = req.body as {
            result?: Record<string, unknown>;
            task?: string;
        };

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
        let prevStepData = await readServerResponse(sessionId, stepNum);
        if (!prevStepData) {
            const ctx =
                session.context && typeof session.context === 'object' && !Array.isArray(session.context)
                    ? { ...(session.context as Record<string, unknown>) }
                    : {};
            const ex = (session.execute ?? session.currentExecute) ?? undefined;
            prevStepData = {
                context: ctx,
                ...(ex != null && typeof ex === 'object' ? { execute: ex as Record<string, unknown> } : {}),
            };
        }

        const hasChoices = routerFormHasChoices(prevStepData);
        let submitResult = buildSubmitResult({ body, hasChoices }) as Record<string, unknown> | undefined;
        submitResult = normalizeRouterStepSubmit(submitResult, prevStepData) as
            | Record<string, unknown>
            | undefined;
        if (!submitResult) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CLIENT_RESULT',
                    message: 'result or task is required',
                },
            });
            return;
        }
        const submitErr = validateSubmitResult(submitResult);
        if (submitErr) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CLIENT_RESULT',
                    message: submitErr,
                },
            });
            return;
        }

        const meta =
            session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata)
                ? (session.metadata as Record<string, unknown>)
                : {};
        const sessionContext: Record<string, unknown> = {
            ...(session.context && typeof session.context === 'object' && !Array.isArray(session.context)
                ? { ...(session.context as Record<string, unknown>) }
                : {}),
            sessionId: session.id,
        };
        if (session.projectId) {
            sessionContext.projectId = session.projectId;
        }
        if (typeof meta.projectRoot === 'string') {
            sessionContext.projectRoot = meta.projectRoot;
        }

        let mergedContext = mergeContext({
            prevStepData,
            sessionContext,
            submitResult,
            hasChoices,
        });
        const { effectiveTask, mergedContext: mergedAfterTask } = processTaskAndContext({
            mergedContext,
            submitResult,
            prevStepData,
        });
        mergedContext = mergedAfterTask;

        const requestBody = prepareServerRequest({
            mergedContext,
            submitResult,
            effectiveTask,
        });

        await saveClientResult(sessionId, stepNum, {
            result: submitResult,
        });

        sessionService.addMessage(sessionId, submitResult, 'user', { source: 'user-result' });

        const nextStep = stepNum + 1;
        const invokeResult = await invokeAndPersistContinuation({
            sessionId,
            nextStep,
            requestBody,
            upstreamErrorCode: 'NEXT_UPSTREAM',
            res,
        });
        if (!invokeResult) return;

        res.json(buildMinimalNextAck(invokeResult.ackStep, invokeResult.promiseId));
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
