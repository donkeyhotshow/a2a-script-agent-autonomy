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
import {sessionService} from '../../services/session-service.js';
import crypto from 'crypto';

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
                updatedAt: new Date().toISOString()
            }
        });

        let serverResponse = null;

        // If task is provided, call a2a-server to get initial response
        if (body.task) {
            try {
                // Import serverFetch and getServerBaseUrl
                const { serverFetch, getServerBaseUrl } = await import('../../index.js');

                const serverBase = await getServerBaseUrl();
                const requestBody = {
                    context: {
                        version: '2.0',
                        session_id: sessionId,
                        execution: {
                            action: 'task',
                            step: 'new'
                        }
                    },
                    result: {
                        message: body.task
                    }
                };

                const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
                serverResponse = await upstream.json().catch(() => null);

                if (upstream.ok && serverResponse) {
                    console.log('[SESSIONS API] Got initial server response for task:', body.task);
                } else {
                    console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
                }
            } catch (serverError) {
                console.warn('[SESSIONS API] Failed to call server for task:', serverError);
                // Don't fail the session creation if server call fails
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

        // Update session with selected action
        sessionService.updateSession(sessionId, {
            selectedAction: body.choice,
            metadata: {
                ...session.metadata,
                lastUserInput: body.input
            }
        });

        // Add user action to messages
        sessionService.addMessage(
            sessionId,
            { action: body.choice, input: body.input },
            'user',
            { source: 'user-action' }
        );

        // Call a2a-server to process the action
        let serverResponse = null;
        let promiseId = null;

        try {
            const { serverFetch, getServerBaseUrl } = await import('../../index.js');
            const serverBase = await getServerBaseUrl();

            const requestBody = {
                context: {
                    version: '2.0',
                    session_id: sessionId,
                    execution: {
                        action: 'action',
                        step: body.choice
                    },
                    ...session.context
                },
                result: {
                    choice: body.choice,
                    input: body.input
                }
            };

            const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
            serverResponse = await upstream.json().catch(() => null);

            if (upstream.ok && serverResponse) {
                console.log('[SESSIONS API] Got server response for action:', body.choice);
                
                // Extract promiseId if async
                promiseId = serverResponse.promiseId || serverResponse.context?.promiseId || null;

                // Update session with server response
                if (serverResponse.context) {
                    sessionService.updateSessionContext(sessionId, serverResponse.context);
                }
                if (serverResponse.execute) {
                    sessionService.updateSession(sessionId, {
                        currentExecute: serverResponse.execute
                    });
                }
            } else {
                console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
            }
        } catch (serverError) {
            console.warn('[SESSIONS API] Failed to call server for action:', serverError);
        }

        // Build response
        const response: any = {
            success: true,
            execute: serverResponse?.execute || null,
            context: serverResponse?.context || session.context || {}
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
            result?: unknown;
        };

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

        // Add user result to messages
        sessionService.addMessage(
            sessionId,
            body.result,
            'user',
            { source: 'user-result' }
        );

        // Call a2a-server to continue execution
        let serverResponse = null;
        let promiseId = null;

        try {
            const { serverFetch, getServerBaseUrl } = await import('../../index.js');
            const serverBase = await getServerBaseUrl();

            const requestBody = {
                context: {
                    version: '2.0',
                    session_id: sessionId,
                    execution: {
                        action: 'continue',
                        step: 'next'
                    },
                    ...session.context
                },
                result: body.result || {}
            };

            const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
            serverResponse = await upstream.json().catch(() => null);

            if (upstream.ok && serverResponse) {
                console.log('[SESSIONS API] Got server response for next step');
                
                // Extract promiseId if async
                promiseId = serverResponse.promiseId || serverResponse.context?.promiseId || null;

                // Update session with server response
                if (serverResponse.context) {
                    sessionService.updateSessionContext(sessionId, serverResponse.context);
                }
                if (serverResponse.execute) {
                    sessionService.updateSession(sessionId, {
                        currentExecute: serverResponse.execute
                    });
                }
            } else {
                console.warn('[SESSIONS API] Server call failed:', upstream.status, serverResponse);
            }
        } catch (serverError) {
            console.warn('[SESSIONS API] Failed to call server for next:', serverError);
        }

        // Build response
        const response: any = {
            success: true,
            execute: serverResponse?.execute || null,
            context: serverResponse?.context || session.context || {}
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

export default router;
