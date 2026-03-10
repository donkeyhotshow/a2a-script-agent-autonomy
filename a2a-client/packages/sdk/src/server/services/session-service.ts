/**
 * Session Service
 * 
 * Handles session management and operations.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {SessionDetail, SessionSummary, createSessionMessage} from '../session-dto.js';
import {
    loadSessionsFromStorage,
    saveSessionToStorage,
    deleteSessionFromStorage,
    loadSessionIdsFromPanelState,
    type PersistedSession
} from './session-storage.js';

export interface SessionServiceOptions {
    defaultTimeout?: number;
    maxConnectionsPerSession?: number;
}

/**
 * Session Service
 */
export class SessionService {
    private sessions: Map<string, SessionDetail>;
    private options: SessionServiceOptions;

    constructor(options: SessionServiceOptions = {}) {
        this.sessions = new Map();
        this.options = {
            defaultTimeout: 30 * 60 * 1000, // 30 minutes
            maxConnectionsPerSession: 10,
            ...options
        };
    }

    /**
     * Load persisted sessions from storage (call on startup)
     */
    public async loadFromStorage(): Promise<void> {
        const persisted = await loadSessionsFromStorage();
        for (const s of persisted) {
            const session = this.normalizePersistedSession(s);
            if (session) this.sessions.set(session.id, session);
        }

        // Merge stub sessions from panel state (sessions with panels but no persisted data)
        const { sessionIds, projectId } = await loadSessionIdsFromPanelState();
        let stubCount = 0;
        for (const sid of sessionIds) {
            if (!this.sessions.has(sid) && sid) {
                const pid = projectId || undefined;
                const now = new Date().toISOString();
                const stub: SessionDetail = {
                    id: sid,
                    status: 'active',
                    startTime: now,
                    endTime: null,
                    progress: 0,
                    totalSteps: 0,
                    currentStep: null,
                    context: {},
                    history: [],
                    connections: 0,
                    messages: [],
                    messageCount: 0,
                    metadata: {
                        createdAt: now,
                        updatedAt: now,
                        projectId: pid,
                        title: `Session ${sid.slice(-8)}`
                    }
                } as SessionDetail;
                this.sessions.set(sid, stub);
                this.persistSession(stub);
                stubCount++;
            }
        }
        if (stubCount > 0) {
            console.log(`[SESSION] Created ${stubCount} stub session(s) from panel state`);
        }
        console.log(`[SESSION] Loaded ${persisted.length} session(s) from storage`);
    }

    private normalizePersistedSession(s: PersistedSession): SessionDetail | null {
        if (!s?.id) return null;
        return {
            id: s.id,
            status: s.status ?? 'active',
            startTime: s.startTime ?? new Date().toISOString(),
            endTime: s.endTime ?? null,
            progress: s.progress ?? 0,
            totalSteps: s.totalSteps ?? 0,
            currentStep: s.currentStep ?? null,
            context: s.context ?? {},
            // Map execute fields - check both 'execute' and 'currentExecute'
            execute: s.execute ?? s.currentExecute ?? null,
            currentExecute: s.currentExecute ?? s.execute ?? null,
            history: Array.isArray(s.history) ? s.history : [],
            connections: s.connections ?? 0,
            messages: Array.isArray(s.messages) ? s.messages : [],
            messageCount: s.messageCount ?? 0,
            metadata: s.metadata ?? {}
        } as SessionDetail;
    }

    private persistSession(session: SessionDetail): void {
        saveSessionToStorage(session as unknown as PersistedSession).catch(() => {});
    }

    /**
     * Create a new session
     */
    public createSession(sessionId: string, options: Partial<SessionDetail> = {}): SessionDetail {
        const now = new Date().toISOString();
        
        // Create initial messages array with task as first user message if provided
        const messages: any[] = [];
        if (options.metadata?.task) {
            messages.push(createSessionMessage(
                options.metadata.task,
                'user',
                { source: 'initial_task', projectId: options.metadata.projectId }
            ));
        }

        const session: SessionDetail = {
            id: sessionId,
            status: 'active',
            startTime: now,
            endTime: null,
            progress: 0,
            totalSteps: 0,
            currentStep: null,
            context: {},
            history: [],
            connections: 0,
            messages,
            messageCount: messages.length,
            metadata: {
                createdAt: now,
                updatedAt: now,
                ...options.metadata
            },
            ...options
        };

        this.sessions.set(sessionId, session);
        this.persistSession(session);

        console.log(`[SESSION] Created session: ${sessionId} with ${messages.length} message(s)`);
        return session;
    }

    /**
     * Get session by ID
     */
    public getSession(sessionId: string): SessionDetail | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get all sessions
     */
    public getAllSessions(): SessionDetail[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Get session summary
     */
    public getSessionSummary(sessionId: string): SessionSummary | null {
        const session = this.getSession(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            progress: session.progress,
            totalSteps: session.totalSteps,
            currentStep: session.currentStep,
            connections: session.connections,
            metadata: session.metadata
        };
    }

    /**
     * Update session
     */
    public updateSession(sessionId: string, updates: Partial<SessionDetail>): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const updatedSession: SessionDetail = {
            ...session,
            ...updates,
            metadata: {
                ...session.metadata,
                updatedAt: new Date().toISOString()
            }
        };

        this.sessions.set(sessionId, updatedSession);
        this.persistSession(updatedSession);

        console.log(`[SESSION] Updated session: ${sessionId}`);
        return updatedSession;
    }

    /**
     * Update session progress
     */
    public updateSessionProgress(sessionId: string, progress: number, totalSteps?: number, currentStep?: string): SessionDetail | null {
        return this.updateSession(sessionId, {
            progress,
            totalSteps: totalSteps || this.sessions.get(sessionId)?.totalSteps,
            currentStep: currentStep || this.sessions.get(sessionId)?.currentStep
        });
    }

