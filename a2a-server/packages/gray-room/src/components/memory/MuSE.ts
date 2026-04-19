/**
 * MuSE — Multi-turn Semantic Experience store (ADR-005).
 *
 * Records task experiences with real embedding vectors (via EmbeddingClient)
 * and retrieves them by cosine similarity instead of naive string matching.
 * Falls back to lexical overlap when embeddings are unavailable.
 */

import { logger } from '@a2a/server-utils/logger';

export interface Experience {
    taskId: string;
    goal: string;
    trajectory: { step: string; action: string }[];
    result: 'success' | 'failure';
    embeddings?: number[];
}

// ── Similarity helpers ────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < len; i++) {
        dot += (a[i] ?? 0) * (b[i] ?? 0);
        na  += (a[i] ?? 0) ** 2;
        nb  += (b[i] ?? 0) ** 2;
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d === 0 ? 0 : dot / d;
}

function lexicalSim(a: string, b: string): number {
    const tokA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const tokB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    let overlap = 0;
    for (const t of tokA) { if (tokB.has(t)) overlap++; }
    return overlap / (tokA.size + tokB.size - overlap || 1);
}

// ── MuSE ──────────────────────────────────────────────────────────────────────

export class MuSE {
    private memory: Experience[] = [];

    private async embed(text: string): Promise<number[]> {
        try {
            const { globalEmbeddingClient } = await import(
                '../../../../server/src/memory/EmbeddingClient.js'
            );
            return (await globalEmbeddingClient.embed(text)) ?? [];
        } catch {
            return []; // fallback to lexical similarity
        }
    }

    async record(exp: Experience): Promise<void> {
        const embeddings = await this.embed(exp.goal);
        this.memory.push({ ...exp, embeddings });
        logger.info('[MuSE] Recorded', { taskId: exp.taskId, result: exp.result });
    }

    async recall(goal: string, topK = 3): Promise<Experience[]> {
        if (this.memory.length === 0) return [];

        const queryVec = await this.embed(goal);
        const useVector = queryVec.length > 0;

        return this.memory
            .filter((e) => e.result === 'success')
            .map((e) => ({
                e,
                score: useVector && e.embeddings && e.embeddings.length > 0
                    ? cosineSim(queryVec, e.embeddings)
                    : lexicalSim(goal, e.goal),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((r) => r.e);
    }

    getMemorySize(): number {
        return this.memory.length;
    }
}

export const muse = new MuSE();
