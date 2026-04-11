import {resolveAiHubBaseUrl} from './ai-hub-url';
import {AI_HUB_JSON_HEADERS} from './ai-hub-chat-sync';

export type AiHubGenerateRequestBody = {
    model: string;
    prompt: string;
    stream: false;
    images?: string[];
};

/**
 * Sync `POST /api/generate` via AI Integration hub; returns Local LLM upstream top-level `response` text.
 */
export async function fetchAiHubGenerateText(
    hubBase: string,
    body: AiHubGenerateRequestBody,
    timeoutMs: number
): Promise<string> {
    const base = resolveAiHubBaseUrl(hubBase);
    const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: AI_HUB_JSON_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
        throw new Error(`AI Hub responded ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {response?: string};
    return json.response ?? '';
}
