/**
 * AgentGraph — v2 DAG state machine (ADR-002).
 *
 * State transitions:
 *   IDLE → PLAN → EXECUTE → VERIFY → DONE
 *                          → RETRY → PLAN  (on failure, max 3x)
 *                                  → FAILED (budget exhausted)
 *
 * Features:
 *   - Parallel subtask execution (capped at maxParallelExecutors)
 *   - Dependency-aware scheduling
 *   - Exponential backoff between retries
 *   - Loop detection via LoopDetector
 */

import { logger } from '@a2a/server-utils/logger';
import { globalAgentFactory } from '../agents/AgentFactory.js';
import { LoopDetector } from '../safety-layer/LoopDetector.js';
import type { AgentContext, ExecutionPlan, SubTask, SubTaskResult, Verdict } from '../agents/IAgent.js';

// ── State ──────────────────────────────────────────────────────────────────────

export enum GraphState {
    IDLE    = 'IDLE',
    PLAN    = 'PLAN',
    EXECUTE = 'EXECUTE',
    VERIFY  = 'VERIFY',
    RETRY   = 'RETRY',
    DONE    = 'DONE',
    FAILED  = 'FAILED',
}

// ── Result ─────────────────────────────────────────────────────────────────────

export interface AgentGraphResult {
    outcome: 'completed' | 'failed';
    state: GraphState;
    artifacts?: unknown[];
    error?: string;
    retries: number;
    plan?: ExecutionPlan;
}

// ── Options ────────────────────────────────────────────────────────────────────

export interface AgentGraphOptions {
    maxRetries?: number;
    maxParallelExecutors?: number;
    retryDelayMs?: number;
}

// ── AgentGraph ─────────────────────────────────────────────────────────────────

export class AgentGraph {
    private state: GraphState = GraphState.IDLE;
    private readonly maxRetries: number;
    private readonly maxParallelExecutors: number;
    private readonly baseRetryDelayMs: number;
    private readonly loopDetector = new LoopDetector();

    constructor(opts: AgentGraphOptions = {}) {
        this.maxRetries           = opts.maxRetries           ?? Number(process.env['A2A_GRAPH_MAX_RETRIES']     ?? 3);
        this.maxParallelExecutors = opts.maxParallelExecutors ?? Number(process.env['A2A_GRAPH_MAX_EXECUTORS']   ?? 4);
        this.baseRetryDelayMs     = opts.retryDelayMs         ?? Number(process.env['A2A_GRAPH_RETRY_DELAY_MS'] ?? 1_000);
    }

    get currentState(): GraphState { return this.state; }

    async run(task: string, ctx: AgentContext): Promise<AgentGraphResult> {
        this.state = GraphState.IDLE;
        this.loopDetector.reset();

        let retries = 0;
        let currentTask = task;
        let lastVerdict: Verdict | null = null;

        while (retries <= this.maxRetries) {
            // ── PLAN ──────────────────────────────────────────────────────────
            this.state = GraphState.PLAN;
            logger.info('[AgentGraph] → PLAN', { sessionId: ctx.sessionId, retry: retries });

            let plan: ExecutionPlan;
            try {
                plan = await globalAgentFactory.getPlanner().decompose(currentTask, ctx);
            } catch (err: unknown) {
                this.state = GraphState.FAILED;
                return { outcome: 'failed', state: this.state, error: `Planning failed: ${String(err)}`, retries };
            }

            // ── EXECUTE ───────────────────────────────────────────────────────
            this.state = GraphState.EXECUTE;
            logger.info('[AgentGraph] → EXECUTE', { subtasks: plan.subtasks.length });
            const results = await this._executeParallel(plan.subtasks, ctx);

            // ── VERIFY ────────────────────────────────────────────────────────
            this.state = GraphState.VERIFY;
            logger.info('[AgentGraph] → VERIFY');
            const verdict = await globalAgentFactory.getCritic().evaluate(results, plan, ctx);
            lastVerdict = verdict;

            if (verdict.passed) {
                this.state = GraphState.DONE;
                logger.info('[AgentGraph] → DONE', { confidence: verdict.confidence });
                return { outcome: 'completed', state: this.state, artifacts: verdict.artifacts, retries, plan };
            }

            // ── RETRY or FAIL ─────────────────────────────────────────────────
            if (retries >= this.maxRetries) {
                this.state = GraphState.FAILED;
                logger.warn('[AgentGraph] → FAILED', { retries, critique: verdict.critique });
                return { outcome: 'failed', state: this.state, error: verdict.critique, retries, plan };
            }

            this.state = GraphState.RETRY;
            retries++;
            const delay = this.baseRetryDelayMs * Math.pow(2, retries - 1);
            logger.warn('[AgentGraph] → RETRY', { retries, delayMs: delay });

            // Loop guard
            const loopKey = `${task.slice(0, 60)}|${verdict.critique?.slice(0, 30) ?? ''}`;
            const loopSig = this.loopDetector.check(loopKey, 'retry', String(retries));
            if (loopSig?.severity === 'critical') {
                this.state = GraphState.FAILED;
                return { outcome: 'failed', state: this.state, error: 'Loop detected in retry cycle', retries, plan };
            }

            currentTask = `[Retry ${retries}] ${verdict.critique ?? ''}\n\nOriginal: ${task}`;
            await _sleep(delay);
        }

        this.state = GraphState.FAILED;
        return { outcome: 'failed', state: this.state, error: lastVerdict?.critique ?? 'Max retries exceeded', retries };
    }

    private async _executeParallel(subtasks: SubTask[], ctx: AgentContext): Promise<SubTaskResult[]> {
        const done = new Map<string, SubTaskResult>();
        const remaining = [...subtasks];

        while (remaining.length > 0) {
            const ready = remaining.filter((t) =>
                t.dependsOn.every((dep) => done.get(dep)?.status === 'completed'),
            );

            if (ready.length === 0) {
                // Deadlock — run remaining sequentially to unblock
                for (const t of [...remaining]) {
                    done.set(t.id, await globalAgentFactory.resolve(t).execute(t, ctx));
                    remaining.splice(remaining.indexOf(t), 1);
                }
                break;
            }

            const batch = ready.slice(0, this.maxParallelExecutors);
            for (const t of batch) remaining.splice(remaining.indexOf(t), 1);

            const settled = await Promise.allSettled(
                batch.map((t) => globalAgentFactory.resolve(t).execute(t, ctx)),
            );

            for (let i = 0; i < batch.length; i++) {
                const t = batch[i]!;
                const s = settled[i]!;
                done.set(t.id, s.status === 'fulfilled'
                    ? s.value
                    : {
                        taskId: t.id,
                        status: 'failed',
                        output: null,
                        error: String((s as PromiseRejectedResult).reason),
                        durationMs: 0,
                    });
            }
        }

        return [...done.values()];
    }
}

function _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}
