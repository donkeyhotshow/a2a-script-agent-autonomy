/**
 * LLM Adapter — external AI integration (OpenAI, Ollama via ai-integration).
 *
 * Ollama path is intentionally promise-based (non-blocking HTTP): we create a promise in
 * ai-integration and then poll it until completion.
 */

import {appendFile, mkdir, readFile} from 'node:fs/promises';
import {resolve as resolvePath} from 'node:path';

import {logger} from '../utils/logger.js';
import {proxyCacheConfig} from '../../config/proxy.config.js';
import {createOllamaPromise, waitForPromise} from './ollama-adapter.js';
import {AIService} from './ai-service.js';

const PLACEHOLDER = 'Request processed (placeholder for ChatGPT)';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_PROXY_URL = (process.env.AI_HUB_URL ?? 'http://localhost:11434').trim();
const LLM_ARCHIVE_DIR =
    (process.env.LLM_ARCHIVE_DIR ?? '').trim() || resolvePath(process.cwd(), 'storage', 'llm-archive');

type LlmProvider = 'openai' | 'ollama' | 'proxy' | 'placeholder';

function getProvider(): LlmProvider {
    const explicit = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase();
    if (explicit === 'ollama') return 'ollama';
    if (explicit === 'openai') return 'openai';
    if (explicit === 'proxy') return 'proxy';

    // Back-compat toggle from plans/ollama-proxy-integration.md
    const useOllama = (process.env.USE_OLLAMA ?? '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(useOllama)) return 'ollama';

    if ((process.env.OPENAI_API_KEY ?? '').trim()) return 'openai';
    return 'placeholder';
}

let cachedProxyService: AIService | null = null;

function getProxyService(): AIService | null {
    if (!AI_PROXY_URL) return null;
    if (cachedProxyService) return cachedProxyService;
    try {
        cachedProxyService = new AIService({
            proxy: {
                baseUrl: AI_PROXY_URL,
                cache: proxyCacheConfig,
            },
        });
        logger.info('[LLM/Proxy] AIService initialized', {baseUrl: AI_PROXY_URL});
        return cachedProxyService;
    } catch (err) {
        logger.warn('[LLM/Proxy] Failed to initialize AIService', {error: String(err)});
        cachedProxyService = null;
        return null;
    }
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
    const replayDir = (process.env.LLM_REPLAY_DIR ?? '').trim();
    if (replayDir) {
        try {
            const responsePath = resolvePath(replayDir, 'response.md');
            const content = await readFile(responsePath, 'utf8');
            logger.info('[LLM] Replaying response from simulations', {replayDir});
            return content.trim();
        } catch (err) {
            logger.warn('[LLM] Replay from simulations failed, falling back to provider', {
                replayDir,
                error: String(err),
            });
        }
    }

    const prompt = buildPrompt(input);
    const provider = getProvider();

    if (provider === 'proxy') {
        const svc = getProxyService();
        if (!svc) {
            logger.warn('[LLM/Proxy] Service not available, falling back to placeholder');
            return PLACEHOLDER;
        }
        try {
            const result = await svc.generateText(prompt, {
                model: process.env.OPENAI_MODEL ?? undefined,
            });
            const text = result.text?.trim() || PLACEHOLDER;
            await archiveLlmInteraction({
                provider: 'proxy',
                prompt,
                response: text,
                context: input.context,
                requestFiles: input.requestFiles,
            });
            return text;
        } catch (err) {
            logger.warn('[LLM/Proxy] Request failed', {error: String(err)});
            await archiveLlmInteraction({
                provider: 'proxy',
                prompt,
                error: String(err),
                context: input.context,
                requestFiles: input.requestFiles,
            });
            return PLACEHOLDER;
        }
    }

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
            const finalText = text?.trim() || PLACEHOLDER;
            await archiveLlmInteraction({
                provider: 'ollama',
                prompt,
                response: finalText,
                context: input.context,
                requestFiles: input.requestFiles,
                promiseId,
            });
            return finalText;
        } catch (err) {
            logger.warn('[LLM/Ollama] Request failed', {error: String(err)});
            await archiveLlmInteraction({
                provider: 'ollama',
                prompt,
                error: String(err),
                context: input.context,
                requestFiles: input.requestFiles,
            });
            return PLACEHOLDER;
        }
    }

    if (provider !== 'openai') {
        await archiveLlmInteraction({
            provider,
            prompt,
            response: PLACEHOLDER,
            context: input.context,
            requestFiles: input.requestFiles,
        });
        return PLACEHOLDER;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.trim()) {
        await archiveLlmInteraction({
            provider: 'openai',
            prompt,
            error: 'OPENAI_API_KEY is not set',
            context: input.context,
            requestFiles: input.requestFiles,
        });
        return PLACEHOLDER;
    }

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
            await archiveLlmInteraction({
                provider: 'openai',
                prompt,
                error: `HTTP ${res.status}`,
                context: input.context,
                requestFiles: input.requestFiles,
            });
            return PLACEHOLDER;
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content?.trim();
        const finalText = content ?? PLACEHOLDER;
        await archiveLlmInteraction({
            provider: 'openai',
            prompt,
            response: finalText,
            context: input.context,
            requestFiles: input.requestFiles,
        });
        return finalText;
    } catch (err) {
        logger.warn('[LLM] Request failed', {error: String(err)});
        await archiveLlmInteraction({
            provider: 'openai',
            prompt,
            error: String(err),
            context: input.context,
            requestFiles: input.requestFiles,
        });
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

async function archiveLlmInteraction(args: {
    provider: LlmProvider;
    prompt: string;
    response?: string;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: Record<string, any>;
    requestFiles?: string[];
    promiseId?: string;
}): Promise<void> {
    try {
        await mkdir(LLM_ARCHIVE_DIR, {recursive: true});
        const now = new Date();
        const day = now.toISOString().slice(0, 10);
        const filePath = resolvePath(LLM_ARCHIVE_DIR, `${day}.jsonl`);

        const record = {
            timestamp: now.toISOString(),
            provider: args.provider,
            prompt: args.prompt,
            response: args.response,
            error: args.error,
            context: args.context,
            requestFiles: args.requestFiles,
            promiseId: args.promiseId,
        };

        await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
    } catch (err) {
        logger.warn('[LLM/Archive] Failed to write archive record', {error: String(err)});
    }
}
