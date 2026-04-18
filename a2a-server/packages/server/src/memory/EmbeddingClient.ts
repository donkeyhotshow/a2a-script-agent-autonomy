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

    constructor(opts: EmbeddingClientOptions = {}) {
        this.aiHubUrl = resolveAiHubBaseUrl(opts.aiHubUrl);
        this.model = opts.model ?? (process.env['EMBEDDING_MODEL'] ?? 'nomic-embed-text');
        this.timeoutMs = opts.timeoutMs ?? 10_000;
    }

    /**
     * Embed a single text string.
     * Returns a real vector from the hub; falls back to placeholder on error.
     */
    async embed(text: string): Promise<number[]> {
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
                logger.warn('[EmbeddingClient] Hub returned non-200, using placeholder', {
                    status: res.status,
                });
                return placeholderEmbedding(text);
            }

            const body = (await res.json()) as {
                data?: Array<{ embedding?: number[] }>;
            };
            const embedding = body.data?.[0]?.embedding;
            if (!Array.isArray(embedding) || embedding.length === 0) {
                logger.warn('[EmbeddingClient] Missing embedding in hub response, using placeholder');
                return placeholderEmbedding(text);
            }

            return embedding;
        } catch (err: unknown) {
            logger.debug('[EmbeddingClient] Hub unreachable, using placeholder', {
                error: err instanceof Error ? err.message : String(err),
            });
            return placeholderEmbedding(text);
        }
    }

    /**
     * Embed multiple texts in parallel (order preserved).
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        return Promise.all(texts.map((t) => this.embed(t)));
    }
}

// ── Singleton for shared use ──────────────────────────────────────────────────

export const globalEmbeddingClient = new EmbeddingClient();
