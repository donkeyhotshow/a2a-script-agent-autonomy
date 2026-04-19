/**
 * ExperienceBank — persistent episodic experience store (ADR-005).
 *
 * Records turn-level experiences (context + action + outcome) with
 * real embedding vectors and provides semantic recall via cosine similarity.
 *
 * Storage: JSON file (default path: storage/experience-bank.json),
 * replaceable with Postgres. Max entries capped at 1 000 (FIFO eviction).
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@a2a/server-utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Experience {
    id: string;
    sessionId: string;
    turnId: string;
    timestamp: number;
    context: string;
    action: { type: string; payload: unknown };
    confidenceDelta: number;
    action_payload: unknown;
    outcome: string;
    embedding: number[];
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

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

// ── ExperienceBank ────────────────────────────────────────────────────────────

const DEFAULT_FILE = join(process.cwd(), 'storage', 'experience-bank.json');
const MAX_ENTRIES = 1_000;

class ExperienceBank {
    private readonly filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath ?? (process.env['EXPERIENCE_BANK_PATH'] ?? DEFAULT_FILE);
    }

    // ── Storage helpers ──────────────────────────────────────────────────────

    private async load(): Promise<Experience[]> {
        try {
            const raw = await fs.readFile(this.filePath, 'utf8');
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as Experience[]) : [];
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
            logger.error('[ExperienceBank] load error', { error: String(err) });
            return [];
        }
    }

    private async save(entries: Experience[]): Promise<void> {
        try {
            const dir = this.filePath.replace(/[/\\][^/\\]+$/, '');
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.filePath, JSON.stringify(entries, null, 2), 'utf8');
        } catch (err: unknown) {
            logger.error('[ExperienceBank] save error', { error: String(err) });
        }
    }

    // ── Embed helper ─────────────────────────────────────────────────────────

    private async embed(text: string): Promise<number[] | null> {
        try {
            const { globalEmbeddingClient } = await import(
                '../../../server/src/memory/EmbeddingClient.js'
            );
            return await globalEmbeddingClient.embed(text);
        } catch {
            logger.warn('[ExperienceBank] EmbeddingClient unavailable');
            return null;
        }
    }

    // ── Public API ───────────────────────────────────────────────────────────

    async recordTurn(
        sessionId: string,
        turnId: string,
        contextJson: string,
        action: { type: string; payload: unknown },
        confidenceDelta: number,
    ): Promise<void> {
        const all = await this.load();
        const embedding = await this.embed(contextJson.slice(0, 512));

        if (!embedding) {
            logger.warn('[ExperienceBank] Embedding unavailable, skipping turn record', { sessionId, turnId });
            return;
        }

        const entry: Experience = {
            id: `exp-${randomUUID()}`,
            sessionId,
            turnId,
            timestamp: Date.now(),
            context: contextJson.slice(0, 2_000),
            action,
            confidenceDelta,
            action_payload: action.payload,
            outcome: 'recorded',
            embedding,
        };

        all.push(entry);
        const trimmed = all.length > MAX_ENTRIES ? all.slice(-MAX_ENTRIES) : all;
        await this.save(trimmed);
        logger.debug('[ExperienceBank] recorded', { sessionId, turnId });
    }

    async getRelevantExperiences(
        query: string,
        topK = 5,
    ): Promise<Array<{ action_payload: unknown }>> {
        const all = await this.load();
        if (all.length === 0) return [];

        const queryVec = await this.embed(query.slice(0, 512));
        if (!queryVec) {
            logger.warn('[ExperienceBank] Embedding unavailable, skipping recall');
            return [];
        }
        return all
            .filter((e) => Array.isArray(e.embedding) && e.embedding.length > 0)
            .map((e) => ({ e, sim: cosineSim(queryVec, e.embedding) }))
            .sort((a, b) => b.sim - a.sim)
            .slice(0, topK)
            .map((r) => ({ action_payload: r.e.action_payload }));
    }

    /** @deprecated Use recordTurn(). */
    store(exp: Experience): void {
        this.recordTurn(
            exp.sessionId,
            exp.turnId ?? exp.id,
            JSON.stringify(exp.context),
            exp.action ?? { type: 'unknown', payload: null },
            exp.confidenceDelta ?? 0,
        ).catch((e: unknown) =>
            logger.warn('[ExperienceBank] store() error', { error: String(e) }),
        );
    }

    /** @deprecated Use getRelevantExperiences(). */
    retrieve(_query: Record<string, unknown>): Experience[] {
        return [];
    }
}

export const globalExperienceBank = new ExperienceBank();
