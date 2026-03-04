/**
 * Session Manager
 * 
 * Unified session management service that integrates:
 * - Session logging (SessionLogService)
 * - Message projection (MessageProjectionService)
 * - Session state management
 * 
 * Provides a complete API for client session management.
 */

import { MessageDirection, MessageRole } from '@prisma/client';
import {
    SessionLogService,
    sessionLogService,
    LogLevel,
    CreateSessionLogInput,
    SessionLogEntry,
} from './session-log.service.js';
import {
    MessageProjectionService,
    messageProjectionService,
    ProjectionType,
    ProjectedMessage,
} from './session-log.service.js';

export {
    SessionLogService,
    sessionLogService,
    MessageProjectionService,
    messageProjectionService,
    LogLevel,
    ProjectionType,
    CreateSessionLogInput,
    SessionLogEntry,
    ProjectedMessage,
};

/**
 * Session Manager Options
 */
export interface SessionManagerOptions {
    enableLogging?: boolean;
    enableProjection?: boolean;
    defaultProjectionType?: ProjectionType;
}

/**
 * Session state
 */
export interface SessionState {
    id: string;
    projectId: string;
    title: string;
    status: 'created' | 'active' | 'completed' | 'error';
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    lastActivity: Date;
}

/**
 * Session Manager
 * 
 * Provides unified session management with logging and projection capabilities.
 */
export class SessionManager {
    private logService: SessionLogService;
    private projectionService: MessageProjectionService;
    private options: Required<SessionManagerOptions>;

    constructor(options: SessionManagerOptions = {}) {
        this.logService = sessionLogService;
        this.projectionService = messageProjectionService;
        this.options = {
            enableLogging: options.enableLogging ?? true,
            enableProjection: options.enableProjection ?? true,
            defaultProjectionType: options.defaultProjectionType ?? 'detail',
        };
    }

    // ==================== Logging Methods ====================

    /**
     * Log an info message for a session
     */
    async logInfo(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry | null> {
        if (!this.options.enableLogging) return null;
        return this.logService.info(sessionId, message, context);
    }

    /**
     * Log a debug message for a session
     */
    async logDebug(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry | null> {
        if (!this.options.enableLogging) return null;
        return this.logService.debug(sessionId, message, context);
    }

    /**
     * Log a warning message for a session
     */
    async logWarn(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry | null> {
        if (!this.options.enableLogging) return null;
        return this.logService.warn(sessionId, message, context);
    }

    /**
     * Log an error message for a session
     */
    async logError(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry | null> {
        if (!this.options.enableLogging) return null;
        return this.logService.error(sessionId, message, context);
    }

    /**
     * Create a custom log entry
     */
    async log(input: CreateSessionLogInput): Promise<SessionLogEntry | null> {
        if (!this.options.enableLogging) return null;
        return this.logService.createLog(input);
    }

    /**
     * Get logs for a session
     */
    async getLogs(
        sessionId: string,
        options?: {
            level?: LogLevel;
            limit?: number;
            offset?: number;
        }
    ): Promise<SessionLogEntry[]> {
        return this.logService.getLogs(sessionId, options);
    }

    /**
     * Clear logs for a session
     */
    async clearLogs(sessionId: string): Promise<number> {
        return this.logService.clearLogs(sessionId);
    }

    // ==================== Projection Methods ====================

    /**
     * Get projected messages for a session
     */
    async getProjectedMessages(
        sessionId: string,
        projectionType?: ProjectionType,
        options?: {
            limit?: number;
            offset?: number;
            direction?: MessageDirection;
        }
    ): Promise<ProjectedMessage[]> {
        if (!this.options.enableProjection) return [];
        return this.projectionService.getProjectedMessages(
            sessionId,
            projectionType ?? this.options.defaultProjectionType,
            options
        );
    }

    /**
     * Project a single message
     */
    projectMessage(
        message: {
            id: string;
            sessionId: string;
            direction: MessageDirection;
            role: MessageRole | null;
            content: Record<string, unknown>;
            contentText: string | null;
            createdAt: Date;
        },
        projectionType?: ProjectionType
    ): ProjectedMessage {
        return this.projectionService.projectMessage(
            message,
            projectionType ?? this.options.defaultProjectionType
        );
    }

    // ==================== Combined Methods ====================

    /**
     * Log a session event and get projected messages
     */
    async logAndGetMessages(
        sessionId: string,
        logLevel: LogLevel,
        message: string,
        projectionType?: ProjectionType,
        context?: Record<string, unknown>
    ): Promise<{
        log: SessionLogEntry | null;
        messages: ProjectedMessage[];
    }> {
        const log = await this.log({ sessionId, level: logLevel, message, context });
        const messages = await this.getProjectedMessages(sessionId, projectionType);

        return { log, messages };
    }

    /**
     * Get session summary (logs + projected messages)
     */
    async getSessionSummary(
        sessionId: string,
        options?: {
            logLimit?: number;
            messageLimit?: number;
            logLevel?: LogLevel;
            projectionType?: ProjectionType;
        }
    ): Promise<{
        logs: SessionLogEntry[];
        messages: ProjectedMessage[];
        logCount: number;
        messageCount: number;
    }> {
        const logs = await this.getLogs(sessionId, {
            level: options?.logLevel,
            limit: options?.logLimit ?? 20,
        });

        const messages = await this.getProjectedMessages(
            sessionId,
            options?.projectionType,
            { limit: options?.messageLimit ?? 50 }
        );

        // Get total counts
        const allLogs = await this.getLogs(sessionId, { limit: 1000 });
        const allMessages = await this.getProjectedMessages(sessionId, 'minimal', { limit: 1000 });

        return {
            logs,
            messages,
            logCount: allLogs.length,
            messageCount: allMessages.length,
        };
    }

    /**
     * Search logs by keyword
     */
    async searchLogs(
        sessionId: string,
        keyword: string,
        options?: {
            limit?: number;
            offset?: number;
            level?: LogLevel;
        }
    ): Promise<SessionLogEntry[]> {
        const logs = await this.getLogs(sessionId, {
            level: options?.level,
            limit: options?.limit ?? 100,
            offset: options?.offset,
        });

        // Filter by keyword
        const lowerKeyword = keyword.toLowerCase();
        return logs.filter(
            (log) =>
                log.message.toLowerCase().includes(lowerKeyword) ||
                (log.context && JSON.stringify(log.context).toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * Get session activity timeline (logs + messages merged)
     */
    async getActivityTimeline(
        sessionId: string,
        options?: {
            limit?: number;
            offset?: number;
        }
    ): Promise<Array<{
        type: 'log' | 'message';
        timestamp: Date;
        data: SessionLogEntry | ProjectedMessage;
    }>> {
        const [logs, messages] = await Promise.all([
            this.getLogs(sessionId, { limit: options?.limit ?? 100, offset: options?.offset }),
            this.getProjectedMessages(sessionId, 'minimal', { limit: options?.limit ?? 100, offset: options?.offset }),
        ]);

        // Merge and sort by timestamp
        const timeline: Array<{
            type: 'log' | 'message';
            timestamp: Date;
            data: SessionLogEntry | ProjectedMessage;
        }> = [
            ...logs.map((log) => ({ type: 'log' as const, timestamp: log.timestamp, data: log })),
            ...messages.map((msg) => ({ type: 'message' as const, timestamp: msg.timestamp, data: msg })),
        ];

        // Sort descending by timestamp
        timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return timeline;
    }
}

// Default singleton instance
export const sessionManager = new SessionManager();
