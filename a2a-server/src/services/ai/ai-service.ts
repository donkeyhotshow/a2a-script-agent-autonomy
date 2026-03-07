/**
 * High-level AI service that talks to the external AI proxy.
 *
 * This service is aligned with the server-proxy integration plan and provides:
 * - simple text generation
 * - text embeddings
 * - in-memory response caching
 *
 * It is intentionally self-contained and not yet wired into the existing
 * request/phase machinery, so it can be adopted incrementally.
 */

import {ProxyClient, ProxyClientConfig} from '../proxy/proxy-client.js';
import {hashSha256} from '../utils/crypto.js';
import {logger} from '../utils/logger.js';

export interface GenerationOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    sessionId?: string;
    userId?: string;
}

export interface GenerationResult {
    text: string;
    tokensUsed?: number;
    raw?: unknown;
}

export interface EmbeddingOptions {
    model?: string;
    dimensions?: number;
}

export interface EmbeddingResult {
    embedding: number[];
    raw?: unknown;
}

export interface AIServiceCacheConfig {
    ttlMs?: number;
    maxSize?: number;
}

export interface AIServiceConfig {
    proxy: ProxyClientConfig;
    cache?: AIServiceCacheConfig;
}

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class SimpleCache<T> {
    private readonly store = new Map<string, CacheEntry<T>>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxSize: number
    ) {}

    get(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;

        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value;
    }

    set(key: string, value: T): void {
        if (this.store.size >= this.maxSize) {
            const firstKey = this.store.keys().next().value as string | undefined;
            if (firstKey !== undefined) {
                this.store.delete(firstKey);
            }
        }

        this.store.set(key, {value, expiresAt: Date.now() + this.ttlMs});
    }
}

export class AIService {
    private readonly proxyClient: ProxyClient;
    private readonly generationCache: SimpleCache<GenerationResult>;
    private readonly embeddingCache: SimpleCache<EmbeddingResult>;

    constructor(config: AIServiceConfig) {
        const cacheTtlMs = config.cache?.ttlMs ?? 5 * 60 * 1000;
        const cacheMaxSize = config.cache?.maxSize ?? 1_000;

        this.proxyClient = new ProxyClient(config.proxy);
        this.generationCache = new SimpleCache<GenerationResult>(cacheTtlMs, cacheMaxSize);
        this.embeddingCache = new SimpleCache<EmbeddingResult>(cacheTtlMs, cacheMaxSize);
    }

    async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
        const cacheKey = this.buildCacheKey('generate', prompt, {
            model: options.model,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
        });

        const cached = this.generationCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const payload = {
            type: 'text_generation',
            prompt,
            options: {
                model: options.model ?? 'gpt-4o-mini',
                max_tokens: options.maxTokens ?? 1_000,
                temperature: options.temperature ?? 0.7,
                top_p: options.topP ?? 1.0,
                frequency_penalty: options.frequencyPenalty ?? 0,
                presence_penalty: options.presencePenalty ?? 0,
            },
        };

        const startedAt = Date.now();

        try {
            const requestOptions = {
                requestId: this.buildRequestId('gen'),
                // Only include optional headers when defined to satisfy exactOptionalPropertyTypes.
                ...(options.sessionId ? {sessionId: options.sessionId} : {}),
                ...(options.userId ? {userId: options.userId} : {}),
            };
            const result = await this.proxyClient.sendJson<GenerationResult>('/api/v1/generate', payload, requestOptions);

            this.generationCache.set(cacheKey, result);

            logger.debug('[AIService] generateText completed', {
                durationMs: Date.now() - startedAt,
            });

            return result;
        } catch (error) {
            logger.warn('[AIService] generateText failed', {error: String(error)});
            throw error;
        }
    }

    async embedText(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
        const cacheKey = this.buildCacheKey('embed', text, {
            model: options.model,
            dimensions: options.dimensions,
        });

        const cached = this.embeddingCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const payload = {
            type: 'embedding',
            text,
            options: {
                model: options.model ?? 'text-embedding-3-small',
                dimensions: options.dimensions,
            },
        };

        try {
            const result = await this.proxyClient.sendJson<EmbeddingResult>('/api/v1/embed', payload, {
                requestId: this.buildRequestId('emb'),
            });

            this.embeddingCache.set(cacheKey, result);
            return result;
        } catch (error) {
            logger.warn('[AIService] embedText failed', {error: String(error)});
            throw error;
        }
    }

    private buildCacheKey(
        type: 'generate' | 'embed',
        input: string,
        params: Record<string, unknown>
    ): string {
        const keyData = {
            type,
            input: input.slice(0, 256),
            params,
        };
        return hashSha256(JSON.stringify(keyData));
    }

    private buildRequestId(prefix: string): string {
        const now = Date.now();
        const rand = Math.floor(Math.random() * 1e6)
            .toString(16)
            .padStart(5, '0');
        return `${prefix}_${now.toString(16)}_${rand}`;
    }
}

