/**
 * EmbeddingClient — ADR-0095
 *
 * Calls the OpenAI-compatible /v1/embeddings endpoint exposed by the
 * a2a-ai-hub proxy. Falls back to a deterministic placeholder when the
 * hub is unavailable so tests and cold-starts keep working.
 *
 * Usage:
 *   const client = new EmbeddingClient();
 *   const vec = await client.embed("my text");
 */

import { logger } from '@a2a/server-utils/logger';
import { resolveAiHubBaseUrl } from '@a2a/server-utils';

// ── Public types ───────────────────────────────────────────────────────────────

export interface EmbeddingClientOptions {
    /** AI Hub base URL. Defaults to A2A_AI_HUB_URL env. */
    aiHubUrl?: string;
    /** Model served by the hub (default: nomic-embed-text). */
    model?: string;
    /** HTTP timeout in ms (default: 10 000). */
    timeoutMs?: number;
    /**
     * When true, fall back to `placeholderEmbedding()` instead of returning
     * null on hub failure. Intended for local dev / unit tests where the hub
     * is unavailable and cosine-similarity correctness is not required.
     * Defaults to false (fail-safe: return null on failure).
     */
    allowFallback?: boolean;
}

// ── Placeholder ────────────────────────────────────────────────────────────────

/**
 * Deterministic 384-dim placeholder used when the hub is unreachable.
 * Uses char-code bucketing + L2 normalisation so similarity comparisons
 * remain meaningful within the same session.
 *
 * NOT suitable for cross-session semantic search.
 */
export function placeholderEmbedding(text: string): number[] {
    const dim = 384;
    const vec = new Array<number>(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
        const bucket = (text.charCodeAt(i) * 7 + i) % dim;
        vec[bucket] = (vec[bucket] ?? 0) + 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < len; i++) {
        dot  += (a[i] ?? 0) * (b[i] ?? 0);
        normA += (a[i] ?? 0) ** 2;
        normB += (b[i] ?? 0) ** 2;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// ── EmbeddingClient ────────────────────────────────────────────────────────────

export class EmbeddingClient {
    private readonly aiHubUrl: string;
    private readonly model: string;
    private readonly timeoutMs: number;
    private readonly allowFallback: boolean;

    constructor(opts: EmbeddingClientOptions = {}) {
        this.aiHubUrl = resolveAiHubBaseUrl(opts.aiHubUrl);
        this.model = opts.model ?? (process.env['EMBEDDING_MODEL'] ?? 'nomic-embed-text');
        this.timeoutMs = opts.timeoutMs ?? 10_000;
        this.allowFallback = opts.allowFallback ?? false;
    }

    /**
     * Embed a single text string.
     *
     * Returns a real vector from the hub, or `null` when the hub is
     * unavailable. Callers must guard against `null` before using the
     * vector in similarity comparisons.
     *
     * Set EMBEDDING_STRICT=true to throw instead of returning null, which
     * is useful in integration tests where a silent null would hide failures.
     */
    async embed(text: string): Promise<number[] | null> {
        try {
            const url = `${this.aiHubUrl.replace(/\/$/, '')}/v1/embeddings`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);

            let res: Response;
            try {
                res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: this.model, input: text }),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timer);
            }

            if (!res.ok) {
                logger.error('[EmbeddingClient] Hub returned non-200', {
                    status: res.status,
                });
                return this._handleFailure(new Error(`Hub HTTP ${res.status}`));
            }

            const body = (await res.json()) as {
                data?: Array<{ embedding?: number[] }>;
            };
            const embedding = body.data?.[0]?.embedding;
            if (!Array.isArray(embedding) || embedding.length === 0) {
                logger.error('[EmbeddingClient] Invalid embedding response shape');
                return this._handleFailure(new Error('Invalid embedding response shape'));
            }

            return embedding;
        } catch (err: unknown) {
            logger.error('[EmbeddingClient] Hub unreachable', {
                error: err instanceof Error ? err.message : String(err),
            });
            return this._handleFailure(err instanceof Error ? err : new Error(String(err)));
        }
    }

    /**
     * Embed multiple texts in parallel.
     * Entries whose embedding failed (null) are excluded from the result;
     * the returned array may be shorter than the input.
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        const results = await Promise.all(texts.map((t) => this.embed(t)));
        return results.filter((r): r is number[] => r !== null);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private _handleFailure(err: Error): null {
        if (process.env['EMBEDDING_STRICT'] === 'true') {
            throw err;
        }
        if (this.allowFallback) {
            logger.warn('[EmbeddingClient] Embedding failed; allowFallback=true (dev/test mode)', {
                error: err.message,
            });
        }
        return null;
    }
}

// ── Singleton for shared use ──────────────────────────────────────────────────

export const globalEmbeddingClient = new EmbeddingClient();

// ── Factory for dependency-injection-friendly usage ───────────────────────────

/**
 * Create a configured EmbeddingClient instance.
 *
 * Prefer this over the `globalEmbeddingClient` singleton when you need
 * deterministic construction (e.g. in dependency injection containers,
 * or when different subsystems need different options).
 *
 * In production: `allowFallback` defaults to false so hub failures are
 * surfaced immediately rather than silently degrading similarity search.
 */
export function createEmbeddingClient(opts?: EmbeddingClientOptions): EmbeddingClient {
    return new EmbeddingClient({
        aiHubUrl: process.env['A2A_AI_HUB_URL'],
        allowFallback: process.env['NODE_ENV'] !== 'production',
        ...opts,
    });
}
