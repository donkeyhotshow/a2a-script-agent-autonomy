import {resolveAiHubBaseUrl} from './ai-hub-url.js';

/** Standard headers for AI Integration hub JSON `POST` bodies. */
export const AI_HUB_JSON_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
};

/** Body for `POST /api/chat` (sync or `?promise=1` async init). */
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

/** Ollama `/api/chat` JSON (proxy may add eval counters). */
export type AiHubChatResponseJson = {
    message?: {content?: string};
    prompt_eval_count?: number;
    eval_count?: number;
};

export type FetchAiHubChatResult =
    | {ok: true; data: AiHubChatResponseJson}
    | {ok: false; status: number; bodyText: string};

/**
 * Synchronous `POST {base}/api/chat` (no `promise=1`) — hub returns full JSON when done.
 */
export async function fetchAiHubChatJson(
    hubBase: string,
    body: AiHubChatRequestBody,
    signal?: AbortSignal
): Promise<FetchAiHubChatResult> {
    const base = resolveAiHubBaseUrl(hubBase);
    const init: RequestInit = {
        method: 'POST',
        headers: AI_HUB_JSON_HEADERS,
        body: JSON.stringify(body),
    };
    if (signal !== undefined) {
        init.signal = signal;
    }
    const res = await fetch(`${base}/api/chat`, init);
    if (!res.ok) {
        const bodyText = await res.text();
        return {ok: false, status: res.status, bodyText};
    }
    const data = (await res.json()) as AiHubChatResponseJson;
    return {ok: true, data};
}
