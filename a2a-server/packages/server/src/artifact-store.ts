/**
 * ArtifactStore — ADR-0053: Artifact Lifecycle Authority
 *
 * Canonical authority model for all session artifacts:
 *
 *   1. Single writer per type — each ArtifactType has exactly one registered writer.
 *   2. Append-only — artifacts are never mutated; superseded records get a
 *      `superseded_by` pointer instead.
 *   3. Mandatory base fields — enforced via ArtifactBaseSchema before write.
 *   4. TTL policy — per-type retention period; `purgeExpired()` removes stale records.
 *   5. Consumption tracking — `recordConsumption()` appends to the source artifact's
 *      `consumed_by[]` array (the only allowed post-write mutation).
 */

import { randomUUID } from 'node:crypto';
import { validateArtifact } from '../../artifact-validator.js';
import { globalEventBus } from './utils/event-bus.js';

// ── Re-export base types so callers only import from one place ────────────────

export type ArtifactType =
  | 'CONFIDENCE_TRACE'
  | 'EXECUTION_DECISION'
  | 'WAITING_STATE'
  | 'LOOP_SIGNAL'
  | 'TRACE_RISK'
  | 'DRYRUN_PLANGRAPH'
  | 'DRYRUN_DELTA'
  | 'MEMORY_INFLUENCE'
  | 'DONECRITERIA_RESULT'
  | 'VALIDATION_SUMMARY'
  | 'BRANCH_INTEGRITY'
  | 'PREFLIGHT_IMPROVEMENT'
  | 'BLOCKER_SET'
  | 'ORCHESTRATOR_CYCLE'
  | 'SESSION_END_RECORD'
  | 'SCAN_RESULT'
  | 'OPPORTUNITY_SET'
  | 'SELF_CORRECTION_ATTEMPT'
  | 'TOOL_AUDIT'
  | 'STEERING_DECISION'
  | 'LIVING_SPEC'
  | 'EXECUTION_TRACE'
  | 'POLICY_DECISION'
  | 'WAITING_STATE_EVENT'
  | 'OPPORTUNITY_SUPPRESSION'
  | 'REGISTRY_HEALTH'
  | 'ROUTE_DECISION'
  | 'REASONING_CHAIN'
  | 'EXECUTION_PLAN'
  | 'REPLAN_DECISION'
  | 'JUDGMENT_RESULT'
  | 'POLICY_VIOLATION'
  | 'VISION_QA_RESULT'
  | 'ANALYZER_INSIGHTS'
  | 'SKILL_EVOLUTION'
  | 'SKILL_ORACLE_TEST'
  | 'COGNITION_PRIORS'
  | 'RAG_LAYER_TRACE'
  | 'VERIFICATION_RESULT'
  | 'DESIGN_MANIFEST'
  | 'DESIGN_MANIFESTO';

/** Unique identifier for the component writing an artifact */
export type ComponentId = string;

