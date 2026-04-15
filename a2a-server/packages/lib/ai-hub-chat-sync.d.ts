/** Standard headers for AI Integration hub JSON `POST` bodies. */
export declare const AI_HUB_JSON_HEADERS: Record<string, string>;
/** Body for `POST /api/chat` (async hub promise pipeline). */
export type AiHubChatRequestBody = {
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
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
    message?: {
        content?: string;
    };
    prompt_eval_count?: number;
    eval_count?: number;
};
export type FetchAiHubChatResult = {
    ok: true;
    data: AiHubChatResponseJson;
} | {
    ok: false;
    status: number;
    bodyText: string;
};
/**
 * Call the hub via the same promise pipeline as dialog (`?promise=1`): init → optional inline cache **200** →
 * else poll → `GET /promise/:id/body_raw` for full provider JSON (or extracted text fallback).
 * Does not throw — failures return `{ ok: false, ... }`.
 */
export declare function fetchAiHubChatJson(hubBase: string, body: AiHubChatRequestBody, signal?: AbortSignal): Promise<FetchAiHubChatResult>;
//# sourceMappingURL=ai-hub-chat-sync.d.ts.map