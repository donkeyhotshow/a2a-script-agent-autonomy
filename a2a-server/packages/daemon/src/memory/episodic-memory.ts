/**
 * EpisodicMemory — ADR-0062: Persistent episodic memory with semantic recall.
 *
 * Stores session outcomes (success/partial/failure) together with a
 * 384-dimensional task embedding (cosine-similarity placeholder — real
 * embeddings are injected at runtime by the AI-proxy layer).
 *
 * Storage backends (in priority order):
 *   1. Postgres — table `episodic_memory`; used when DATABASE_URL is set and
 *      the `pg` package is available.
 *   2. JSON file — `{EPISODIC_MEMORY_PATH}` (default: storage/episodic.json).
 *
 * Public surface:
 *   save(episode)                → persist
 *   recall(taskDescription, topK) → topK nearest by cosine similarity
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'path';
import { logger } from "@a2a/server-utils/logger";

/** Subset of `pg.Pool` used here — optional `pg` at runtime, no compile-time dep on `pg`. */
interface PgPoolLike {
  query<T = unknown>(
    queryText: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}

// ── Public types ──────────────────────────────────────────────────────────────

export type EpisodeOutcome = 'success' | 'partial' | 'failure';

export interface Episode {
  id: string;
  session_id: string;
  task_description: string;
  task_embedding: number[];        // 384-dim vector
  outcome: EpisodeOutcome;
  failure_reason?: string;
  lessons: string[];
  artifacts_produced: string[];    // artifact type names
  confidence_final: number;
  duration_ms: number;
  loop_count: number;
  strategies_used: string[];
  strategies_that_worked: string[];
  strategies_that_failed: string[];
  created_at: number;              // Unix ms timestamp
}

export interface RecallResult {
  episode: Episode;
  similarity_score: number;        // cosine similarity 0.0–1.0
  applicable_lessons: string[];
  risk_warnings: string[];         // patterns that failed in similar tasks
}

// ── Internal storage abstraction ──────────────────────────────────────────────

interface StorageBackend {
  save(episode: Episode): Promise<void>;
  loadAll(): Promise<Episode[]>;
}

// ── JSON file backend ─────────────────────────────────────────────────────────

class JsonFileBackend implements StorageBackend {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async save(episode: Episode): Promise<void> {
    const episodes = await this.loadAll();
    episodes.push(episode);
    await fs.mkdir(
      this.filePath.replace(/[/\\][^/\\]+$/, ''),
      { recursive: true },
    );
    await fs.writeFile(this.filePath, JSON.stringify(episodes, null, 2), 'utf8');
  }

