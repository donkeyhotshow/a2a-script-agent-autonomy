/**
 * BaseAgent — shared infrastructure for all agent roles.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@a2a/server-utils/logger';
import type { IAgent, AgentCard, AgentContext, SubTask, SubTaskResult } from './IAgent.js';
import { AgentRole } from './IAgent.js';

export abstract class BaseAgent implements IAgent {
    readonly id: string;
    abstract readonly role: AgentRole;
    abstract readonly capabilities: string[];

    constructor(id?: string) {
        this.id = id ?? `agent-${randomUUID()}`;
    }

    abstract execute(task: SubTask, ctx: AgentContext): Promise<SubTaskResult>;
    abstract canHandle(task: SubTask): boolean;

    getAgentCard(): AgentCard {
        return {
            id: this.id,
            name: `${this.role}-${this.id.slice(-8)}`,
            role: this.role,
            capabilities: this.capabilities,
            endpoint: process.env['A2A_SERVER_URL'] ?? 'http://localhost:3000',
            version: '2.0.0',
            maxConcurrent: 1,
        };
    }

    protected failResult(task: SubTask, error: string, startMs: number): SubTaskResult {
        logger.warn(`[${this.role}] Task failed`, { taskId: task.id, error });
        return { taskId: task.id, status: 'failed', output: null, error, durationMs: Date.now() - startMs };
    }

    protected successResult(task: SubTask, output: unknown, startMs: number): SubTaskResult {
        logger.info(`[${this.role}] Task completed`, { taskId: task.id });
        return { taskId: task.id, status: 'completed', output, durationMs: Date.now() - startMs };
    }
}
