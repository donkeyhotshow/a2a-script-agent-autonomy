/**
 * Background polling: A2A Server → AI Hub (LLM proxy).
 * Waits until ai-integration reports the LLM promise ready, then fetches response body.
 */

import {requestService} from '../services/core/request/request.service.js';
import {logger} from '../../lib/logger.js';
import {resolveAiHubBaseUrl} from '../utils/ai-hub-url.js';
import {AI_HUB_JSON_HEADERS, type AiHubChatRequestBody} from '../utils/ai-hub-chat-sync.js';
import {tryParseJsonFromLlmText} from '../../lib/strip-markdown-json-fence.js';

/** Hub /api/chat uses `message.content`; /api/generate uses top-level `response`. */
type HubMessageBlock = {content?: string; reasoning_content?: string};
/** OpenAI-style `chat.completion` (and some proxies) nest text under `choices[0].message`. */
type HubCompatChatShape = {
    message?: HubMessageBlock;
    response?: string;
    choices?: Array<{message?: HubMessageBlock}>;
};

/** Hub /api/chat JSON; models may wrap it in ```json ... ``` despite JSON content-type. */
export function parseHubCompatChatResponseBody(raw: string): HubCompatChatShape | null {
    const trimmed = raw.trim();
    const parsed = tryParseJsonFromLlmText(trimmed);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as HubCompatChatShape;
    }

    logger.debug('[llm-hub-poll] hub compat chat body is not parseable JSON', {
        length: trimmed.length,
        preview: trimmed.slice(0, 160).replace(/\s+/g, ' '),
    });
    return null;
}

function textFromHubMessage(m: HubMessageBlock | undefined): string | null {
    if (!m) return null;
    const c = m.content;
    if (typeof c === 'string' && c.trim() !== '') return c;
    const r = m.reasoning_content;
    if (typeof r === 'string' && r.trim() !== '') return r;
    return null;
}

function extractHubCompatChatText(chat: HubCompatChatShape | null): string | null {
    if (!chat) return null;
    const fromTop = textFromHubMessage(chat.message);
    if (fromTop !== null) return fromTop;
    const ch = chat.choices;
    if (Array.isArray(ch) && ch.length > 0) {
        const first = ch[0];
        if (first && typeof first === 'object' && !Array.isArray(first)) {
            const fromChoice = textFromHubMessage(first.message);
            if (fromChoice !== null) return fromChoice;
        }
    }
    const fromGen = chat.response;
    if (typeof fromGen === 'string' && fromGen.trim() !== '') return fromGen;
    return null;
}

/**
 * Extract assistant text from hub `/promise/:id/response` body.
 * Hub may store /chat, /generate, OpenAI-style `choices[0].message.content`, or other JSON — only
 * known shapes match {@link parseHubCompatChatResponseBody}. Returning null for a non-empty done body caused
 * {@link resolveLlmPromiseRecovery} to signal resubmit and the dialog processor to POST a new
 * `/api/chat`, spamming the proxy while the original promise had already completed.
 */
export function extractLlmTextFromHubResponseBody(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const chatData = parseHubCompatChatResponseBody(raw);
    const fromHubCompat = extractHubCompatChatText(chatData);
    if (fromHubCompat !== null && fromHubCompat !== '') return fromHubCompat;
    return trimmed;
}

export async function fetchLlmResponse(base: string, llmPromiseId: string): Promise<string | null> {
    const normalizedBase = resolveAiHubBaseUrl(base);
    let bodyRes: Response;
    try {
        // Try formatted response first (markdown format)
        bodyRes = await fetch(`${normalizedBase}/promise/${llmPromiseId}/response_formatted`, {
            headers: {'Accept-Encoding': 'identity'},
        });
    } catch (e) {
        logger.warn('[llm-hub-poll] fetchLlmResponse formatted failed, trying raw', {llmPromiseId, error: String(e)});
        // Fallback to raw response
        try {
            bodyRes = await fetch(`${normalizedBase}/promise/${llmPromiseId}/response`, {
                headers: {'Accept-Encoding': 'identity'},
            });
        } catch (e2) {
            logger.warn('[llm-hub-poll] fetchLlmResponse raw also failed', {llmPromiseId, error: String(e2)});
            return null;
        }
    }
    if (!bodyRes.ok) return null;
    let raw: string;
    try {
        raw = await bodyRes.text();
    } catch (e) {
        logger.warn('[llm-hub-poll] fetchLlmResponse body read failed', {llmPromiseId, error: String(e)});
        return null;
    }
    // For formatted response, we already have markdown, so return as-is
    const responseFormat = bodyRes.headers.get('x-response-format');
    if (responseFormat === 'formatted') {
        return raw;
    }
    // For raw response, extract text as before
    return extractLlmTextFromHubResponseBody(raw);
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
    /**
     * Default `llm_text`: assistant-oriented text via {@link fetchLlmResponse}.
     * `raw_json`: full provider JSON string from `GET /promise/:id/body_raw` (falls back to `llm_text` if missing).
     */
    responseMode?: 'llm_text' | 'raw_json';
};

/** @deprecated Use {@link AiHubChatRequestBody} from `ai-hub-chat-sync.js`. */
export type AiHubChatPromiseBody = AiHubChatRequestBody;

