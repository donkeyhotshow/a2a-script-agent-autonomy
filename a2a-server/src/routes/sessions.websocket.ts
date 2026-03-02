/**
 * WebSocket Handler for Session Streaming
 * Real-time event streaming for session updates
 */

import WebSocket, {WebSocketServer} from 'ws';
import {Server} from 'http';
import {URL} from 'url';
import jwt from 'jsonwebtoken';
import {logger} from '../utils/logger.js';
import {sessionManager} from '../services/session-manager.service.js';

// ============================================
// Types
// ============================================

export type ServerMessageType =
    | 'session:updated'
    | 'session:deleted'
    | 'message:new'
    | 'sequence:new'
    | 'error'
    | 'connected'
    | 'subscribed'
    | 'unsubscribed'
    | 'pong';

export type ClientMessageType = 'subscribe' | 'unsubscribe' | 'ping';

export interface ServerMessage {
    type: ServerMessageType;
    payload: unknown;
}

export interface ClientMessage {
    type: ClientMessageType;
    payload?: {
        sessionId?: string;
    };
}

export interface AuthenticatedUser {
    id: string;
    email: string;
}

// ============================================
// WebSocket Manager
// ============================================

class SessionWebSocketManager {
    private wss: WebSocketServer | null = null;
    private clients: Map<string, Set<WebSocket>> = new Map();
    private globalClients: Set<WebSocket> = new Set();
    private heartbeatIntervals: Map<WebSocket, NodeJS.Timeout> = new Map();

    /**
     * Initialize WebSocket server attached to HTTP server
     */
    initialize(server: Server): void {
        this.wss = new WebSocketServer({
            server,
            path: '/api/sessions/:id/stream',
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error', {error: error.message});
        });

        logger.info('WebSocket server initialized', {path: '/api/sessions/:id/stream'});
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, req: {url?: string; headers?: Record<string, string>}): void {
        // Parse URL and query parameters
        const url = req.url ? new URL(req.url, `http://${req.headers?.host || 'localhost'}`) : null;
        const token = url?.searchParams.get('token');

        // Authenticate connection
        let user: AuthenticatedUser | null = null;

        if (process.env['SKIP_AUTH'] === '1' || process.env['NODE_ENV'] === 'development') {
            user = {id: 'dev-client', email: 'dev@a2a.local'};
        } else if (token) {
            try {
                const jwtSecret = process.env['JWT_SECRET'] || process.env['A2A_SERVER_PASSWORD'] || 'a2a_dev_password';
                const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
                user = decoded;
            } catch {
                this.sendError(ws, 'AUTH_001', 'Invalid or expired token');
                ws.close(4001, 'Unauthorized');
                return;
            }
        } else {
            // No token provided - allow in development or require auth
            if (process.env['NODE_ENV'] !== 'development') {
                this.sendError(ws, 'AUTH_001', 'Authentication required');
                ws.close(4001, 'Unauthorized');
                return;
            }
            user = {id: 'anonymous', email: 'anonymous@a2a.local'};
        }

        logger.info('WebSocket client connected', {userId: user.id});

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, 30000); // Ping every 30 seconds

        this.heartbeatIntervals.set(ws, heartbeatInterval);

        // Send connected message
        this.sendMessage(ws, {
            type: 'connected',
            payload: {
                userId: user.id,
                timestamp: new Date().toISOString(),
            },
        });

        // Handle incoming messages
        ws.on('message', (data) => {
            this.handleMessage(ws, data.toString(), user!);
        });

        // Handle client disconnect
        ws.on('close', () => {
            this.handleDisconnect(ws);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket client error', {error: error.message, userId: user?.id});
        });