/** Millisecond retention durations per artifact type (ADR-0053 §TTL policy) */
export const TTL_MS: Partial<Record<ArtifactType, number>> = {
  CONFIDENCE_TRACE:        7  * 24 * 60 * 60 * 1_000,  // 7 days
  EXECUTION_DECISION:      7  * 24 * 60 * 60 * 1_000,
  WAITING_STATE:           7  * 24 * 60 * 60 * 1_000,
  LOOP_SIGNAL:             3  * 24 * 60 * 60 * 1_000,  // 3 days
  TRACE_RISK:              7  * 24 * 60 * 60 * 1_000,
  DRYRUN_PLANGRAPH:        14 * 24 * 60 * 60 * 1_000,  // 14 days
  DRYRUN_DELTA:            14 * 24 * 60 * 60 * 1_000,
  MEMORY_INFLUENCE:        30 * 24 * 60 * 60 * 1_000,  // 30 days
  DONECRITERIA_RESULT:     7  * 24 * 60 * 60 * 1_000,
  VALIDATION_SUMMARY:      30 * 24 * 60 * 60 * 1_000,
  BRANCH_INTEGRITY:        30 * 24 * 60 * 60 * 1_000,
  PREFLIGHT_IMPROVEMENT:   7  * 24 * 60 * 60 * 1_000,
  BLOCKER_SET:             7  * 24 * 60 * 60 * 1_000,
  ORCHESTRATOR_CYCLE:      3  * 24 * 60 * 60 * 1_000,
  SESSION_END_RECORD:      90 * 24 * 60 * 60 * 1_000,  // 90 days
  SCAN_RESULT:             3  * 24 * 60 * 60 * 1_000,
  OPPORTUNITY_SET:         7  * 24 * 60 * 60 * 1_000,
  SELF_CORRECTION_ATTEMPT: 7  * 24 * 60 * 60 * 1_000,
  TOOL_AUDIT:              7  * 24 * 60 * 60 * 1_000,
  STEERING_DECISION:       14 * 24 * 60 * 60 * 1_000,
  LIVING_SPEC:             30 * 24 * 60 * 60 * 1_000,
  EXECUTION_TRACE:         7  * 24 * 60 * 60 * 1_000,
  POLICY_DECISION:         14 * 24 * 60 * 60 * 1_000,
  WAITING_STATE_EVENT:     3  * 24 * 60 * 60 * 1_000,
  OPPORTUNITY_SUPPRESSION: 3  * 24 * 60 * 60 * 1_000,
  REGISTRY_HEALTH:         1  * 24 * 60 * 60 * 1_000,  // 1 day — high-frequency, short-lived
  ROUTE_DECISION:          3  * 24 * 60 * 60 * 1_000,
  REASONING_CHAIN:         14 * 24 * 60 * 60 * 1_000,  // 14 days
  EXECUTION_PLAN:          14 * 24 * 60 * 60 * 1_000,  // 14 days
  REPLAN_DECISION:         14 * 24 * 60 * 60 * 1_000,  // 14 days
  JUDGMENT_RESULT:         14 * 24 * 60 * 60 * 1_000,  // 14 days
  POLICY_VIOLATION:        14 * 24 * 60 * 60 * 1_000,  // 14 days
  VISION_QA_RESULT:        14 * 24 * 60 * 60 * 1_000,  // 14 days
  ANALYZER_INSIGHTS:       3  * 24 * 60 * 60 * 1_000,  // 3 days
  SKILL_EVOLUTION:         30 * 24 * 60 * 60 * 1_000,  // 30 days
  SKILL_ORACLE_TEST:       7  * 24 * 60 * 60 * 1_000,  // 7 days
  COGNITION_PRIORS:        1  * 24 * 60 * 60 * 1_000,  // 1 day
  RAG_LAYER_TRACE:         1  * 24 * 60 * 60 * 1_000,  // 1 day
  VERIFICATION_RESULT:     7  * 24 * 60 * 60 * 1_000,  // 7 days
  DESIGN_MANIFEST:         30 * 24 * 60 * 60 * 1_000,  // 30 days — reusable across sessions
  DESIGN_MANIFESTO:        30 * 24 * 60 * 60 * 1_000,  // mock / legacy hierarchical reasoner
};

// ── Stored artifact shape ─────────────────────────────────────────────────────

export interface StoredArtifact {
  artifact_id: string;
  artifact_type: ArtifactType;
  session_id: string;
  task_run_id?: string;
  turn_id: string;
  created_at: string;
  retained_until: string;
  schema_version: string;
  severity?: 'info' | 'warning' | 'critical';
  summary: string;
  data: Record<string, unknown>;
  /** Writer that created this artifact */
  written_by: ComponentId;
  /** IDs of downstream artifacts that consumed this one */
  consumed_by: string[];
  /** If non-null, this artifact has been superseded */
  superseded_by: string | null;
}

