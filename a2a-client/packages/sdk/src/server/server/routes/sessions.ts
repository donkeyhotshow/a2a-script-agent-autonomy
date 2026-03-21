/**
 * Sessions Routes
 * 
 * API endpoints for session management.
 * POST /api/sessions - Create new session
 * GET /api/sessions - List all sessions
 * GET /api/sessions/:id - Get session by ID
 * PATCH /api/sessions/:id - Update session
 * DELETE /api/sessions/:id - Delete session
 */

import {Router, Request, Response} from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
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

const router = Router();

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body as {
            title?: string;
            task?: string;
            projectId?: string;
            context?: string;
            suggestedAction?: string;
            actionParams?: Record<string, unknown>;
        };

        // Generate unique session ID
        const sessionId = crypto.randomUUID();

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
                const requestBody = {
                    context: {
                        version: '2.0',
                        session_id: sessionId,
                        execution: { action: 'task', step: 'new' },
                        ...session.context,
                    },
                    result: { message: body.task },
                };

                const err = validateRequestToServer({ task: body.task, context: requestBody.context });
                if (err) {
                    res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
                    return;
                }
                await saveRequestToServer(sessionId, 1, {
                    step: 1,
                    timestamp: new Date().toISOString(),
                    ...requestBody,
                });

                const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
                serverResponse = await upstream.json().catch(() => null);

                if (upstream.ok && serverResponse) {
                    const data = serverResponse?.data as Record<string, unknown> | undefined;
                    const promiseId = serverResponse?.promiseId ?? data?.promiseId ?? null;
                    if (promiseId) {
                        await saveServerPromise(sessionId, 2, {
                            promiseId,
                            status: (data?.status as string) || 'pending',
                            submittedAt: new Date().toISOString(),
                        });
                        setStepNum(sessionId, 2);
                    } else if (data) {
                        await saveServerResponse(sessionId, 1, {
                            step: 1,
                            timestamp: new Date().toISOString(),
                            ...data,
                        });
                    }
                    console.log('[SESSIONS API] Got initial server response for task:', body.task);
                } else {
                    console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
                }
            } catch (serverError) {
                console.warn('[SESSIONS API] Failed to call server for task:', serverError);
            }
        }

        const response: any = {
            success: true,
            data: session
        };

        if (serverResponse) {
            response.serverResponse = serverResponse;
        }

        res.status(201).json(response);
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

        res.json({
            success: true,
            data: session
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
 * POST /api/sessions/:sessionId/action
 * Submit user action choice
 * 
 * Accepts: { choice: string, input?: any }
 * Returns: { execute, context, promiseId? }
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
            timestamp: new Date().toISOString(),
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
                session_id: sessionId,
                execution: { action: 'action', step: body.choice },
                ...session.context,
            },
            result: { choice: body.choice, input: body.input },
        };

        let serverResponse = null;
        let promiseId = null;

        try {
            const serverBase = await getServerBaseUrl();

            const err = validateRequestToServer({ context: requestBody.context });
            if (err) {
                res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
                return;
            }
            await saveRequestToServer(sessionId, nextStep, {
                step: nextStep,
                timestamp: new Date().toISOString(),
                ...requestBody,
            });

            const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
            serverResponse = await upstream.json().catch(() => null);

            if (upstream.ok && serverResponse) {
                const data = serverResponse?.data as Record<string, unknown> | undefined;
                promiseId = serverResponse?.promiseId ?? data?.promiseId ?? serverResponse?.context?.promiseId ?? null;

                if (promiseId) {
                    await saveServerPromise(sessionId, nextStep + 1, {
                        promiseId,
                        status: (data?.status as string) || 'pending',
                        submittedAt: new Date().toISOString(),
                    });
                    setStepNum(sessionId, nextStep + 1);
                } else if (data) {
                    await saveServerResponse(sessionId, nextStep, {
                        step: nextStep,
                        timestamp: new Date().toISOString(),
                        ...data,
                    });
                    setStepNum(sessionId, nextStep);
                }

                if (serverResponse?.context) {
                    sessionService.updateSessionContext(sessionId, serverResponse.context);
                }
                if (serverResponse?.execute) {
                    sessionService.updateSession(sessionId, { currentExecute: serverResponse.execute });
                }
                console.log('[SESSIONS API] Got server response for action:', body.choice);
            } else {
                console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
            }
        } catch (serverError) {
            console.warn('[SESSIONS API] Failed to call server for action:', serverError);
        }

        // Build response
        const response: any = {
            success: true,
            execute: serverResponse?.execute ?? null,
            context: serverResponse?.context ?? session.context ?? {}
        };

        if (promiseId) {
            response.promiseId = promiseId;
        }

        res.json(response);
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
 * Accepts: { result: any }
 * Returns: { execute, context, promiseId? }
 */
