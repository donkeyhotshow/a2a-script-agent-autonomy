/**
 * Background polling: A2A Server → AI Hub (Ollama proxy).
 * Waits until ai-integration reports the LLM promise ready, then fetches response body.
 */

import {requestService} from '../services/core/request/request.service.js';

export async function fetchLlmResponse(base: string, llmPromiseId: string): Promise<string | null> {
    const bodyRes = await fetch(`${base}/promise/${llmPromiseId}/response`);
    if (!bodyRes.ok) return null;
    const chatData = (await bodyRes.json()) as {message?: {content?: string}};
    return chatData?.message?.content ?? null;
}

function readEnvMs(name: string, fallback: number, maxCap: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return Math.min(fallback, maxCap);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return Math.min(fallback, maxCap);
    return Math.min(Math.max(n, 1000), maxCap);
}

export type LlmPollOpts = {
    /** A2A request `promiseId` — context gets `requestPhase: llm_waiting` on each poll tick. */
    a2aPromiseId?: string;
};

/**
 * Poll `/promises/status` until `llmPromiseId` is ready, then GET `/promise/:id/response`.
 */
export async function pollReadyThenFetch(
    base: string,
    llmPromiseId: string,
    opts?: LlmPollOpts
): Promise<string | null> {
    const pollIntervalMs = readEnvMs('LLM_POLL_INTERVAL_MS', parseInt(process.env.POLL_INTERVAL_MS || '2000', 10) || 2000, 120_000);
    const pollTimeoutMs = readEnvMs(
        'LLM_POLL_TIMEOUT_MS',
        parseInt(process.env.POLL_TIMEOUT_MS || '3600000', 10) || 3_600_000,
        86_400_000
    );
    const started = Date.now();
    for (;;) {
        if (opts?.a2aPromiseId) {
            await requestService.patchRequestContext(opts.a2aPromiseId, {requestPhase: 'llm_waiting'});
        }
        const res = await fetch(`${base}/promises/status`);
        if (res.ok) {
            const data = (await res.json()) as {ready?: Array<{promiseId?: string}>};
            if ((data.ready ?? []).some((p) => p.promiseId === llmPromiseId)) {
                return fetchLlmResponse(base, llmPromiseId);
            }
        }
        if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
}
