/**
 * Sessions Routes - Async Operations
 * 
 * API endpoints for session management (async/promise handling).
 * POST /api/sessions/:sessionId/action - Submit user action choice
 * POST /api/sessions/:sessionId/next - Continue execution after user response
 */

import {Router, Request, Response} from 'express';
import {sessionService} from '../../services/session-service.js';
import {saveClientResult} from '../../services/step-storage.js';
import {getStepNum, invokeAndPersistContinuation} from '../../lib/session-routes-shared.js';
import {validateClientResultPayload} from '../../../client-api-envelope.js';

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