export type InitAiHubChatPromiseResult =
    | {ok: true; llmPromiseId: string; inlineResponseBody?: string}
    | {ok: false; reason: 'bad_http_status'; status: number; bodyText: string}
    | {ok: false; reason: 'missing_llm_promise_id'};

/**
 * Start async LLM work: `POST {base}/api/chat?promise=1` with `X-Server-Promise-Id`.
 * On **202**, returns hub `promiseId` — poll with {@link pollReadyThenFetch} / {@link fetchLlmResponse}.
 * On **200** (disk cache hit), returns the same `promiseId` plus **inlineResponseBody** (full upstream JSON text); skip polling.
 */
export async function initAiHubChatPromise(
    base: string,
    serverPromiseId: string,
    body: AiHubChatRequestBody,
    signal?: AbortSignal
): Promise<InitAiHubChatPromiseResult> {
    const normalizedBase = resolveAiHubBaseUrl(base);
    let chatRes: Response;
    try {
        chatRes = await fetch(`${normalizedBase}/api/chat?promise=1`, {
            method: 'POST',
            headers: {
                ...AI_HUB_JSON_HEADERS,
                'X-Server-Promise-Id': serverPromiseId,
            },
            body: JSON.stringify(body),
            signal,
        });
    } catch (e) {
        const bodyText = e instanceof Error ? e.message : String(e);
        return {ok: false, reason: 'bad_http_status', status: 0, bodyText};
    }
    let initText: string;
    try {
        initText = await chatRes.text();
    } catch (e) {
        const bodyText = e instanceof Error ? e.message : String(e);
        return {ok: false, reason: 'bad_http_status', status: chatRes.status || 0, bodyText};
    }
    if (chatRes.status === 200) {
        let initData: {
            promiseId?: string;
            status?: string;
            responseBody?: string;
        };
        try {
            initData = JSON.parse(initText) as {
                promiseId?: string;
                status?: string;
                responseBody?: string;
            };
        } catch {
            return {ok: false, reason: 'bad_http_status', status: chatRes.status, bodyText: initText.slice(0, 500)};
        }
        if (
            initData.status === 'completed' &&
            typeof initData.promiseId === 'string' &&
            initData.promiseId.length > 0 &&
            typeof initData.responseBody === 'string'
        ) {
            return {
                ok: true,
                llmPromiseId: initData.promiseId,
                inlineResponseBody: initData.responseBody,
            };
        }
        return {ok: false, reason: 'bad_http_status', status: chatRes.status, bodyText: initText.slice(0, 500)};
    }
    if (chatRes.status !== 202) {
        return {ok: false, reason: 'bad_http_status', status: chatRes.status, bodyText: initText};
    }
    let initData: {promiseId?: string};
    try {
        initData = JSON.parse(initText) as {promiseId?: string};
    } catch {
        return {ok: false, reason: 'bad_http_status', status: chatRes.status, bodyText: initText.slice(0, 500)};
    }
    const llmPromiseId = initData?.promiseId;
    if (!llmPromiseId) {
        return {ok: false, reason: 'missing_llm_promise_id'};
    }
    return {ok: true, llmPromiseId};
}

/**
 * Poll until the hub marks `llmPromiseId` done, then GET `/promise/:id/response`.
 *
 * Uses **`GET /promise/:id`** (canonical status per ai-integration) instead of relying on
 * `GET /promises/status` “ready” list, which scans the whole promises directory and can
 * miss a just-completed id under load or race with listing.
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
    const statusUrl = `${normalizedBase}/promise/${encodeURIComponent(llmPromiseId)}`;
    for (;;) {
        if (opts?.a2aPromiseId) {
            await requestService.patchRequestContext(opts.a2aPromiseId, {requestPhase: 'llm_waiting'});
        }
        let statusRes: Response;
        try {
            statusRes = await fetch(statusUrl, {headers: {'Accept-Encoding': 'identity'}});
        } catch (e) {
            logger.warn('[llm-hub-poll] promise status fetch failed', {llmPromiseId, error: String(e)});
            if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            continue;
        }
        if (statusRes.status === 202) {
            if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            continue;
        }
        if (statusRes.status === 500) {
            logger.warn('[llm-hub-poll] hub promise in error state', {llmPromiseId});
            return null;
        }
        if (statusRes.status === 404) {
            logger.warn('[llm-hub-poll] promise not found (may be pruned or wrong id)', {llmPromiseId});
            if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            continue;
        }
        if (statusRes.ok) {
            let meta: {status?: string};
            try {
                meta = JSON.parse(await statusRes.text()) as {status?: string};
            } catch {
                if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
                await new Promise((r) => setTimeout(r, pollIntervalMs));
                continue;
            }
            if (meta.status === 'done') {
                const mode = opts?.responseMode ?? 'llm_text';
                if (mode === 'raw_json') {
                    const rawUrl = `${normalizedBase}/promise/${encodeURIComponent(llmPromiseId)}/body_raw`;
                    try {
                        const rawRes = await fetch(rawUrl, {headers: {'Accept-Encoding': 'identity'}});
                        if (rawRes.ok) {
                            return await rawRes.text();
                        }
                    } catch (e) {
                        logger.warn('[llm-hub-poll] body_raw fetch failed', {
                            llmPromiseId,
                            error: String(e),
                        });
                    }
                }
                return fetchLlmResponse(normalizedBase, llmPromiseId);
            }
        }
        if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
}