/** Payload accepted by {@link ArtifactStore.write} before store adds TTL / writer fields. */
export type ArtifactStoreWritePayload = Omit<
  StoredArtifact,
  'written_by' | 'consumed_by' | 'superseded_by' | 'retained_until'
>;

/**
 * Build a {@link ArtifactStore.write} row with `created_at` and default `schema_version` / `artifact_id`.
 */
export function createArtifactWriteInput(opts: {
  artifact_type: ArtifactType;
  session_id: string;
  turn_id: string;
  summary: string;
  data: Record<string, unknown>;
  artifact_id?: string;
  created_at?: string;
  schema_version?: string;
  severity?: StoredArtifact['severity'];
  task_run_id?: string;
}): ArtifactStoreWritePayload {
  const row: ArtifactStoreWritePayload = {
    artifact_id: opts.artifact_id ?? randomUUID(),
    artifact_type: opts.artifact_type,
    session_id: opts.session_id,
    turn_id: opts.turn_id,
    created_at: opts.created_at ?? new Date().toISOString(),
    schema_version: opts.schema_version ?? '1',
    summary: opts.summary,
    data: opts.data,
  };
  if (opts.severity !== undefined) {
    row.severity = opts.severity;
  }
  if (opts.task_run_id !== undefined) {
    row.task_run_id = opts.task_run_id;
  }
  return row;
}

// ── Query parameters ──────────────────────────────────────────────────────────

