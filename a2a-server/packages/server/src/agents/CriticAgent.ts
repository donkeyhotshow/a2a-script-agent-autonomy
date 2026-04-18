/**
 * CriticAgent — evaluates SubTaskResult[] and produces a Verdict.
 */

import { logger } from '@a2a/server-utils/logger';
import { BaseAgent } from './BaseAgent.js';
import { AgentRole } from './IAgent.js';
import type { AgentContext, ExecutionPlan, SubTask, SubTaskResult, Verdict } from './IAgent.js';

export class CriticAgent extends BaseAgent {
    readonly role = AgentRole.CRITIC;
    readonly capabilities = ['code-review', 'validation', 'quality-gate', 'output-scoring'];

    canHandle(task: SubTask): boolean {
        const d = task.description.toLowerCase();
        return d.includes('review') || d.includes('verify') || d.includes('validate');
    }

    async evaluate(results: SubTaskResult[], _plan: ExecutionPlan, _ctx: AgentContext): Promise<Verdict> {
        const failures: string[] = [];
        const artifacts: unknown[] = [];
        let successCount = 0;

        for (const result of results) {
            if (result.status === 'completed') {
                successCount++;
                if (result.output) artifacts.push(result.output);
            } else if (result.status === 'failed') {
                failures.push(`Task ${result.taskId}: ${result.error ?? 'unknown error'}`);
            }
        }

        const hasOutput = artifacts.length > 0;
        const confidence = results.length === 0
            ? 0
            : (successCount / results.length) * (hasOutput ? 1.0 : 0.8);

        if (failures.length > 0) {
            const critique = [`${failures.length} subtask(s) failed:`, ...failures.slice(0, 5)].join('\n');
            logger.warn('[CriticAgent] FAIL', { failures: failures.length, confidence });
            return { passed: false, critique, failures, artifacts, confidence };
        }

        if (!hasOutput) {
            logger.warn('[CriticAgent] FAIL — no artifacts');
            return {
                passed: false,
                critique: 'All subtasks completed but no output artifacts produced.',
                failures: ['No output artifacts'],
                artifacts,
                confidence,
            };
        }

        logger.info('[CriticAgent] PASS', { confidence });
        return { passed: true, artifacts, confidence };
    }

    async execute(task: SubTask, _ctx: AgentContext): Promise<SubTaskResult> {
        return this.successResult(task, { note: 'Critique via execute()' }, Date.now());
    }
}