router.post('/:sessionId/next', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const body = req.body as {
            result?: { message?: string; choice?: string; [k: string]: unknown };
        };

        // Validate client-result: result required, result.message or result.choice at least one
        const result = body.result;
        if (!result || typeof result !== 'object') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CLIENT_RESULT',
                    message: 'result is required'
                }
            });
            return;
        }
        const hasMessage = typeof result.message === 'string' && result.message.length > 0;
        const hasChoice = typeof result.choice === 'string' && result.choice.length > 0;
        if (!hasMessage && !hasChoice) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CLIENT_RESULT',
                    message: 'result.message or result.choice is required'
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
            timestamp: new Date().toISOString(),
        });

        sessionService.addMessage(
            sessionId,
            result,
            'user',
            { source: 'user-result' }
        );

        const nextStep = stepNum + 1;
        const requestBody = {
            context: {
                version: '2.0',
                session_id: sessionId,
                execution: { action: 'continue', step: 'next' },
                ...session.context,
            },
            result,
        };

        let serverResponse = null;
        let promiseId = null;

        try {
            const serverBase = await getServerBaseUrl();

            const err = validateRequestToServer({ context: requestBody.context });
            if (err) {
                res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: err } });
                return;
            }
            await saveRequestToServer(sessionId, nextStep, {
                step: nextStep,
                timestamp: new Date().toISOString(),
                ...requestBody,
            });

            const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
            serverResponse = await upstream.json().catch(() => null);

            if (upstream.ok && serverResponse) {
                const nextData = serverResponse?.data as Record<string, unknown> | undefined;
                promiseId = serverResponse?.promiseId ?? nextData?.promiseId ?? serverResponse?.context?.promiseId ?? null;

                if (promiseId) {
                    await saveServerPromise(sessionId, nextStep + 1, {
                        promiseId,
                        status: (nextData?.status as string) || 'pending',
                        submittedAt: new Date().toISOString(),
                    });
                    setStepNum(sessionId, nextStep + 1);
                } else if (serverResponse?.data) {
                    await saveServerResponse(sessionId, nextStep, {
                        step: nextStep,
                        timestamp: new Date().toISOString(),
                        ...(serverResponse.data as Record<string, unknown>),
                    });
                    setStepNum(sessionId, nextStep);
                }

                if (serverResponse?.context) {
                    sessionService.updateSessionContext(sessionId, serverResponse.context);
                }
                if (serverResponse?.execute) {
                    sessionService.updateSession(sessionId, { currentExecute: serverResponse.execute });
                }
                console.log('[SESSIONS API] Got server response for next step');
            } else {
                console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
            }
        } catch (serverError) {
            console.warn('[SESSIONS API] Failed to call server for next:', serverError);
        }

        // Build response
        const response: any = {
            success: true,
            execute: serverResponse?.execute ?? null,
            context: serverResponse?.context ?? session.context ?? {}
        };

        if (promiseId) {
            response.promiseId = promiseId;
        }

        res.json(response);
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
 * GET /api/sessions/:sessionId/promise/:promiseId
 * Check promise status from A2A Server
 */
router.get('/:sessionId/promise/:promiseId', async (req: Request, res: Response) => {
    try {
        const { sessionId, promiseId } = req.params;
        
        // Call A2A Server to check promise status
        const serverBase = await getServerBaseUrl();
        
        const upstream = await serverFetch('GET', serverBase, `/requests/${promiseId}/status`, null);
        const statusResponse = await upstream.json().catch(() => null);
        
        if (upstream.ok && statusResponse) {
            res.json(statusResponse);
        } else {
            res.status(upstream.status || 500).json({ 
                error: statusResponse?.error || 'Failed to get promise status' 
            });
        }
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