        ws.on('pong', () => {
            // Connection is alive
        });
    }

    /**
     * Handle incoming message from client
     */
    private handleMessage(ws: WebSocket, data: string, user: AuthenticatedUser): void {
        try {
            const message: ClientMessage = JSON.parse(data);

            switch (message.type) {
                case 'subscribe':
                    this.handleSubscribe(ws, message.payload?.sessionId, user);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscribe(ws, message.payload?.sessionId);
                    break;
                case 'ping':
                    this.sendMessage(ws, {type: 'pong', payload: {timestamp: new Date().toISOString()}});
                    break;
                default:
                    this.sendError(ws, 'WS_001', `Unknown message type: ${(message as any).type}`);
            }
        } catch (error) {
            logger.error('WebSocket message parse error', {error: (error as Error).message});
            this.sendError(ws, 'WS_002', 'Invalid message format');
        }
    }

    /**
     * Handle subscribe request
     */
    private handleSubscribe(ws: WebSocket, sessionId: string | undefined, user: AuthenticatedUser): void {
        if (!sessionId) {
            this.sendError(ws, 'WS_003', 'sessionId is required for subscribe');
            return;
        }

        // Verify session exists
        sessionManager.getSession(sessionId).then((session) => {
            if (!session) {
                this.sendError(ws, 'WS_004', 'Session not found');
                return;
            }

            if (!this.clients.has(sessionId)) {
                this.clients.set(sessionId, new Set());
            }

            this.clients.get(sessionId)!.add(ws);

            logger.info('Client subscribed to session', {sessionId, userId: user.id});

            this.sendMessage(ws, {
                type: 'subscribed',
                payload: {sessionId},
            });

            // Emit current session state
            this.sendMessage(ws, {
                type: 'session:updated',
                payload: {sessionId, data: session},
            });
        });
    }

    /**
     * Handle unsubscribe request
     */
    private handleUnsubscribe(ws: WebSocket, sessionId: string | undefined): void {
        if (!sessionId) {
            // Unsubscribe from all
            this.globalClients.delete(ws);
            this.clients.forEach((clients) => clients.delete(ws));

            logger.info('Client unsubscribed from all sessions');

            this.sendMessage(ws, {
                type: 'unsubscribed',
                payload: {},
            });
            return;
        }

        const sessionClients = this.clients.get(sessionId);
        if (sessionClients) {
            sessionClients.delete(ws);
            if (sessionClients.size === 0) {
                this.clients.delete(sessionId);
            }
        }

        logger.info('Client unsubscribed from session', {sessionId});

        this.sendMessage(ws, {
            type: 'unsubscribed',
            payload: {sessionId},
        });
    }

    /**
     * Handle client disconnect
     */
    private handleDisconnect(ws: WebSocket): void {
        // Clear heartbeat interval
        const interval = this.heartbeatIntervals.get(ws);
        if (interval) {
            clearInterval(interval);
            this.heartbeatIntervals.delete(ws);
        }

        // Remove from all subscription sets
        this.globalClients.delete(ws);
        this.clients.forEach((clients) => clients.delete(ws));

        logger.info('WebSocket client disconnected');
    }

    /**
     * Send message to client
     */
    private sendMessage(ws: WebSocket, message: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error to client
     */
    private sendError(ws: WebSocket, code: string, errorMessage: string): void {
        this.sendMessage(ws, {
            type: 'error',
            payload: {code, message: errorMessage},
        });
    }

    // ============================================
    // Public API for emitting events
    // ============================================

    /**
     * Emit session updated event
     */
    emitSessionUpdated(sessionId: string, data: unknown): void {
        this.emit(sessionId, 'session:updated', {sessionId, data});
    }

    /**
     * Emit session deleted event
     */
    emitSessionDeleted(sessionId: string): void {
        this.emit(sessionId, 'session:deleted', {sessionId});
        // Clean up subscriptions for this session
        this.clients.delete(sessionId);
    }

    /**
     * Emit new message event
     */
    emitMessageNew(sessionId: string, message: unknown): void {
        this.emit(sessionId, 'message:new', {message});
    }

    /**
     * Emit new sequence event
     */
    emitSequenceNew(sessionId: string, sequence: unknown): void {
        this.emit(sessionId, 'sequence:new', {sequence});
    }

    /**
     * Broadcast event to all subscribers of a session
     */
    private emit(sessionId: string, type: ServerMessageType, payload: unknown): void {
        const sessionClients = this.clients.get(sessionId);

        if (!sessionClients || sessionClients.size === 0) {
            return;
        }

        const message: ServerMessage = {type, payload};

        sessionClients.forEach((client) => {
            this.sendMessage(client, message);
        });

        logger.debug('WebSocket event emitted', {sessionId, type});
    }

    /**
     * Broadcast event to all connected clients
     */
    emitGlobal(type: ServerMessageType, payload: unknown): void {
        const message: ServerMessage = {type, payload};

        this.globalClients.forEach((client) => {
            this.sendMessage(client, message);
        });
    }

    /**
     * Shutdown WebSocket server
     */
    shutdown(): void {
        if (this.wss) {
            // Close all client connections
            this.wss.clients.forEach((client) => {
                client.close(1001, 'Server shutting down');
            });

            this.wss.close();
            this.wss = null;
        }

        // Clear all intervals
        this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
        this.heartbeatIntervals.clear();

        this.clients.clear();
        this.globalClients.clear();

        logger.info('WebSocket server shutdown');
    }
}

// Export singleton instance
export const sessionWebSocketManager = new SessionWebSocketManager();