    /**
     * Add history record to session
     */
    public addHistoryRecord(sessionId: string, record: any): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const updatedSession = this.updateSession(sessionId, {
            history: [...session.history, {
                ...record,
                timestamp: new Date().toISOString()
            }]
        });

        return updatedSession;
    }

    /**
     * Add a message to the session
     */
    public addMessage(sessionId: string, content: unknown, role: 'user' | 'assistant' | 'system' = 'assistant', metadata?: Record<string, unknown>): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const message = createSessionMessage(content, role, metadata);
        const messages = Array.isArray(session.messages) ? [...session.messages, message] : [message];

        const updatedSession = this.updateSession(sessionId, {
            messages,
            messageCount: messages.length
        });

        console.log(`[SESSION] Added ${role} message to session: ${sessionId}, total messages: ${messages.length}`);
        return updatedSession;
    }

    /**
     * Get messages from session
     */
    public getMessages(sessionId: string): any[] {
        const session = this.sessions.get(sessionId);
        if (!session) return [];
        return Array.isArray(session.messages) ? session.messages : [];
    }

    /**
     * Update session context
     */
    public updateSessionContext(sessionId: string, context: Record<string, any>): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return this.updateSession(sessionId, {
            context: {
                ...session.context,
                ...context
            }
        });
    }

    /**
     * Increment connection count
     */
    public incrementConnections(sessionId: string): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const connectionCount = session.connections + 1;
        
        // Check max connections limit
        if (connectionCount > this.options.maxConnectionsPerSession!) {
            return null;
        }

        return this.updateSession(sessionId, {
            connections: connectionCount
        });
    }

    /**
     * Decrement connection count
     */
    public decrementConnections(sessionId: string): SessionDetail | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const connectionCount = Math.max(0, session.connections - 1);
        
        return this.updateSession(sessionId, {
            connections: connectionCount
        });
    }

    /**
     * Complete session
     */
    public completeSession(sessionId: string, result?: any): SessionDetail | null {
        return this.updateSession(sessionId, {
            status: 'completed',
            endTime: new Date().toISOString(),
            result
        });
    }

    /**
     * Fail session
     */
    public failSession(sessionId: string, error?: any): SessionDetail | null {
        return this.updateSession(sessionId, {
            status: 'failed',
            endTime: new Date().toISOString(),
            error
        });
    }

    /**
     * Cancel session
     */
    public cancelSession(sessionId: string, reason?: string): SessionDetail | null {
        return this.updateSession(sessionId, {
            status: 'cancelled',
            endTime: new Date().toISOString(),
            reason
        });
    }

    /**
     * Get session summary list
     */
    public getSessionSummaries(): SessionSummary[] {
        return Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            progress: session.progress,
            totalSteps: session.totalSteps,
            currentStep: session.currentStep,
            connections: session.connections,
            metadata: session.metadata
        }));
    }

    /**
     * Get active sessions
     */
    public getActiveSessions(): SessionDetail[] {
        return Array.from(this.sessions.values()).filter(session => session.status === 'active');
    }

    /**
     * Get completed sessions
     */
    public getCompletedSessions(): SessionDetail[] {
        return Array.from(this.sessions.values()).filter(session => session.status === 'completed');
    }

    /**
     * Get failed sessions
     */
    public getFailedSessions(): SessionDetail[] {
        return Array.from(this.sessions.values()).filter(session => session.status === 'failed');
    }

    /**
     * Clean up old sessions
     */
    public cleanupOldSessions(maxAge: number = this.options.defaultTimeout!): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            const sessionAge = now - new Date(session.startTime).getTime();
            
            // Clean up sessions that are older than maxAge and not active
            if (sessionAge > maxAge && session.status !== 'active') {
                this.sessions.delete(sessionId);
                deleteSessionFromStorage(sessionId).catch(() => {});
                cleanedCount++;
                console.log(`[SESSION] Cleaned up old session: ${sessionId}`);
            }
        }

        return cleanedCount;
    }

    /**
     * Get session statistics
     */
    public getStatistics(): {
        total: number;
        active: number;
        completed: number;
        failed: number;
        cancelled: number;
        averageDuration: number;
        totalConnections: number;
    } {
        const sessions = Array.from(this.sessions.values());
        const total = sessions.length;
        const active = sessions.filter(s => s.status === 'active').length;
        const completed = sessions.filter(s => s.status === 'completed').length;
        const failed = sessions.filter(s => s.status === 'failed').length;
        const cancelled = sessions.filter(s => s.status === 'cancelled').length;

        const durations = sessions
            .filter(s => s.endTime)
            .map(s => new Date(s.endTime!).getTime() - new Date(s.startTime).getTime());
        
        const averageDuration = durations.length > 0 
            ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
            : 0;

        const totalConnections = sessions.reduce((sum, s) => sum + s.connections, 0);

        return {
            total,
            active,
            completed,
            failed,
            cancelled,
            averageDuration,
            totalConnections
        };
    }

    /**
     * Close session service
     */
    public close(): void {
        this.sessions.clear();
        console.log('[SESSION] Session service closed');
    }

    /**
     * Delete session
     */
    public deleteSession(sessionId: string): boolean {
        const existed = this.sessions.has(sessionId);
        if (existed) {
            this.sessions.delete(sessionId);
            deleteSessionFromStorage(sessionId).catch(() => {});
            console.log(`[SESSION] Deleted session: ${sessionId}`);
        }
        return existed;
    }

    /**
     * Get all sessions map (for testing)
     */
    public getSessions(): Map<string, SessionDetail> {
        return this.sessions;
    }
}

// Export singleton instance
export const sessionService = new SessionService();