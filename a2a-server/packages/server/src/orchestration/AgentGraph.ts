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
    /** Minimum confidence score [0..1] required to accept a passing verdict.
     *  When verdict.passed but confidence < threshold, the graph enters a
     *  low-confidence retry so the Planner can improve the result.
     *  Defaults to 0 (disabled). */
    confidenceThreshold?: number;
}

// ── AgentGraph ─────────────────────────────────────────────────────────────────

export class AgentGraph {
    private state: GraphState = GraphState.IDLE;
    private readonly maxRetries: number;
    private readonly maxParallelExecutors: number;
    private readonly baseRetryDelayMs: number;
    private readonly confidenceThreshold: number;
    private readonly loopDetector = new LoopDetector();

    constructor(opts: AgentGraphOptions = {}) {
        this.maxRetries           = opts.maxRetries           ?? Number(process.env['A2A_GRAPH_MAX_RETRIES']     ?? 3);
        this.maxParallelExecutors = opts.maxParallelExecutors ?? Number(process.env['A2A_GRAPH_MAX_EXECUTORS']   ?? 4);
        this.baseRetryDelayMs     = opts.retryDelayMs         ?? Number(process.env['A2A_GRAPH_RETRY_DELAY_MS'] ?? 1_000);
        this.confidenceThreshold  = opts.confidenceThreshold  ?? Number(process.env['A2A_GRAPH_CONFIDENCE_THRESHOLD'] ?? 0);
    }

    get currentState(): GraphState { return this.state; }

    async run(task: string, ctx: AgentContext): Promise<AgentGraphResult> {
        this.state = GraphState.IDLE;
        this.loopDetector.reset();

        // ── Restore persisted state (survives server restart) ─────────────────
        const snap = await restoreAgentGraphState(ctx.sessionId).catch(() => null);
        let retries = snap?.retries ?? 0;
        let currentTask = snap?.currentTask ?? task;
        if (snap) {
            logger.info('[AgentGraph] Resuming from persisted state', {
                sessionId: ctx.sessionId,
                state: snap.state,
                retries,
            });
        }
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
                void clearAgentGraphState(ctx.sessionId);
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
                // Accept the result only if confidence meets the configured threshold.
                if (this.confidenceThreshold > 0 && verdict.confidence < this.confidenceThreshold) {
                    // Low-confidence pass — treat as a soft failure so the Planner
                    // can produce a higher-quality result on the next iteration.
                    logger.warn('[AgentGraph] Low-confidence pass, forcing retry', {
                        confidence: verdict.confidence,
                        threshold: this.confidenceThreshold,
                    });
                    lastVerdict = {
                        ...verdict,
                        passed: false,
                        critique: verdict.critique
                            ?? `Low confidence ${verdict.confidence.toFixed(2)} < threshold ${this.confidenceThreshold.toFixed(2)}. Please improve output quality.`,
                    };
                    // Continue to RETRY path below
                } else {
                    this.state = GraphState.DONE;
                    logger.info('[AgentGraph] → DONE', { confidence: verdict.confidence });
                    void clearAgentGraphState(ctx.sessionId);
                    return { outcome: 'completed', state: this.state, artifacts: verdict.artifacts, retries, plan };
                }
            } else {
                lastVerdict = verdict;
            }
            const effectiveVerdict = lastVerdict!;

            // ── RETRY or FAIL ─────────────────────────────────────────────────
            if (retries >= this.maxRetries) {
                this.state = GraphState.FAILED;
                logger.warn('[AgentGraph] → FAILED', { retries, critique: effectiveVerdict.critique });
                void clearAgentGraphState(ctx.sessionId);
                return { outcome: 'failed', state: this.state, error: effectiveVerdict.critique, retries, plan };
            }

            this.state = GraphState.RETRY;
            retries++;
            const delay = this.baseRetryDelayMs * Math.pow(2, retries - 1);
            logger.warn('[AgentGraph] → RETRY', { retries, delayMs: delay });

            // Loop guard
            const loopKey = `${task.slice(0, 60)}|${effectiveVerdict.critique?.slice(0, 30) ?? ''}`;
            const loopSig = this.loopDetector.check(loopKey, 'retry', String(retries));
            if (loopSig?.severity === 'critical') {
                this.state = GraphState.FAILED;
                void clearAgentGraphState(ctx.sessionId);
                return { outcome: 'failed', state: this.state, error: 'Loop detected in retry cycle', retries, plan };
            }

            currentTask = `[Retry ${retries}] ${effectiveVerdict.critique ?? ''}\n\nOriginal: ${task}`;
            // Persist current state so the run can be resumed after a restart.
            void persistAgentGraphState(ctx.sessionId, {
                state: this.state,
                retries,
                currentTask,
                savedAt: Date.now(),
            });
            await _sleep(delay);
        }

        this.state = GraphState.FAILED;
        void clearAgentGraphState(ctx.sessionId);
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

// ── Redis state persistence ────────────────────────────────────────────────────

/** Serialisable snapshot of an in-progress AgentGraph run. */
export interface AgentGraphSnapshot {
    state: GraphState;
    retries: number;
    currentTask: string;
    savedAt: number;
}

const REDIS_TTL_SECONDS = 86_400; // 24 h

interface MinimalRedis {
    set(key: string, value: string, expiryMode: string, time: number): Promise<unknown>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<unknown>;
}

let _redisClient: MinimalRedis | null | undefined; // undefined = not yet attempted

async function getRedisClient(): Promise<MinimalRedis | null> {
    if (_redisClient !== undefined) return _redisClient;
    const url = process.env['REDIS_URL'];
    if (!url) { _redisClient = null; return null; }
    try {
        const mod = await import('ioredis');
        const Redis = (mod.default ?? mod) as unknown as new (url: string) => MinimalRedis;
        _redisClient = new Redis(url);
        return _redisClient;
    } catch {
        _redisClient = null;
        return null;
    }
}

/**
 * Persist an AgentGraph run state to Redis under `graph:state:{sessionId}`.
 * No-ops silently when Redis is unavailable.
 */
export async function persistAgentGraphState(
    sessionId: string,
    snapshot: AgentGraphSnapshot,
): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    try {
        await client.set(
            `graph:state:${sessionId}`,
            JSON.stringify(snapshot),
            'EX',
            REDIS_TTL_SECONDS,
        );
        logger.debug('[AgentGraph] State persisted', { sessionId, state: snapshot.state });
    } catch (err) {
        logger.warn('[AgentGraph] Redis persist error', { error: String(err) });
    }
}

/**
 * Restore a previously persisted AgentGraph run state from Redis.
 * Returns `null` when nothing is stored or Redis is unavailable.
 */
export async function restoreAgentGraphState(sessionId: string): Promise<AgentGraphSnapshot | null> {
    const client = await getRedisClient();
    if (!client) return null;
    try {
        const raw = await client.get(`graph:state:${sessionId}`);
        if (!raw) return null;
        const snap = JSON.parse(raw) as AgentGraphSnapshot;
        logger.info('[AgentGraph] State restored', { sessionId, state: snap.state });
        return snap;
    } catch (err) {
        logger.warn('[AgentGraph] Redis restore error', { error: String(err) });
        return null;
    }
}

/**
 * Delete a persisted state entry (call after the graph reaches DONE or FAILED).
 */
export async function clearAgentGraphState(sessionId: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    try {
        await client.del(`graph:state:${sessionId}`);
    } catch {
        // best-effort cleanup
    }
}

function _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}
