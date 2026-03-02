/**
 * LLM Adapter — external AI integration (OpenAI, Ollama via ai-integration).
 *
 * Ollama path is intentionally promise-based (non-blocking HTTP): we create a promise in
 * ai-integration and then poll it until completion.
 */

import {logger} from '../utils/logger.js';
import {createOllamaPromise, waitForPromise} from './ollama-adapter.js';

const PLACEHOLDER = 'Request processed (placeholder for ChatGPT)';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

type LlmProvider = 'openai' | 'ollama' | 'placeholder';

function getProvider(): LlmProvider {
    const explicit = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase();
    if (explicit === 'ollama') return 'ollama';
    if (explicit === 'openai') return 'openai';

    // Back-compat toggle from plans/ollama-proxy-integration.md
    const useOllama = (process.env.USE_OLLAMA ?? '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(useOllama)) return 'ollama';

    if ((process.env.OPENAI_API_KEY ?? '').trim()) return 'openai';
    return 'placeholder';
}

function getOllamaModel(): string {
    return (process.env.OLLAMA_MODEL ?? '').trim() || 'llama3';
}

export interface LLMInput {
    context: Record<string, unknown>;
    injectedContent: string;
    requestFiles?: string[];
}

/**
 * Call external LLM with context block. Returns placeholder when unavailable.
 */
export async function callLLM(input: LLMInput): Promise<string> {
    const prompt = buildPrompt(input);
    const provider = getProvider();

    if (provider === 'ollama') {
        try {
            const {promiseId} = await createOllamaPromise({
                model: getOllamaModel(),
                prompt,
                stream: false,
            });
            logger.info('[LLM/Ollama] Promise created', {promiseId});

            const text = await waitForPromise(promiseId, (status) => {
                logger.debug('[LLM/Ollama] Promise status', {promiseId, status: status.status});
            });
            return text?.trim() || PLACEHOLDER;
        } catch (err) {
            logger.warn('[LLM/Ollama] Request failed', {error: String(err)});
            return PLACEHOLDER;
        }
    }

    if (provider !== 'openai') return PLACEHOLDER;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.trim()) return PLACEHOLDER;

    try {
        const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
                messages: [{role: 'user', content: prompt}],
                max_tokens: 1024,
            }),
        });

        if (!res.ok) {
            logger.warn('[LLM] API error', {status: res.status});
            return PLACEHOLDER;
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content?.trim();
        return content ?? PLACEHOLDER;
    } catch (err) {
        logger.warn('[LLM] Request failed', {error: String(err)});
        return PLACEHOLDER;
    }
}

function buildPrompt(input: LLMInput): string {
    const parts: string[] = [
        'You are an A2A coding assistant. Analyze the context and provide a concise response.',
        '',
        '## Context',
        JSON.stringify(input.context, null, 2),
    ];
    if (input.injectedContent) {
        parts.push('', '## Injected knowledge', input.injectedContent);
    }
    if (input.requestFiles?.length) {
        parts.push('', '## Requested files', input.requestFiles.join(', '));
    }
    parts.push('', 'Provide a brief analysis or next steps.');
    return parts.join('\n');
}
