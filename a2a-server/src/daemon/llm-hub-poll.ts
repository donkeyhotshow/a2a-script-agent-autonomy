/**
 * Background polling: A2A Server → AI Hub (Ollama proxy).
 * Waits until ai-integration reports the LLM promise ready, then fetches response body.
 */

import {requestService} from '../services/core/request/request.service.js';
import {logger} from '../utils/logger.js';

type OllamaChatShape = {message?: {content?: string}};

function tryParseChatJson(s: string): OllamaChatShape | null {
    try {
        return JSON.parse(s) as OllamaChatShape;
    } catch {
        return null;
    }
}

/** Ollama /api/chat JSON; models may wrap it in ```json ... ``` despite JSON content-type. */
export function parseOllamaChatResponseBody(raw: string): OllamaChatShape | null {
    const trimmed = raw.trim();
    let parsed = tryParseChatJson(trimmed);
    if (parsed) return parsed;

    const openFence = trimmed.match(/^```(?:json)?\r?\n?/i);
    if (openFence) {
        const rest = trimmed.slice(openFence[0].length);
        const close = rest.lastIndexOf('```');
        if (close >= 0) {
            parsed = tryParseChatJson(rest.slice(0, close).trim());
            if (parsed) return parsed;
        }
    }

    const i = trimmed.indexOf('{');
    const j = trimmed.lastIndexOf('}');
    if (i >= 0 && j > i) {
        parsed = tryParseChatJson(trimmed.slice(i, j + 1));
        if (parsed) return parsed;
    }

    logger.debug('[llm-hub-poll] Ollama chat body is not parseable JSON', {
        length: trimmed.length,
        preview: trimmed.slice(0, 160).replace(/\s+/g, ' '),
    });
    return null;
}

export async function fetchLlmResponse(base: string, llmPromiseId: string): Promise<string | null> {
    const bodyRes = await fetch(`${base}/promise/${llmPromiseId}/response`);
    if (!bodyRes.ok) return null;
    const raw = await bodyRes.text();
    const chatData = parseOllamaChatResponseBody(raw);
    return chatData?.message?.content ?? null;
}

/** Result of GET `/promise/:id` for dialog recovery / resubmit decisions. */
export type LlmPromiseRecoveryKind =
    | {kind: 'ready'; responseMd: string}
    | {kind: 'pending'}
    | {kind: 'resubmit'; reason: string}
    | {kind: 'unavailable'; reason: string};

/**
 * Classify hub promise state via GET `/promise/:id` (404 = gone, 202 = pending, 200 = fetch body).
 * Avoids relying only on `/promises/status` ready list (done promises may be missing from it).
 */
export async function resolveLlmPromiseRecovery(
    base: string,
    llmPromiseId: string
): Promise<LlmPromiseRecoveryKind> {
    const normalizedBase = base.replace(/\/$/, '');
    const url = `${normalizedBase}/promise/${encodeURIComponent(llmPromiseId)}`;
    let statusRes: Response;
    try {
        statusRes = await fetch(url);
    } catch (e) {
        return {kind: 'unavailable', reason: `fetch_error:${String(e)}`};
    }
    if (statusRes.status === 404) {
        return {kind: 'resubmit', reason: 'promise_not_found'};
    }
    if (statusRes.status === 202) {
        return {kind: 'pending'};
    }
    if (statusRes.status === 500) {
        return {kind: 'resubmit', reason: 'hub_promise_error'};
    }
    if (!statusRes.ok) {
        return {kind: 'unavailable', reason: `http_${statusRes.status}`};
    }
    const responseMd = await fetchLlmResponse(normalizedBase, llmPromiseId);
    if (responseMd !== null && responseMd !== '') {
        return {kind: 'ready', responseMd};
    }
    return {kind: 'resubmit', reason: 'empty_or_unparseable_response'};
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
