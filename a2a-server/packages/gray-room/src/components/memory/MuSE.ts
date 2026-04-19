/**
 * MuSE — Multi-turn Semantic Experience store (ADR-005).
 *
 * Records task experiences with real embedding vectors (via EmbeddingClient)
 * and retrieves them by cosine similarity instead of naive string matching.
 * Falls back to lexical overlap when embeddings are unavailable.
 *
 * Compression: call compress() or startCompressionJob() to cluster similar
 * memories and replace each cluster with a single representative centroid,
 * keeping memory bounded without silent FIFO data-loss.
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

/** Element-wise average of an array of equal-length vectors. */
function centroid(vecs: number[][]): number[] {
    if (vecs.length === 0) return [];
    const dim = vecs[0]!.length;
    const sum = new Array<number>(dim).fill(0);
    for (const v of vecs) {
        for (let i = 0; i < dim; i++) sum[i]! += (v[i] ?? 0);
    }
    return sum.map((s) => s / vecs.length);
}

// ── MuSE ──────────────────────────────────────────────────────────────────────

export class MuSE {
    private memory: Experience[] = [];
    private _compressionTimer: ReturnType<typeof setInterval> | null = null;

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

    /**
     * Compress in-memory experiences by merging semantically similar clusters.
     *
     * Any group of experiences whose pairwise cosine similarity exceeds
     * `similarityThreshold` is collapsed into a single representative entry:
     * - The entry with the best result ('success' > 'failure') is kept as the
     *   base; its embedding is replaced with the cluster centroid so future
     *   recalls benefit from the averaged representation.
     * - Trajectories from the cluster are merged (deduplicated by step label).
     *
     * Experiences with no embedding are left untouched (lexical-fallback pool).
     *
     * @param similarityThreshold  Cosine similarity above which two experiences
     *                             are considered duplicates.  Default 0.92.
     * @returns Number of entries removed.
     */
    compress(similarityThreshold = 0.92): number {
        const withVec  = this.memory.filter((e) => e.embeddings && e.embeddings.length > 0);
        const withoutVec = this.memory.filter((e) => !e.embeddings || e.embeddings.length === 0);

        const clustered = new Set<number>();
        const merged: Experience[] = [];

        for (let i = 0; i < withVec.length; i++) {
            if (clustered.has(i)) continue;

            const cluster: number[] = [i];
            for (let j = i + 1; j < withVec.length; j++) {
                if (clustered.has(j)) continue;
                const sim = cosineSim(withVec[i]!.embeddings!, withVec[j]!.embeddings!);
                if (sim >= similarityThreshold) {
                    cluster.push(j);
                    clustered.add(j);
                }
            }
            clustered.add(i);

            if (cluster.length === 1) {
                merged.push(withVec[i]!);
                continue;
            }

            // Prefer success entries as the representative base.
            const base = cluster
                .map((idx) => withVec[idx]!)
                .sort((a, b) => (a.result === 'success' ? -1 : 1) - (b.result === 'success' ? -1 : 1))[0]!;

            const allVecs   = cluster.map((idx) => withVec[idx]!.embeddings!);
            const allSteps  = cluster.flatMap((idx) => withVec[idx]!.trajectory);
            const stepsSeen = new Set<string>();
            const mergedTrajectory = allSteps.filter((s) => {
                if (stepsSeen.has(s.step)) return false;
                stepsSeen.add(s.step);
                return true;
            });

            merged.push({ ...base, embeddings: centroid(allVecs), trajectory: mergedTrajectory });
        }

        const before = this.memory.length;
        this.memory = [...merged, ...withoutVec];
        const removed = before - this.memory.length;
        if (removed > 0) {
            logger.info('[MuSE] Compressed', { before, after: this.memory.length, removed });
        }
        return removed;
    }

    /**
     * Start a background interval that periodically calls compress().
     *
     * Safe to call multiple times — only one timer is active at a time.
     *
     * @param intervalMs  How often to run compression.  Default 5 minutes.
     * @param threshold   Similarity threshold forwarded to compress().
     */
    startCompressionJob(intervalMs = 300_000, threshold = 0.92): void {
        if (this._compressionTimer !== null) return;
        this._compressionTimer = setInterval(() => {
            this.compress(threshold);
        }, intervalMs);
        logger.info('[MuSE] Compression job started', { intervalMs, threshold });
    }

    /** Stop the background compression job. */
    stopCompressionJob(): void {
        if (this._compressionTimer !== null) {
            clearInterval(this._compressionTimer);
            this._compressionTimer = null;
            logger.info('[MuSE] Compression job stopped');
        }
    }

    getMemorySize(): number {
        return this.memory.length;
    }
}

export const muse = new MuSE();
