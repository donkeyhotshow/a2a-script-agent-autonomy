/**
 * Background polling: A2A Server → AI Hub (Ollama proxy).
 * Waits until ai-integration reports the LLM promise ready, then fetches response body.
 */

import {requestService} from '../services/core/request/request.service.js';
import {logger} from '../utils/logger.js';
import {resolveAiHubBaseUrl} from '../utils/ai-hub-url.js';
import {AI_HUB_JSON_HEADERS, type AiHubChatRequestBody} from '../utils/ai-hub-chat-sync.js';
import {tryParseJsonFromLlmText} from '../utils/strip-markdown-json-fence.js';

/** Ollama /api/chat uses `message.content`; /api/generate uses top-level `response`. */
type OllamaChatShape = {message?: {content?: string}; response?: string};

/** Ollama /api/chat JSON; models may wrap it in ```json ... ``` despite JSON content-type. */
export function parseOllamaChatResponseBody(raw: string): OllamaChatShape | null {
    const trimmed = raw.trim();
    const parsed = tryParseJsonFromLlmText(trimmed);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as OllamaChatShape;
    }

    logger.debug('[llm-hub-poll] Ollama chat body is not parseable JSON', {
        length: trimmed.length,
        preview: trimmed.slice(0, 160).replace(/\s+/g, ' '),
    });
    return null;
}

function extractOllamaText(chat: OllamaChatShape | null): string | null {
    if (!chat) return null;
    const fromChat = chat.message?.content;
    if (typeof fromChat === 'string' && fromChat.trim() !== '') return fromChat;
    const fromGen = chat.response;
    if (typeof fromGen === 'string' && fromGen.trim() !== '') return fromGen;
    return null;
}

export async function fetchLlmResponse(base: string, llmPromiseId: string): Promise<string | null> {
    const normalizedBase = resolveAiHubBaseUrl(base);
    const bodyRes = await fetch(`${normalizedBase}/promise/${llmPromiseId}/response`);
    if (!bodyRes.ok) return null;
    const raw = await bodyRes.text();
    const chatData = parseOllamaChatResponseBody(raw);
    return extractOllamaText(chatData);
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
    const normalizedBase = resolveAiHubBaseUrl(base);
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

/** @deprecated Use {@link AiHubChatRequestBody} from `ai-hub-chat-sync.js`. */
export type AiHubChatPromiseBody = AiHubChatRequestBody;

export type InitAiHubChatPromiseResult =
    | {ok: true; llmPromiseId: string}
    | {ok: false; reason: 'bad_http_status'; status: number; bodyText: string}
    | {ok: false; reason: 'missing_llm_promise_id'};

/**
 * Start async LLM work: `POST {base}/api/chat?promise=1` with `X-Server-Promise-Id`.
 * On 202, returns hub `promiseId` for {@link pollReadyThenFetch} / {@link fetchLlmResponse}.
 */
export async function initAiHubChatPromise(
    base: string,
    serverPromiseId: string,
    body: AiHubChatRequestBody
): Promise<InitAiHubChatPromiseResult> {
    const normalizedBase = resolveAiHubBaseUrl(base);
    const chatRes = await fetch(`${normalizedBase}/api/chat?promise=1`, {
        method: 'POST',
        headers: {
            ...AI_HUB_JSON_HEADERS,
            'X-Server-Promise-Id': serverPromiseId,
        },
        body: JSON.stringify(body),
    });
    if (chatRes.status !== 202) {
        const bodyText = await chatRes.text();
        return {ok: false, reason: 'bad_http_status', status: chatRes.status, bodyText};
    }
    const initData = (await chatRes.json()) as {promiseId?: string};
    const llmPromiseId = initData?.promiseId;
    if (!llmPromiseId) {
        return {ok: false, reason: 'missing_llm_promise_id'};
    }
    return {ok: true, llmPromiseId};
}

/**
 * Poll `/promises/status` until `llmPromiseId` is ready, then GET `/promise/:id/response`.
 */
export async function pollReadyThenFetch(
    base: string,
    llmPromiseId: string,
    opts?: LlmPollOpts
): Promise<string | null> {
    const normalizedBase = resolveAiHubBaseUrl(base);
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
        const res = await fetch(`${normalizedBase}/promises/status`);
        if (res.ok) {
            const data = (await res.json()) as {ready?: Array<{promiseId?: string}>};
            if ((data.ready ?? []).some((p) => p.promiseId === llmPromiseId)) {
                return fetchLlmResponse(normalizedBase, llmPromiseId);
            }
        }
        if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
}
