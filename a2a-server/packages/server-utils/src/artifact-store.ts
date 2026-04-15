/**
 * ArtifactStore — ADR-0053: Artifact Lifecycle Authority
 */

import { randomUUID } from "node:crypto";
import { validateArtifact } from "./artifact-validator.js";
import { globalEventBus } from "./event-bus.js";

export type ArtifactType =
  | "CONFIDENCE_TRACE"
  | "EXECUTION_DECISION"
  | "WAITING_STATE"
  | "LOOP_SIGNAL"
  | "TRACE_RISK"
  | "DRYRUN_PLANGRAPH"
  | "DRYRUN_DELTA"
  | "MEMORY_INFLUENCE"
  | "DONECRITERIA_RESULT"
  | "VALIDATION_SUMMARY"
  | "BRANCH_INTEGRITY"
  | "PREFLIGHT_IMPROVEMENT"
  | "BLOCKER_SET"
  | "ORCHESTRATOR_CYCLE"
  | "SESSION_END_RECORD"
  | "SCAN_RESULT"
  | "OPPORTUNITY_SET"
  | "SELF_CORRECTION_ATTEMPT"
  | "TOOL_AUDIT"
  | "STEERING_DECISION"
  | "LIVING_SPEC"
  | "EXECUTION_TRACE"
  | "POLICY_DECISION"
  | "WAITING_STATE_EVENT"
  | "OPPORTUNITY_SUPPRESSION"
  | "REGISTRY_HEALTH"
  | "ROUTE_DECISION"
  | "REASONING_CHAIN"
  | "EXECUTION_PLAN"
  | "REPLAN_DECISION"
  | "JUDGMENT_RESULT"
  | "POLICY_VIOLATION"
  | "VISION_QA_RESULT"
  | "ANALYZER_INSIGHTS"
  | "SKILL_EVOLUTION"
  | "SKILL_ORACLE_TEST"
  | "COGNITION_PRIORS"
  | "RAG_LAYER_TRACE"
  | "VERIFICATION_RESULT"
  | "DESIGN_MANIFEST"
  | "DESIGN_MANIFESTO";

export type ComponentId = string;

export const TTL_MS: Partial<Record<ArtifactType, number>> = {
  CONFIDENCE_TRACE: 7 * 24 * 60 * 60 * 1_000,
  EXECUTION_DECISION: 7 * 24 * 60 * 60 * 1_000,
  WAITING_STATE: 7 * 24 * 60 * 60 * 1_000,
  LOOP_SIGNAL: 3 * 24 * 60 * 60 * 1_000,
  TRACE_RISK: 7 * 24 * 60 * 60 * 1_000,
  DRYRUN_PLANGRAPH: 14 * 24 * 60 * 60 * 1_000,
  DRYRUN_DELTA: 14 * 24 * 60 * 60 * 1_000,
  MEMORY_INFLUENCE: 30 * 24 * 60 * 60 * 1_000,
  DONECRITERIA_RESULT: 7 * 24 * 60 * 60 * 1_000,
  VALIDATION_SUMMARY: 30 * 24 * 60 * 60 * 1_000,
  BRANCH_INTEGRITY: 30 * 24 * 60 * 60 * 1_000,
  PREFLIGHT_IMPROVEMENT: 7 * 24 * 60 * 60 * 1_000,
  BLOCKER_SET: 7 * 24 * 60 * 60 * 1_000,
  ORCHESTRATOR_CYCLE: 3 * 24 * 60 * 60 * 1_000,
  SESSION_END_RECORD: 90 * 24 * 60 * 60 * 1_000,
  SCAN_RESULT: 3 * 24 * 60 * 60 * 1_000,
  OPPORTUNITY_SET: 7 * 24 * 60 * 60 * 1_000,
  SELF_CORRECTION_ATTEMPT: 7 * 24 * 60 * 60 * 1_000,
  TOOL_AUDIT: 7 * 24 * 60 * 60 * 1_000,
  STEERING_DECISION: 14 * 24 * 60 * 60 * 1_000,
  LIVING_SPEC: 30 * 24 * 60 * 60 * 1_000,
  EXECUTION_TRACE: 7 * 24 * 60 * 60 * 1_000,
  POLICY_DECISION: 14 * 24 * 60 * 60 * 1_000,
  WAITING_STATE_EVENT: 3 * 24 * 60 * 60 * 1_000,
  OPPORTUNITY_SUPPRESSION: 3 * 24 * 60 * 60 * 1_000,
  REGISTRY_HEALTH: 1 * 24 * 60 * 60 * 1_000,
  ROUTE_DECISION: 3 * 24 * 60 * 60 * 1_000,
  REASONING_CHAIN: 14 * 24 * 60 * 60 * 1_000,
  EXECUTION_PLAN: 14 * 24 * 60 * 60 * 1_000,
  REPLAN_DECISION: 14 * 24 * 60 * 60 * 1_000,
  JUDGMENT_RESULT: 14 * 24 * 60 * 60 * 1_000,
  POLICY_VIOLATION: 14 * 24 * 60 * 60 * 1_000,
  VISION_QA_RESULT: 14 * 24 * 60 * 60 * 1_000,
  ANALYZER_INSIGHTS: 3 * 24 * 60 * 60 * 1_000,
  SKILL_EVOLUTION: 30 * 24 * 60 * 60 * 1_000,
  SKILL_ORACLE_TEST: 7 * 24 * 60 * 60 * 1_000,
  COGNITION_PRIORS: 1 * 24 * 60 * 60 * 1_000,
  RAG_LAYER_TRACE: 1 * 24 * 60 * 60 * 1_000,
  VERIFICATION_RESULT: 7 * 24 * 60 * 60 * 1_000,
  DESIGN_MANIFEST: 30 * 24 * 60 * 60 * 1_000,
  DESIGN_MANIFESTO: 30 * 24 * 60 * 60 * 1_000,
};

