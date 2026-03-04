/**
 * WebSocket Server Module
 * 
 * Handles WebSocket connections for real-time updates and client communication.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {WebSocketServer, WebSocket} from 'ws';
import {toSessionSummary, toSessionDetail, SessionDetail} from '../session-dto.js';

type WebSocketClient = WebSocket & { sessionId?: string };

export interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

export interface ProgressUpdate {
    promiseId?: string;
    status: string;
    progress?: number;
    message?: string;
    result?: unknown;
}

/**
 * WebSocket Server Manager
 */
export class WebSocketServerManager {
    private wss: WebSocketServer;
    private wsConnections: Map<string, Set<WebSocket>>;
    private host: string;
    private port: number;

    constructor(host: string = 'localhost', port: number = 3002) {
        this.host = host;
        this.port = port;
        this.wss = new WebSocketServer({ port: this.port });
        this.wsConnections = new Map();
        
        this.setupEventHandlers();
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers(): void {
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            console.error('[WS] WebSocket server error:', error);
        });
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, req: any): void {
        const sessionId = this.extractSessionId(req);
        
        if (!sessionId) {
            ws.close(1008, 'Session ID required');
            return;
        }
        
        this.addConnectionToSession(sessionId, ws);
        this.sendConnectionConfirmation(ws, sessionId);
        
        this.setupMessageHandler(ws, sessionId);
        this.setupCloseHandler(ws, sessionId);
        this.setupErrorHandler(ws);
    }

    /**
     * Extract session ID from request URL
     */
    private extractSessionId(req: any): string | null {
        try {
            const url = new URL(req.url ?? '', `http://${req.headers.host}`);
            return url.searchParams.get('sessionId');
        } catch {
            return null;
        }
    }

    /**
     * Add connection to session room
     */
    private addConnectionToSession(sessionId: string, ws: WebSocket): void {
        if (!this.wsConnections.has(sessionId)) {
            this.wsConnections.set(sessionId, new Set());
        }
        this.wsConnections.get(sessionId)!.add(ws);
        
        console.log(`[WS] Client connected to session: ${sessionId}`);
    }

    /**
     * Send connection confirmation to client
     */
    private sendConnectionConfirmation(ws: WebSocket, sessionId: string): void {
        ws.send(JSON.stringify({
            type: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Setup message handler for WebSocket
     */
    private setupMessageHandler(ws: WebSocket, sessionId: string): void {
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString()) as WebSocketMessage;
                this.handleWebSocketMessage(sessionId, ws, message);
            } catch (err) {
                console.error('[WS] Invalid message format:', err);
            }
        });
    }

    /**
     * Setup close handler for WebSocket
     */
    private setupCloseHandler(ws: WebSocket, sessionId: string): void {
        ws.on('close', () => {
            this.removeConnectionFromSession(sessionId, ws);
            console.log(`[WS] Client disconnected from session: ${sessionId}`);
        });
    }

    /**
     * Setup error handler for WebSocket
     */
    private setupErrorHandler(ws: WebSocket): void {
        ws.on('error', (err) => {
            console.error('[WS] WebSocket error:', err);
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleWebSocketMessage(sessionId: string, ws: WebSocket, message: WebSocketMessage): void {
        const type = message.type;
        
        switch (type) {
            case 'ping':
                this.handlePing(ws);
                break;
            case 'subscribe':
                this.handleSubscribe(ws, sessionId);
                break;
            case 'unsubscribe':
                this.handleUnsubscribe(ws, sessionId);
                break;
            case 'choice':
                this.handleChoiceSelection(sessionId, ws, message);
                break;
            case 'action_result':
                this.handleActionResult(sessionId, ws, message);
                break;
            case 'ui_ready':
                this.handleUIReady(ws, sessionId);
                break;
            default:
                console.log(`[WS] Unknown message type: ${type}`);
        }
    }

    /**
     * Handle ping message
     */
    private handlePing(ws: WebSocket): void {
        ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString() 
        }));
    }

    /**
     * Handle subscribe message
     */
    private handleSubscribe(ws: WebSocket, sessionId: string): void {
        ws.send(JSON.stringify({ 
            type: 'subscribed', 
            sessionId 
        }));
    }

    /**
     * Handle unsubscribe message
     */
    private handleUnsubscribe(ws: WebSocket, sessionId: string): void {
        this.removeConnectionFromSession(sessionId, ws);
        ws.send(JSON.stringify({ 
            type: 'unsubscribed', 
            sessionId 
        }));
    }

    /**
     * Handle choice selection from client (new protocol)
     */
    private handleChoiceSelection(sessionId: string, ws: WebSocket, message: WebSocketMessage): void {
        const choiceId = message.choiceId as string;
        const input = message.input as Record<string, unknown> | undefined;
        
        if (!choiceId) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'choiceId is required',
                sessionId 
            }));
            return;
        }
        
        // Broadcast choice selection to all clients in session
        this.broadcastToSession(sessionId, {
            type: 'choice_selected',
            choiceId,
            input,
            timestamp: new Date().toISOString()
        });
        
        ws.send(JSON.stringify({
            type: 'choice_ack',
            sessionId,
            choiceId
        }));
    }

    /**
     * Handle action result from client (new protocol)
     */
    private handleActionResult(sessionId: string, ws: WebSocket, message: WebSocketMessage): void {
        const actionType = message.actionType as string;
        const result = message.result as Record<string, unknown>;
        
        if (!actionType || !result) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'actionType and result are required',
                sessionId 
            }));
            return;
        }
        
        // Broadcast action result to all clients in session
        this.broadcastToSession(sessionId, {
            type: 'action_result_received',
            actionType,
            result,
            timestamp: new Date().toISOString()
        });
        
        ws.send(JSON.stringify({
            type: 'action_result_ack',
            sessionId,
            actionType
        }));
    }

    /**
     * Handle UI ready message
     */
    private handleUIReady(ws: WebSocket, sessionId: string): void {
        ws.send(JSON.stringify({ 
            type: 'ui_ready_ack', 
            sessionId, 
            timestamp: new Date().toISOString() 
        }));
    }

    /**
     * Remove connection from session
     */
    private removeConnectionFromSession(sessionId: string, ws: WebSocket): void {
        const connections = this.wsConnections.get(sessionId);
        if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
                this.wsConnections.delete(sessionId);
            }
        }
    }

    /**
     * Broadcast message to all clients in a session
     */
    public broadcastToSession(sessionId: string, data: unknown): void {
        const connections = this.wsConnections.get(sessionId);
        if (!connections) return;
        
        const message = JSON.stringify(data);
        for (const ws of connections) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        }
    }

    /**
     * Broadcast progress update to session
     */
    public broadcastProgress(sessionId: string, progress: ProgressUpdate): void {
        this.broadcastToSession(sessionId, {
            type: 'progress',
            timestamp: new Date().toISOString(),
            ...progress,
        });
    }

    /**
     * Broadcast session update to session
     */
    public broadcastSessionUpdate(sessionId: string, session: SessionDetail): void {
        this.broadcastToSession(sessionId, {
            type: 'session_update',
            session,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get WebSocket server info
     */
    public getServerInfo(): { wsUrl: string; activeSessions: string[]; connectionCount: number } {
        return {
            wsUrl: `ws://${this.host}:${this.port}`,
            activeSessions: Array.from(this.wsConnections.keys()),
            connectionCount: Array.from(this.wsConnections.values()).reduce((sum, set) => sum + set.size, 0),
        };
    }

    /**
     * Get connection count for session
     */
    public getSessionConnectionCount(sessionId: string): number {
        const connections = this.wsConnections.get(sessionId);
        return connections ? connections.size : 0;
    }

    /**
     * Close WebSocket server
     */
    public close(): void {
        this.wss.close();
        this.wsConnections.clear();
        console.log('[WS] WebSocket server closed');
    }

    /**
     * Get WebSocket server instance (for testing)
     */
    public getServer(): WebSocketServer {
        return this.wss;
    }

    /**
     * Get connections map (for testing)
     */
    public getConnections(): Map<string, Set<WebSocket>> {
        return this.wsConnections;
    }
}

// Export singleton instance
export const websocketServer = new WebSocketServerManager();