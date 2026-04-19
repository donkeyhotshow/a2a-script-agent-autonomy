/**
 * Agent Bridge interrupt handler — A2A-over-A2A (ADR-0082 draft).
 *
 * Allows the current gray-room session to delegate a sub-task to a *remote*
 * A2A Server instance.  The handler:
 *   1. Creates a new session on the target host.
 *   2. Submits the task as a `/next` turn.
 *   3. Polls `/async` until the remote session reaches a terminal state
 *      (completed | failed | timed-out).
 *   4. Merges the remote result back into the local working context.
 *
 * Interrupt directive shape:
 * ```json
 * {
 *   "reason": "agent_bridge",
 *   "data": {
 *     "targetUrl": "http://remote-a2a:3000",
 *     "task": "Summarise the attached document",
 *     "context": { "...": "optional extra context fields" },
 *     "timeoutMs": 120000,
 *     "pollIntervalMs": 2000
 *   }
 * }
 * ```
 *
 * The merged result is placed under `workingCtx.agent_bridge_result`.
 */

import { logger } from '@a2a/server-utils/logger';
import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '@a2a/server-ai';
import { BaseGrayRoomHandler } from './base-handler.js';

// ── A2A Client API types ───────────────────────────────────────────────────────

interface A2ASessionResponse {
    sessionId?: string;
    session_id?: string;
    promiseId?: string;
    promise_id?: string;
}

interface A2AAsyncResponse {
    status?: string;
    state?: string;
    result?: unknown;
    output?: unknown;
    error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveId(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string' && v.length > 0) return v;
    }
    return undefined;
}

const TERMINAL_STATES = new Set(['completed', 'failed', 'done', 'error', 'cancelled']);

function isTerminal(resp: A2AAsyncResponse): boolean {
    const s = (resp.status ?? resp.state ?? '').toLowerCase();
    return TERMINAL_STATES.has(s);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const resp = await fetch(url, init);
    if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${body}`);
    }
    return resp.json() as Promise<T>;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export class HandleAgentBridge extends BaseGrayRoomHandler {
    protected async handleInterrupt(
        interrupt: InterruptDirective,
        ctx: GrayRoomContext,
        _promiseId: string,
        _aiHubUrl: string,
        _model: string,
        trace: ServerInterruptTraceEvent[],
    ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
        const data = (interrupt.data ?? {}) as Record<string, unknown>;
        const targetUrl  = String(data['targetUrl']  ?? '').replace(/\/$/, '');
        const task       = String(data['task']        ?? '');
        const extraCtx   = (data['context'] as Record<string, unknown> | undefined) ?? {};
        const timeoutMs  = Number(data['timeoutMs']      ?? 120_000);
        const pollMs     = Number(data['pollIntervalMs'] ?? 2_000);

        if (!targetUrl || !task) {
            logger.warn('[AgentBridge] Missing targetUrl or task');
            trace.push({ kind: 'sidecar_llm', purpose: 'agent_bridge', ok: false, meta: 'missing_params' });
            return { nextCtx: ctx, continueLoop: false };
        }

        logger.info('[AgentBridge] Delegating to remote A2A', { targetUrl, task: task.slice(0, 80) });

        // 1. Create remote session
        let sessionId: string;
        try {
            const sessionResp = await fetchJson<A2ASessionResponse>(
                `${targetUrl}/api/a2a/sessions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context: extraCtx }),
                },
            );
            const id = resolveId(sessionResp as unknown as Record<string, unknown>, 'sessionId', 'session_id');
            if (!id) throw new Error('No sessionId in response');
            sessionId = id;
        } catch (err) {
            logger.error('[AgentBridge] Failed to create remote session', { error: String(err) });
            trace.push({ kind: 'sidecar_llm', purpose: 'agent_bridge', ok: false, meta: 'session_create_error' });
            return { nextCtx: { ...ctx, agent_bridge_result: { outcome: 'failed', error: String(err) } }, continueLoop: false };
        }

        // 2. Submit task via /next
        let promiseId: string;
        try {
            const nextResp = await fetchJson<Record<string, unknown>>(
                `${targetUrl}/api/a2a/sessions/${sessionId}/next`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'agent', task }),
                },
            );
            const pid = resolveId(nextResp, 'promiseId', 'promise_id');
            if (!pid) throw new Error('No promiseId in /next response');
            promiseId = pid;
        } catch (err) {
            logger.error('[AgentBridge] Failed to submit task', { error: String(err) });
            trace.push({ kind: 'sidecar_llm', purpose: 'agent_bridge', ok: false, meta: 'task_submit_error' });
            return { nextCtx: { ...ctx, agent_bridge_result: { outcome: 'failed', error: String(err) } }, continueLoop: false };
        }

        // 3. Poll /async until terminal or timeout
        const deadline = Date.now() + timeoutMs;
        let lastResp: A2AAsyncResponse | null = null;

        while (Date.now() < deadline) {
            try {
                const asyncResp = await fetchJson<A2AAsyncResponse>(
                    `${targetUrl}/api/a2a/sessions/${sessionId}/async/${promiseId}`,
                );
                lastResp = asyncResp;
                if (isTerminal(asyncResp)) break;
            } catch (err) {
                logger.warn('[AgentBridge] Poll error', { error: String(err) });
            }
            await _sleep(pollMs);
        }

        const timedOut = !lastResp || !isTerminal(lastResp);
        if (timedOut) {
            logger.warn('[AgentBridge] Remote session timed out', { sessionId, promiseId });
            trace.push({ kind: 'sidecar_llm', purpose: 'agent_bridge', ok: false, meta: 'timeout' });
            return {
                nextCtx: { ...ctx, agent_bridge_result: { outcome: 'failed', error: 'agent_bridge timeout' } },
                continueLoop: false,
            };
        }

        const succeeded = (lastResp.status ?? lastResp.state ?? '').toLowerCase() === 'completed';
        logger.info('[AgentBridge] Remote session finished', { sessionId, status: lastResp.status ?? lastResp.state });
        trace.push({
            kind: 'sidecar_llm',
            purpose: 'agent_bridge',
            ok: succeeded,
            meta: `session=${sessionId} status=${lastResp.status ?? lastResp.state}`,
        });

        const bridgeResult = {
            outcome: succeeded ? 'completed' : 'failed',
            sessionId,
            promiseId,
            result: lastResp.result ?? lastResp.output ?? null,
            error: lastResp.error,
        };

        return {
            nextCtx: { ...ctx, agent_bridge_result: bridgeResult },
            continueLoop: succeeded,
        };
    }
}

// Export a function for backward compatibility with the orchestrator switch
export async function handleAgentBridge(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[],
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    const handler = new HandleAgentBridge();
    return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}

function _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}
