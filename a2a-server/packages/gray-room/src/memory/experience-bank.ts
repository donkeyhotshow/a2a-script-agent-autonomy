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

/** Shared embedding helper used by both ExperienceBank and PostgresExperienceBank. */
async function embedText(text: string): Promise<number[] | null> {
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

    // ── Public API ───────────────────────────────────────────────────────────

    async recordTurn(
        sessionId: string,
        turnId: string,
        contextJson: string,
        action: { type: string; payload: unknown },
        confidenceDelta: number,
        outcome = 'recorded',
    ): Promise<void> {
        const all = await this.load();
        const embedding = await embedText(contextJson.slice(0, 512));

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
            outcome,
            embedding,
        };

        all.push(entry);
        const trimmed = all.length > MAX_ENTRIES ? all.slice(-MAX_ENTRIES) : all;
        await this.save(trimmed);
        logger.debug('[ExperienceBank] recorded', { sessionId, turnId, outcome });
    }

    async getRelevantExperiences(
        query: string,
        topK = 5,
        excludeOutcome?: string,
    ): Promise<Array<{ action_payload: unknown; outcome: string }>> {
        const all = await this.load();
        if (all.length === 0) return [];

        const queryVec = await embedText(query.slice(0, 512));
        if (!queryVec) {
            logger.warn('[ExperienceBank] Embedding unavailable, skipping recall');
            return [];
        }
        return all
            .filter((e) => Array.isArray(e.embedding) && e.embedding.length > 0)
            .filter((e) => !excludeOutcome || e.outcome !== excludeOutcome)
            .map((e) => ({ e, sim: cosineSim(queryVec, e.embedding) }))
            .sort((a, b) => b.sim - a.sim)
            .slice(0, topK)
            .map((r) => ({ action_payload: r.e.action_payload, outcome: r.e.outcome }));
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

// ── PostgresExperienceBank ────────────────────────────────────────────────────

/** Minimal pg client surface used via dynamic import. */
interface PgClient {
    query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
}

const DDL = `
CREATE TABLE IF NOT EXISTS experience_bank (
    id               TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL,
    turn_id          TEXT NOT NULL,
    ts               BIGINT NOT NULL,
    context          TEXT NOT NULL,
    action_type      TEXT NOT NULL,
    action_payload   TEXT,
    confidence_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
    outcome          TEXT NOT NULL DEFAULT 'recorded',
    embedding        DOUBLE PRECISION[]
)`;

let pgClientPromise: Promise<PgClient | null> | null = null;

async function getPgClient(): Promise<PgClient | null> {
    if (!process.env['DATABASE_URL']) return null;
    if (!pgClientPromise) {
        pgClientPromise = (async () => {
            try {
                const pg = await import('pg');
                const Client = (pg.default?.Client ?? pg.Client) as new (opts: { connectionString: string }) => PgClient;
                const client = new Client({ connectionString: process.env['DATABASE_URL']! });
                await (client as unknown as { connect(): Promise<void> }).connect();
                await client.query(DDL);
                logger.info('[ExperienceBank] Postgres connected');
                return client;
            } catch (err) {
                logger.warn('[ExperienceBank] Postgres unavailable, using JSON fallback', { error: String(err) });
                pgClientPromise = null; // allow retry on next call
                return null;
            }
        })();
    }
    return pgClientPromise;
}

/**
 * Postgres-backed ExperienceBank.
 *
 * Falls back to the JSON implementation if `DATABASE_URL` is not set or if
 * the `pg` package is not installed.  Uses `getPgClient()` which dynamically
 * imports `pg` so the module still loads in environments without the package.
 */
class PostgresExperienceBank extends ExperienceBank {
    override async recordTurn(
        sessionId: string,
        turnId: string,
        contextJson: string,
        action: { type: string; payload: unknown },
        confidenceDelta: number,
        outcome = 'recorded',
    ): Promise<void> {
        const client = await getPgClient();
        if (!client) {
            return super.recordTurn(sessionId, turnId, contextJson, action, confidenceDelta, outcome);
        }

        const embedding = await embedText(contextJson.slice(0, 512));

        try {
            await client.query(
                `INSERT INTO experience_bank
                    (id, session_id, turn_id, ts, context, action_type, action_payload, confidence_delta, outcome, embedding)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    `exp-${randomUUID()}`,
                    sessionId,
                    turnId,
                    Date.now(),
                    contextJson.slice(0, 2_000),
                    action.type,
                    JSON.stringify(action.payload),
                    confidenceDelta,
                    outcome,
                    embedding ?? null,
                ],
            );
            logger.debug('[ExperienceBank:pg] recorded', { sessionId, turnId, outcome });
        } catch (err) {
            logger.error('[ExperienceBank:pg] insert error', { error: String(err) });
        }
    }

    override async getRelevantExperiences(
        query: string,
        topK = 5,
        excludeOutcome?: string,
    ): Promise<Array<{ action_payload: unknown; outcome: string }>> {
        const client = await getPgClient();
        if (!client) {
            return super.getRelevantExperiences(query, topK, excludeOutcome);
        }

        const queryVec = await embedText(query.slice(0, 512));
        if (!queryVec) {
            logger.warn('[ExperienceBank:pg] Embedding unavailable, skipping recall');
            return [];
        }

        try {
            // Fetch all rows that have embeddings (and optionally filter outcome)
            const result = await client.query(
                `SELECT action_type, action_payload, outcome, embedding
                 FROM experience_bank
                 WHERE embedding IS NOT NULL
                   ${excludeOutcome ? 'AND outcome <> $1' : ''}
                 ORDER BY ts DESC
                 LIMIT 500`,
                excludeOutcome ? [excludeOutcome] : [],
            );

            type Row = { action_payload: string; outcome: string; embedding: number[] | string };
            return (result.rows as Row[])
                .map((row) => {
                    let vec: number[] = [];
                    if (Array.isArray(row.embedding)) {
                        vec = row.embedding as number[];
                    } else if (typeof row.embedding === 'string') {
                        try { vec = JSON.parse(row.embedding) as number[]; }
                        catch { logger.warn('[ExperienceBank:pg] Malformed embedding, skipping'); }
                    }
                    return {
                        row,
                        sim: vec.length > 0 ? cosineSim(queryVec, vec) : 0,
                    };
                })
                .sort((a, b) => b.sim - a.sim)
                .slice(0, topK)
                .map((r) => ({
                    action_payload: (() => {
                        try { return JSON.parse(r.row.action_payload) as unknown; }
                        catch { return r.row.action_payload; }
                    })(),
                    outcome: r.row.outcome,
                }));
        } catch (err) {
            logger.error('[ExperienceBank:pg] query error', { error: String(err) });
            return [];
        }
    }
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create the appropriate ExperienceBank implementation.
 *
 * - If `DATABASE_URL` points to a PostgreSQL server, returns a
 *   `PostgresExperienceBank` (cross-session persistence).
 * - Otherwise returns the default JSON-file-based `ExperienceBank`.
 */
export function createExperienceBank(filePath?: string): ExperienceBank {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (dbUrl.startsWith('postgres')) {
        return new PostgresExperienceBank(filePath);
    }
    return new ExperienceBank(filePath);
}

export const globalExperienceBank = createExperienceBank();
