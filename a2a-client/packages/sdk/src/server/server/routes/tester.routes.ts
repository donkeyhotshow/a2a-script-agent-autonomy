/**
 * Tester Routes - CLI commands for web client control via SSE
 *
 * Provides endpoints for remote control of web clients through API server.
 * Commands are forwarded to connected web clients via Server-Sent Events.
 */

import {Router, Request, Response} from 'express';

// Import functions from main index.ts
const { sendSseEvent, getActiveConnections, getSessionCount, getActiveSessions, broadcastAll } = (() => {
    // These functions are defined in the main index.ts file
    // We'll access them through a closure
    return {
        sendSseEvent: (sessionId: string, event: string, data: unknown) => {
            const clients = (global as any).sseClients?.get(sessionId);
            if (!clients || clients.size === 0) return false;

            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            for (const res of clients) {
                res.write(message);
            }
            return true;
        },
        getActiveConnections: () => {
            const clients = (global as any).sseClients;
            if (!clients) return 0;
            let total = 0;
            for (const clientSet of clients.values()) {
                total += clientSet.size;
            }
            return total;
        },
        getSessionCount: () => {
            const clients = (global as any).sseClients;
            return clients ? clients.size : 0;
        },
        getActiveSessions: () => {
            const clients = (global as any).sseClients;
            return clients ? Array.from(clients.keys()) : [];
        },
        broadcastAll: (event: string, data: unknown, excludeSessionId?: string) => {
            const clients = (global as any).sseClients;
            if (!clients) return 0;

            let sentCount = 0;
            for (const [sessionId, clientSet] of clients.entries()) {
                if (excludeSessionId && sessionId === excludeSessionId) continue;
                if (clientSet.size > 0) {
                    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                    for (const res of clientSet) {
                        res.write(message);
                    }
                    sentCount++;
                }
            }
            return sentCount;
        }
    };
})();

const router = Router();

/**
 * POST /api/tester/command
 * Send command to web client via SSE
 */
router.post('/command', async (req: Request, res: Response) => {
    try {
        const body = req.body as {
            type: string;
            command: string;
            data?: Record<string, unknown>;
            sessionId: string;
            timestamp: string;
        };

        if (!body.type || body.type !== 'tester_command') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request type. Expected "tester_command"'
            });
        }

        if (!body.command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }

        if (!body.sessionId) {
            return res.status(400).json({
                success: false,
                error: 'sessionId is required'
            });
        }

        const sessionId = body.sessionId;
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create command payload for SSE
        const commandPayload = {
            type: 'tester_command',
            commandId,
            command: body.command,
            data: body.data || {},
            sessionId,
            timestamp: body.timestamp || new Date().toISOString(),
            source: 'api_server'
        };

        // Send command via SSE to web client
        const success = sendSseEvent(sessionId, 'tester_command', commandPayload);

        if (!success) {
            console.warn('[Tester API] No SSE clients connected for session', { sessionId });
            return res.status(404).json({
                success: false,
                error: 'No web clients connected to session',
                sessionId
            });
        }

        console.log('[Tester API] Command sent via SSE', {
            sessionId,
            command: body.command,
            commandId
        });

        // Return success response
        res.json({
            success: true,
            commandId,
            sessionId,
            command: body.command,
            message: 'Command sent to web client',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Tester API] Error processing tester command', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/tester/status
 * Get tester system status
 */
router.get('/status', (req: Request, res: Response) => {
    try {
        // Get SSE manager status from the main index.ts file
        const status = {
            service: 'tester-api',
            timestamp: new Date().toISOString(),
            sseManager: {
                activeConnections: getActiveConnections(),
                sessionCount: getSessionCount()
            }
        };

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('[Tester API] Error getting tester status', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/tester/sessions
 * Get list of active tester sessions
 */
router.get('/sessions', (req: Request, res: Response) => {
    try {
        const sessions = getActiveSessions();

        res.json({
            success: true,
            data: {
                sessions,
                count: sessions.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[Tester API] Error getting tester sessions', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * POST /api/tester/broadcast
 * Broadcast command to all connected sessions
 */
router.post('/broadcast', async (req: Request, res: Response) => {
    try {
        const body = req.body as {
            command: string;
            data?: Record<string, unknown>;
            excludeSessionId?: string;
        };

        if (!body.command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }

        const commandId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const commandPayload = {
            type: 'tester_broadcast',
            commandId,
            command: body.command,
            data: body.data || {},
            timestamp: new Date().toISOString(),
            source: 'api_server'
        };

        // Broadcast to all sessions except excluded one
        const sentCount = broadcastAll('tester_broadcast', commandPayload, body.excludeSessionId);

        console.log('[Tester API] Broadcast sent', {
            command: body.command,
            commandId,
            sentCount
        });

        res.json({
            success: true,
            commandId,
            command: body.command,
            sentCount,
            message: `Command broadcasted to ${sentCount} sessions`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Tester API] Error broadcasting tester command', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

export default router;