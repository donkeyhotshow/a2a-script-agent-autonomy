/**
 * Session Log Service
 * 
 * Manages session logging with different log levels and message projections.
 * Provides logging functionality for client sessions and message projection
 * for different message types.
 */

import { PrismaClient, MessageDirection, MessageRole, MessageStatus } from '@prisma/client';
import { logger } from '../../../utils/logger.js';

const prisma = new PrismaClient();

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Session log entry
export interface SessionLogEntry {
    id: string;
    sessionId: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    timestamp: Date;
}

// Session log create input
export interface CreateSessionLogInput {
    sessionId: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
}

// Message projection types
export type ProjectionType = 'summary' | 'detail' | 'minimal' | 'full';

// Projected message
export interface ProjectedMessage {
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: MessageRole | null;
    projectedContent: string;
    projectionType: ProjectionType;
    timestamp: Date;
}

/**
 * Session Log Service
 * Provides logging functionality for client sessions
 */
export class SessionLogService {
    /**
     * Create a new session log entry
     */
    async createLog(input: CreateSessionLogInput): Promise<SessionLogEntry> {
        const entry: SessionLogEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: input.sessionId,
            level: input.level,
            message: input.message,
            context: input.context,
            timestamp: new Date(),
        };

        // Log based on level
        const logData = {
            sessionId: input.sessionId,
            ...input.context,
        };

        switch (input.level) {
            case 'debug':
                logger.debug(input.message, logData);
                break;
            case 'info':
                logger.info(input.message, logData);
                break;
            case 'warn':
                logger.warn(input.message, logData);
                break;
            case 'error':
                logger.error(input.message, logData);
                break;
        }

        // Store in database
        try {
            await prisma.$executeRaw`
                INSERT INTO session_logs (id, session_id, level, message, context, created_at)
                VALUES (${entry.id}, ${entry.sessionId}, ${entry.level}, ${entry.message}, ${JSON.stringify(entry.context)}, ${entry.timestamp})
                ON CONFLICT (id) DO NOTHING
            `;
        } catch (error) {
            // Fallback: just log, table might not exist
            logger.debug('Session log storage skipped', { error: String(error) });
        }

        return entry;
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
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        try {
            // Try database first
            const result = await prisma.$queryRaw<Array<{
                id: string;
                session_id: string;
                level: string;
                message: string;
                context: Record<string, unknown> | null;
                created_at: Date;
            }>>`
                SELECT id, session_id, level, message, context, created_at
                FROM session_logs
                WHERE session_id = ${sessionId}
                ${options?.level ? Prisma.raw(`AND level = '${options.level}'`) : Prisma.raw('')}
                ORDER BY created_at DESC
                LIMIT ${limit}
                OFFSET ${offset}
            `;

            return result.map((row) => ({
                id: row.id,
                sessionId: row.session_id,
                level: row.level as LogLevel,
                message: row.message,
                context: row.context,
                timestamp: row.created_at,
            }));
        } catch {
            // Return empty array if table doesn't exist
            return [];
        }
    }

    /**
     * Clear logs for a session
     */
    async clearLogs(sessionId: string): Promise<number> {
        try {
            const result = await prisma.$executeRaw`
                DELETE FROM session_logs WHERE session_id = ${sessionId}
            `;
            logger.info('Session logs cleared', { sessionId, count: result });
            return Number(result);
        } catch {
            return 0;
        }
    }

    /**
     * Log info level
     */
    async info(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry> {
        return this.createLog({ sessionId, level: 'info', message, context });
    }

    /**
     * Log debug level
     */
    async debug(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry> {
        return this.createLog({ sessionId, level: 'debug', message, context });
    }

    /**
     * Log warn level
     */
    async warn(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry> {
        return this.createLog({ sessionId, level: 'warn', message, context });
    }

    /**
     * Log error level
     */
    async error(sessionId: string, message: string, context?: Record<string, unknown>): Promise<SessionLogEntry> {
        return this.createLog({ sessionId, level: 'error', message, context });
    }
}

/**
 * Message Projection Service
 * Projects messages to different formats based on projection type
 */
export class MessageProjectionService {
    /**
     * Project a message to a specific format
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
        projectionType: ProjectionType = 'detail'
    ): ProjectedMessage {
        const projectedContent = this.projectContent(message.content, message.contentText, projectionType);

        return {
            id: message.id,
            sessionId: message.sessionId,
            direction: message.direction,
            role: message.role,
            projectedContent,
            projectionType,
            timestamp: message.createdAt,
        };
    }

    /**
     * Project multiple messages
     */
    projectMessages(
        messages: Array<{
            id: string;
            sessionId: string;
            direction: MessageDirection;
            role: MessageRole | null;
            content: Record<string, unknown>;
            contentText: string | null;
            createdAt: Date;
        }>,
        projectionType: ProjectionType = 'detail'
    ): ProjectedMessage[] {
        return messages.map((msg) => this.projectMessage(msg, projectionType));
    }

    /**
     * Project content based on type and projection level
     */
    private projectContent(
        content: Record<string, unknown>,
        contentText: string | null,
        projectionType: ProjectionType
    ): string {
        // For minimal projection, just return the text content if available
        if (projectionType === 'minimal') {
            return contentText ?? this.extractSimpleValue(content) ?? '';
        }

        // For summary, return a brief summary
        if (projectionType === 'summary') {
            if (contentText) {
                return contentText.length > 100 ? contentText.substring(0, 100) + '...' : contentText;
            }
            return this.extractSimpleValue(content) ?? '';
        }

        // For detail and full, return full content
        if (contentText) {
            return contentText;
        }

        // For full, include the entire JSON structure
        if (projectionType === 'full') {
            return JSON.stringify(content, null, 2);
        }

        // Default to detail
        return this.extractSimpleValue(content) ?? JSON.stringify(content);
    }

    /**
     * Extract the most meaningful value from content
     */
    private extractSimpleValue(content: Record<string, unknown>): string | null {
        // Try common fields
        const fields = ['message', 'text', 'content', 'description', 'title'];
        for (const field of fields) {
            if (typeof content[field] === 'string') {
                return content[field] as string;
            }
        }

        // Return null if nothing found
        return null;
    }

    /**
     * Get projected messages for a session
     */
    async getProjectedMessages(
        sessionId: string,
        projectionType: ProjectionType = 'detail',
        options?: {
            limit?: number;
            offset?: number;
            direction?: MessageDirection;
        }
    ): Promise<ProjectedMessage[]> {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;

        const where: Record<string, unknown> = { sessionId };
        if (options?.direction) {
            where.direction = options.direction;
        }

        const messages = await prisma.message.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
            skip: offset,
        });

        return this.projectMessages(
            messages.map((m) => ({
                id: m.id,
                sessionId: m.sessionId,
                direction: m.direction,
                role: m.role,
                content: m.content as Record<string, unknown>,
                contentText: m.contentText,
                createdAt: m.createdAt,
            })),
            projectionType
        );
    }
}

// Singleton instances
export const sessionLogService = new SessionLogService();
export const messageProjectionService = new MessageProjectionService();