export interface ArtifactQuery {
  session_id?: string;
  artifact_type?: ArtifactType;
  turn_id?: string;
  since?: string;              // ISO-8601; return artifacts created after this time
  include_superseded?: boolean;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class UnauthorizedWriterError extends Error {
  constructor(type: ArtifactType, writer: ComponentId, registered: ComponentId) {
    super(
      `Unauthorized write attempt: artifact type '${type}' is owned by '${registered}', not '${writer}'`,
    );
    this.name = 'UnauthorizedWriterError';
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(artifact_id: string) {
    super(`Artifact '${artifact_id}' not found`);
    this.name = 'ArtifactNotFoundError';
  }
}

export class ArtifactValidationError extends Error {
  constructor(artifact_id: string, errors: string[]) {
    super(`Artifact '${artifact_id}' failed validation: ${errors.join('; ')}`);
    this.name = 'ArtifactValidationError';
  }
}

// ── ArtifactStore ─────────────────────────────────────────────────────────────

export class ArtifactStore {
  /** Primary storage — keyed by artifact_id */
  private readonly store = new Map<string, StoredArtifact>();

  /**
   * Single-writer registry — maps ArtifactType → ComponentId.
   * Populated via `registerWriter()` during system initialisation.
   */
  private readonly writers = new Map<ArtifactType, ComponentId>();

  // ── Writer registry ───────────────────────────────────────────────────────

  /**
   * Register the canonical writer for an artifact type.
   * Must be called once per type at startup; re-registering the same writer
   * is a no-op; re-registering a different writer throws.
   */
  registerWriter(type: ArtifactType, writer: ComponentId): void {
    const existing = this.writers.get(type);
    if (existing && existing !== writer) {
      throw new Error(
        `ArtifactType '${type}' already has a registered writer: '${existing}'. Cannot register '${writer}'.`,
      );
    }
    this.writers.set(type, writer);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Write an artifact to the store.
   *
   *  - Validates mandatory base fields.
   *  - Enforces single-writer policy (if a writer is registered for the type).
   *  - Computes and stores `retained_until` from the TTL policy.
   *  - Returns the stored artifact (with `written_by`, `consumed_by`, etc.).
   */
  async write(
    artifact: Omit<StoredArtifact, 'written_by' | 'consumed_by' | 'superseded_by' | 'retained_until'>,
    writer: ComponentId,
  ): Promise<StoredArtifact> {
    // Enforce single-writer policy
    const registeredWriter = this.writers.get(artifact.artifact_type);
    if (registeredWriter && registeredWriter !== writer) {
      throw new UnauthorizedWriterError(artifact.artifact_type, writer, registeredWriter);
    }

    // Validate mandatory base fields + type-specific data schema
    const validationResult = validateArtifact(artifact);
    if (!validationResult.valid) {
      throw new ArtifactValidationError(artifact.artifact_id, validationResult.errors);
    }

    // Compute retention deadline
    const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1_000; // 7-day fallback
    const ttl = TTL_MS[artifact.artifact_type] ?? DEFAULT_TTL_MS;
    const retained_until = new Date(Date.now() + ttl).toISOString();

    const stored: StoredArtifact = {
      ...artifact,
      written_by: writer,
      consumed_by: [],
      superseded_by: null,
      retained_until,
    };

    this.store.set(artifact.artifact_id, stored);

    setImmediate(() => {
      globalEventBus.publish({
        type: 'ARTIFACT_WRITTEN',
        session_id: stored.session_id,
        payload: {
          artifact_id: stored.artifact_id,
          artifact_type: stored.artifact_type,
          written_by: stored.written_by,
        },
      });
    });

    return stored;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async get(artifact_id: string): Promise<StoredArtifact> {
    const artifact = this.store.get(artifact_id);
    if (!artifact) throw new ArtifactNotFoundError(artifact_id);
    return artifact;
  }

  async query(params: ArtifactQuery): Promise<StoredArtifact[]> {
    const results: StoredArtifact[] = [];
    const sinceMs = params.since ? new Date(params.since).getTime() : 0;

    for (const artifact of this.store.values()) {
      if (params.session_id && artifact.session_id !== params.session_id) continue;
      if (params.artifact_type && artifact.artifact_type !== params.artifact_type) continue;
      if (params.turn_id && artifact.turn_id !== params.turn_id) continue;
      if (sinceMs && new Date(artifact.created_at).getTime() <= sinceMs) continue;
      if (!params.include_superseded && artifact.superseded_by !== null) continue;
      results.push(artifact);
    }

    // Chronological order
    results.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return results;
  }

  // ── Consumption tracking ──────────────────────────────────────────────────

  /**
   * Record that `consumer_artifact_id` consumed `source_artifact_id`.
   * This is the only post-write mutation allowed (ADR-0053 §consumption tracking).
   */
  async recordConsumption(
    source_artifact_id: string,
    consumer_artifact_id: string,
  ): Promise<void> {
    const source = this.store.get(source_artifact_id);
    if (!source) throw new ArtifactNotFoundError(source_artifact_id);
    if (!source.consumed_by.includes(consumer_artifact_id)) {
      source.consumed_by.push(consumer_artifact_id);
    }
  }

  // ── Supersession ─────────────────────────────────────────────────────────

  /**
   * Mark `old_artifact_id` as superseded by `new_artifact_id`.
   * Both artifacts must already be in the store.
   */
  async supersede(old_artifact_id: string, new_artifact_id: string): Promise<void> {
    const old = this.store.get(old_artifact_id);
    if (!old) throw new ArtifactNotFoundError(old_artifact_id);
    if (!this.store.has(new_artifact_id)) throw new ArtifactNotFoundError(new_artifact_id);
    old.superseded_by = new_artifact_id;
  }

  // ── TTL / purge ───────────────────────────────────────────────────────────

  /**
   * Remove all artifacts whose `retained_until` is in the past.
   * Intended to be called as a nightly maintenance job.
   *
   * @returns Number of artifacts removed.
   */
  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, artifact] of this.store) {
      if (new Date(artifact.retained_until).getTime() < now) {
        this.store.delete(id);
        removed++;
      }
    }
    return removed;
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  /** Total artifacts currently in the store (including superseded). */
  get size(): number {
    return this.store.size;
  }

  /** Returns all registered writers. */
  registeredWriters(): ReadonlyMap<ArtifactType, ComponentId> {
    return this.writers;
  }
}

export const globalArtifactStore = new ArtifactStore();