  async loadAll(): Promise<Episode[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Episode[]) : [];
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') return [];
      logger.error('[EpisodicMemory] JSON backend loadAll failed', {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}

// ── Postgres backend ──────────────────────────────────────────────────────────

interface EpisodeRow {
  id: string;
  session_id: string;
  task_description: string;
  task_embedding: string | unknown[];
  outcome: EpisodeOutcome;
  failure_reason: string | null;
  lessons: string | unknown[];
  artifacts_produced: string | unknown[];
  confidence_final: number;
  duration_ms: number;
  loop_count: number;
  strategies_used: string | unknown[];
  strategies_that_worked: string | unknown[];
  strategies_that_failed: string | unknown[];
  created_at: number;
}

/**
 * Minimal inline Postgres client — avoids a hard `pg` dependency.
 * If `pg` is not installed the constructor throws and the caller falls back
 * to the JSON backend.
 */
class PostgresBackend implements StorageBackend {
  private pool: PgPoolLike;

  /**
   * @throws if `pg` is not installed or DATABASE_URL is missing
   */
  constructor(connectionString: string) {
    // Optional dep: load via require so it works in CommonJS output
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool: PgPool } = require("pg") as {
      Pool: new (opts: object) => PgPoolLike;
    };
    this.pool = new PgPool({ connectionString });
  }

  async save(episode: Episode): Promise<void> {
    await this._ensureTable();
    const q = `
      INSERT INTO episodic_memory (
        id, session_id, task_description, task_embedding,
        outcome, failure_reason, lessons, artifacts_produced,
        confidence_final, duration_ms, loop_count,
        strategies_used, strategies_that_worked, strategies_that_failed,
        created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      ON CONFLICT (id) DO NOTHING
    `;
    await this.pool.query(q, [
      episode.id,
      episode.session_id,
      episode.task_description,
      JSON.stringify(episode.task_embedding),
      episode.outcome,
      episode.failure_reason ?? null,
      JSON.stringify(episode.lessons),
      JSON.stringify(episode.artifacts_produced),
      episode.confidence_final,
      episode.duration_ms,
      episode.loop_count,
      JSON.stringify(episode.strategies_used),
      JSON.stringify(episode.strategies_that_worked),
      JSON.stringify(episode.strategies_that_failed),
      episode.created_at,
    ]);
  }

  async loadAll(): Promise<Episode[]> {
    await this._ensureTable();
    const result = await this.pool.query<EpisodeRow>(
      'SELECT * FROM episodic_memory ORDER BY created_at DESC LIMIT 1000',
    );
    return result.rows.map(this._rowToEpisode);
  }

  private async _ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id                    TEXT PRIMARY KEY,
        session_id            TEXT NOT NULL,
        task_description      TEXT NOT NULL,
        task_embedding        JSONB NOT NULL DEFAULT '[]',
        outcome               TEXT NOT NULL,
        failure_reason        TEXT,
        lessons               JSONB NOT NULL DEFAULT '[]',
        artifacts_produced    JSONB NOT NULL DEFAULT '[]',
        confidence_final      REAL NOT NULL DEFAULT 0,
        duration_ms           BIGINT NOT NULL DEFAULT 0,
        loop_count            INT NOT NULL DEFAULT 0,
        strategies_used       JSONB NOT NULL DEFAULT '[]',
        strategies_that_worked JSONB NOT NULL DEFAULT '[]',
        strategies_that_failed JSONB NOT NULL DEFAULT '[]',
        created_at            BIGINT NOT NULL
      )
    `);
  }

   private _rowToEpisode(row: EpisodeRow): Episode {
    const parseJson = (v: unknown): unknown[] =>
      Array.isArray(v) ? v : typeof v === 'string' ? (JSON.parse(v) as unknown[]) : [];

    return {
      id: row.id,
      session_id: row.session_id,
      task_description: row.task_description,
      task_embedding: parseJson(row.task_embedding) as number[],
      outcome: row.outcome,
      failure_reason: row.failure_reason ?? undefined,
      lessons: parseJson(row.lessons) as string[],
      artifacts_produced: parseJson(row.artifacts_produced) as string[],
      confidence_final: row.confidence_final,
      duration_ms: row.duration_ms,
      loop_count: row.loop_count,
      strategies_used: parseJson(row.strategies_used) as string[],
      strategies_that_worked: parseJson(row.strategies_that_worked) as string[],
      strategies_that_failed: parseJson(row.strategies_that_failed) as string[],
      created_at: row.created_at,
    };
  }
}

// ── EpisodicMemory ────────────────────────────────────────────────────────────

const DEFAULT_JSON_PATH = join(
  process.cwd(),
  'storage',
  'episodic.json',
);

export class EpisodicMemory {
  private readonly backend: StorageBackend;

  constructor(
    jsonFilePath: string = process.env['EPISODIC_MEMORY_PATH'] ?? DEFAULT_JSON_PATH,
  ) {
    const dbUrl = process.env['DATABASE_URL'];
    if (dbUrl) {
      try {
        this.backend = new PostgresBackend(dbUrl);
        return;
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        const missingPg = /Cannot find module ['"]pg['"]/.test(detail);
        if (missingPg) {
          logger.debug('[EpisodicMemory] Optional pg not installed, using JSON file');
        } else {
          logger.warn('[EpisodicMemory] Postgres backend unavailable, using JSON file', {
            error: detail,
          });
        }
      }
    }
    this.backend = new JsonFileBackend(jsonFilePath);
  }

  // ── save() ─────────────────────────────────────────────────────────────────

  /**
   * Persist an episode. Generates an ID if not provided.
   */
  async save(episode: Omit<Episode, 'id'> & { id?: string }): Promise<Episode> {
    const full: Episode = {
      id: episode.id ?? `ep-${randomUUID()}`,
      ...episode,
    };
    await this.backend.save(full);
    return full;
  }

  // ── recall() ──────────────────────────────────────────────────────────────

  /**
   * Return the `topK` most similar episodes by cosine similarity of the
   * task embedding. When embeddings are zero-vectors (not yet computed),
   * falls back to lexical overlap scoring so the method always returns
   * useful results.
   */
  async recall(taskDescription: string, topK = 5): Promise<RecallResult[]> {
    const all = await this.backend.loadAll();
    if (all.length === 0) return [];

    const queryEmbedding = _dummyEmbedding(taskDescription);
    const queryIsZero = _isZeroVector(queryEmbedding);

    const scored = all.map((ep) => {
      const epIsZero = _isZeroVector(ep.task_embedding);
      let similarity: number;

      if (queryIsZero || epIsZero || ep.task_embedding.length === 0) {
        // Fallback: normalised bigram overlap
        similarity = _bigramOverlap(taskDescription, ep.task_description);
      } else {
        similarity = _cosineSimilarity(queryEmbedding, ep.task_embedding);
      }

      return { ep, similarity };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    const topResults = scored.slice(0, topK);

    return topResults.map(({ ep, similarity }) => ({
      episode: ep,
      similarity_score: similarity,
      applicable_lessons: ep.lessons,
      risk_warnings: ep.strategies_that_failed.map(
        (s) => `Strategy "${s}" failed in similar task (${ep.outcome}).`,
      ),
    }));
  }
}

// ── Vector / similarity utilities ─────────────────────────────────────────────

/**
 * Produce a 384-dim placeholder embedding from a string.
 * This is replaced at runtime by the AI-proxy layer (Local LLM upstream nomic-embed-text).
 * The placeholder uses character-code bucketing so short strings still produce
 * a non-zero vector that can be compared for unit tests.
 */
function _dummyEmbedding(text: string): number[] {
  const dim = 384;
  const vec = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const bucket = (text.charCodeAt(i) * 7 + i) % dim;
    vec[bucket] = (vec[bucket] ?? 0) + 1;
  }
  // L2-normalise
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function _isZeroVector(vec: number[]): boolean {
  return vec.length === 0 || vec.every((v) => v === 0);
}

function _cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Normalised bigram overlap in [0, 1] */
function _bigramOverlap(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    const lower = s.toLowerCase();
    for (let i = 0; i < lower.length - 1; i++) {
      set.add(lower.slice(i, i + 2));
    }
    return set;
  };

  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;

  let intersection = 0;
  for (const g of ba) {
    if (bb.has(g)) intersection++;
  }

  return intersection / (ba.size + bb.size - intersection);
}
