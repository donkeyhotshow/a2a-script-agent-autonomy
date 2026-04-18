/**
 * generateWithAiHub — thin helper for one-shot text generation via the AI hub.
 *
 * Calls the OpenAI-compatible `/v1/chat/completions` endpoint exposed by
 * a2a-ai-hub.  Uses a 30-second hard timeout.  Falls back to an empty string
 * rather than throwing so callers can degrade gracefully.
 */

import { resolveAiHubBaseUrl } from '@a2a/server-utils';
import { logger } from '@a2a/server-utils/logger';

export interface GenerateOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    /** If provided, overrides the global AI hub base URL for this call. */
    hubBase?: string;
    timeoutMs?: number;
}

/**
 * Generate a text completion from the AI hub.
 *
 * @param prompt   The user message to send.
 * @param options  Optional generation parameters.
 * @returns        The assistant's reply text, or empty string on error.
 */
export async function generateWithAiHub(
    prompt: string,
    options: GenerateOptions = {},
): Promise<string> {
    const base = resolveAiHubBaseUrl(options.hubBase).replace(/\/$/, '');
    const model = options.model ?? (process.env['A2A_MODEL'] ?? 'llama3');
    const timeoutMs = options.timeoutMs ?? 30_000;
    const url = `${base}/v1/chat/completions`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok) {
            logger.warn('[generateWithAiHub] Non-200 from hub', { status: res.status, url });
            return '';
        }

        const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        return body.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err: unknown) {
        logger.debug('[generateWithAiHub] Generation failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return '';
    }
}
