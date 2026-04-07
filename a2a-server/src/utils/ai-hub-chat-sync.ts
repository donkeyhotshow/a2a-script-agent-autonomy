import {resolveAiHubBaseUrl} from './ai-hub-url.js';

/** Standard headers for AI Integration hub JSON `POST` bodies. */
export const AI_HUB_JSON_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    /** Avoid gzip — Node/undici can throw Z_DATA_ERROR on truncated or bad streams from proxies. */
    'Accept-Encoding': 'identity',
};

/** Body for `POST /api/chat` (async hub promise pipeline). */
export type AiHubChatRequestBody = {
    model: string;
    messages: Array<{role: string; content: string}>;
    stream: false;
    options?: {
        temperature?: number;
        num_predict?: number;
    };
};

/** @deprecated Use {@link AiHubChatRequestBody}. */
export type AiHubSyncChatBody = AiHubChatRequestBody;

/** Local LLM upstream `/api/chat` JSON (proxy may add eval counters). */
export type AiHubChatResponseJson = {
    message?: {content?: string};
    prompt_eval_count?: number;
    eval_count?: number;
};

export type FetchAiHubChatResult =
    | {ok: true; data: AiHubChatResponseJson}
    | {ok: false; status: number; bodyText: string};

/**
 * Call the hub via the same promise pipeline as dialog (`?promise=1`): init → optional inline cache **200** →
 * else poll → `GET /promise/:id/body_raw` for full provider JSON (or extracted text fallback).
 * Does not throw — failures return `{ ok: false, ... }`.
 */
export async function fetchAiHubChatJson(
    hubBase: string,
    body: AiHubChatRequestBody,
    signal?: AbortSignal
): Promise<FetchAiHubChatResult> {
    const base = resolveAiHubBaseUrl(hubBase);
    const hub = await import('../daemon/llm-hub-poll.js');
    const serverPromiseId = `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    let initRes: Awaited<ReturnType<typeof hub.initAiHubChatPromise>>;
    try {
        initRes = await hub.initAiHubChatPromise(base, serverPromiseId, body, signal);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (signal?.aborted || msg === 'aborted' || (e instanceof Error && e.name === 'AbortError')) {
            return {ok: false, status: 0, bodyText: 'fetch_error:aborted'};
        }
        return {ok: false, status: 0, bodyText: `fetch_error:${msg}`};
    }

    if (!initRes.ok) {
        if (initRes.reason === 'bad_http_status') {
            return {ok: false, status: initRes.status, bodyText: initRes.bodyText};
        }
        return {ok: false, status: 0, bodyText: 'missing_llm_promise_id'};
    }

    let rawText: string;
    if (initRes.inlineResponseBody !== undefined && initRes.inlineResponseBody !== '') {
        rawText = initRes.inlineResponseBody;
    } else {
        let polled: string | null;
        try {
            polled = await hub.pollReadyThenFetch(base, initRes.llmPromiseId, {
                responseMode: 'raw_json',
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return {ok: false, status: 0, bodyText: `poll_error:${msg}`};
        }
        if (!polled) {
            return {ok: false, status: 0, bodyText: 'hub_promise_empty'};
        }
        rawText = polled;
    }

    try {
        const data = JSON.parse(rawText) as AiHubChatResponseJson;
        return {ok: true, data};
    } catch {
        return {
            ok: false,
            status: 200,
            bodyText: `invalid_json:${rawText.slice(0, 500)}`,
        };
    }
}
