/**
 * PlannerAgent — decomposes a high-level task into topologically-sorted SubTasks.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@a2a/server-utils/logger';
import { BaseAgent } from './BaseAgent.js';
import { AgentRole } from './IAgent.js';
import type { AgentContext, ExecutionPlan, SubTask, SubTaskResult } from './IAgent.js';

export class PlannerAgent extends BaseAgent {
    readonly role = AgentRole.PLANNER;
    readonly capabilities = ['task-decomposition', 'goal-planning', 'dependency-resolution'];

    canHandle(task: SubTask): boolean {
        const d = task.description.toLowerCase();
        return d.includes('plan') || d.includes('decompose');
    }

    async decompose(task: string, ctx: AgentContext): Promise<ExecutionPlan> {
        logger.info('[PlannerAgent] Decomposing task', {
            sessionId: ctx.sessionId,
            task: task.slice(0, 100),
        });

        const subtasks = this._buildSubtasks(task);
        return {
            sessionId: ctx.sessionId,
            rootGoal: task,
            subtasks,
            estimatedTurns: subtasks.length * 2,
            riskFactors: [],
            fallbackStrategy: 'Retry with simplified sub-tasks if primary plan fails.',
        };
    }

    private _buildSubtasks(task: string): SubTask[] {
        const base = `st-${randomUUID().slice(0, 8)}`;
        return [
            {
                id: `${base}-1`,
                description: `Analyse context and requirements for: ${task.slice(0, 80)}`,
                dependsOn: [],
                expectedOutputs: ['analysis'],
                maxRetries: 2,
                timeoutMs: 60_000,
            },
            {
                id: `${base}-2`,
                description: `Implement primary solution for: ${task.slice(0, 80)}`,
                dependsOn: [`${base}-1`],
                expectedOutputs: ['implementation'],
                maxRetries: 3,
                timeoutMs: 120_000,
            },
            {
                id: `${base}-3`,
                description: 'Verify and test the implementation',
                dependsOn: [`${base}-2`],
                expectedOutputs: ['test-results'],
                maxRetries: 2,
                timeoutMs: 90_000,
            },
        ];
    }

    async execute(task: SubTask, ctx: AgentContext): Promise<SubTaskResult> {
        const start = Date.now();
        try {
            const plan = await this.decompose(task.description, ctx);
            return this.successResult(task, plan, start);
        } catch (err: unknown) {
            return this.failResult(task, String(err), start);
        }
    }
}