export interface StoredArtifact {
  artifact_id: string;
  artifact_type: ArtifactType;
  session_id: string;
  task_run_id?: string;
  turn_id: string;
  created_at: string;
  retained_until: string;
  schema_version: string;
  severity?: "info" | "warning" | "critical";
  summary: string;
  data: Record<string, unknown>;
  written_by: ComponentId;
  consumed_by: string[];
  superseded_by: string | null;
}

export type ArtifactStoreWritePayload = Omit<
  StoredArtifact,
  "written_by" | "consumed_by" | "superseded_by" | "retained_until"
>;

export function createArtifactWriteInput(opts: {
  artifact_type: ArtifactType;
  session_id: string;
  turn_id: string;
  summary: string;
  data: Record<string, unknown>;
  artifact_id?: string;
  created_at?: string;
  schema_version?: string;
  severity?: StoredArtifact["severity"];
  task_run_id?: string;
}): ArtifactStoreWritePayload {
  const row: ArtifactStoreWritePayload = {
    artifact_id: opts.artifact_id ?? randomUUID(),
    artifact_type: opts.artifact_type,
    session_id: opts.session_id,
    turn_id: opts.turn_id,
    created_at: opts.created_at ?? new Date().toISOString(),
    schema_version: opts.schema_version ?? "1",
    summary: opts.summary,
    data: opts.data,
  };
  if (opts.severity !== undefined) row.severity = opts.severity;
  if (opts.task_run_id !== undefined) row.task_run_id = opts.task_run_id;
  return row;
}

export interface ArtifactQuery {
  session_id?: string;
  artifact_type?: ArtifactType;
  turn_id?: string;
  since?: string;
  include_superseded?: boolean;
}

export class UnauthorizedWriterError extends Error {
  constructor(type: ArtifactType, writer: ComponentId, registered: ComponentId) {
    super(
      `Unauthorized write attempt: artifact type '${type}' is owned by '${registered}', not '${writer}'`,
    );
    this.name = "UnauthorizedWriterError";
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(artifact_id: string) {
    super(`Artifact '${artifact_id}' not found`);
    this.name = "ArtifactNotFoundError";
  }
}

export class ArtifactValidationError extends Error {
  constructor(artifact_id: string, errors: string[]) {
    super(`Artifact '${artifact_id}' failed validation: ${errors.join("; ")}`);
    this.name = "ArtifactValidationError";
  }
}

export class ArtifactStore {
  private readonly store = new Map<string, StoredArtifact>();
  private readonly writers = new Map<ArtifactType, ComponentId>();

  registerWriter(type: ArtifactType, writer: ComponentId): void {
    const existing = this.writers.get(type);
    if (existing && existing !== writer) {
      throw new Error(
        `ArtifactType '${type}' already has a registered writer: '${existing}'. Cannot register '${writer}'.`,
      );
    }
    this.writers.set(type, writer);
  }

  async write(
    artifact: Omit<
      StoredArtifact,
      "written_by" | "consumed_by" | "superseded_by" | "retained_until"
    >,
    writer: ComponentId,
  ): Promise<StoredArtifact> {
    const registeredWriter = this.writers.get(artifact.artifact_type);
    if (registeredWriter && registeredWriter !== writer) {
      throw new UnauthorizedWriterError(
        artifact.artifact_type,
        writer,
        registeredWriter,
      );
    }

    const validationResult = validateArtifact(artifact);
    if (!validationResult.valid) {
      throw new ArtifactValidationError(artifact.artifact_id, validationResult.errors);
    }

    const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1_000;
    const ttl = TTL_MS[artifact.artifact_type] ?? DEFAULT_TTL;
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
        type: "ARTIFACT_WRITTEN",
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

    results.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return results;
  }

  async recordConsumption(source_artifact_id: string, consumer_artifact_id: string): Promise<void> {
    const source = this.store.get(source_artifact_id);
    if (!source) throw new ArtifactNotFoundError(source_artifact_id);
    if (!source.consumed_by.includes(consumer_artifact_id)) {
      source.consumed_by.push(consumer_artifact_id);
    }
  }

  async supersede(old_artifact_id: string, new_artifact_id: string): Promise<void> {
    const old = this.store.get(old_artifact_id);
    if (!old) throw new ArtifactNotFoundError(old_artifact_id);
    if (!this.store.has(new_artifact_id)) throw new ArtifactNotFoundError(new_artifact_id);
    old.superseded_by = new_artifact_id;
  }

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

  get size(): number {
    return this.store.size;
  }

  registeredWriters(): ReadonlyMap<ArtifactType, ComponentId> {
    return this.writers;
  }
}

export const globalArtifactStore = new ArtifactStore();
