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
export type ArtifactType = 'CONFIDENCE_TRACE' | 'EXECUTION_DECISION' | 'WAITING_STATE' | 'LOOP_SIGNAL' | 'TRACE_RISK' | 'DRYRUN_PLANGRAPH' | 'DRYRUN_DELTA' | 'MEMORY_INFLUENCE' | 'DONECRITERIA_RESULT' | 'VALIDATION_SUMMARY' | 'BRANCH_INTEGRITY' | 'PREFLIGHT_IMPROVEMENT' | 'BLOCKER_SET' | 'ORCHESTRATOR_CYCLE' | 'SESSION_END_RECORD' | 'SCAN_RESULT' | 'OPPORTUNITY_SET' | 'SELF_CORRECTION_ATTEMPT' | 'TOOL_AUDIT' | 'STEERING_DECISION' | 'LIVING_SPEC' | 'EXECUTION_TRACE' | 'POLICY_DECISION' | 'WAITING_STATE_EVENT' | 'OPPORTUNITY_SUPPRESSION' | 'REGISTRY_HEALTH' | 'ROUTE_DECISION' | 'REASONING_CHAIN' | 'EXECUTION_PLAN' | 'REPLAN_DECISION' | 'JUDGMENT_RESULT' | 'POLICY_VIOLATION' | 'VISION_QA_RESULT' | 'ANALYZER_INSIGHTS' | 'SKILL_EVOLUTION' | 'SKILL_ORACLE_TEST' | 'COGNITION_PRIORS' | 'RAG_LAYER_TRACE' | 'VERIFICATION_RESULT' | 'DESIGN_MANIFEST' | 'DESIGN_MANIFESTO';
/** Unique identifier for the component writing an artifact */
export type ComponentId = string;
/** Millisecond retention durations per artifact type (ADR-0053 §TTL policy) */
export declare const TTL_MS: Partial<Record<ArtifactType, number>>;
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
export type ArtifactStoreWritePayload = Omit<StoredArtifact, 'written_by' | 'consumed_by' | 'superseded_by' | 'retained_until'>;
/**
 * Build a {@link ArtifactStore.write} row with `created_at` and default `schema_version` / `artifact_id`.
 */
export declare function createArtifactWriteInput(opts: {
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
}): ArtifactStoreWritePayload;
export interface ArtifactQuery {
    session_id?: string;
    artifact_type?: ArtifactType;
    turn_id?: string;
    since?: string;
    include_superseded?: boolean;
}
export declare class UnauthorizedWriterError extends Error {
    constructor(type: ArtifactType, writer: ComponentId, registered: ComponentId);
}
export declare class ArtifactNotFoundError extends Error {
    constructor(artifact_id: string);
}
export declare class ArtifactValidationError extends Error {
    constructor(artifact_id: string, errors: string[]);
}
export declare class ArtifactStore {
    /** Primary storage — keyed by artifact_id */
    private readonly store;
    /**
     * Single-writer registry — maps ArtifactType → ComponentId.
     * Populated via `registerWriter()` during system initialisation.
     */
    private readonly writers;
    /**
     * Register the canonical writer for an artifact type.
     * Must be called once per type at startup; re-registering the same writer
     * is a no-op; re-registering a different writer throws.
     */
    registerWriter(type: ArtifactType, writer: ComponentId): void;
    /**
     * Write an artifact to the store.
     *
     *  - Validates mandatory base fields.
     *  - Enforces single-writer policy (if a writer is registered for the type).
     *  - Computes and stores `retained_until` from the TTL policy.
     *  - Returns the stored artifact (with `written_by`, `consumed_by`, etc.).
     */
    write(artifact: Omit<StoredArtifact, 'written_by' | 'consumed_by' | 'superseded_by' | 'retained_until'>, writer: ComponentId): Promise<StoredArtifact>;
    get(artifact_id: string): Promise<StoredArtifact>;
    query(params: ArtifactQuery): Promise<StoredArtifact[]>;
    /**
     * Record that `consumer_artifact_id` consumed `source_artifact_id`.
     * This is the only post-write mutation allowed (ADR-0053 §consumption tracking).
     */
    recordConsumption(source_artifact_id: string, consumer_artifact_id: string): Promise<void>;
    /**
     * Mark `old_artifact_id` as superseded by `new_artifact_id`.
     * Both artifacts must already be in the store.
     */
    supersede(old_artifact_id: string, new_artifact_id: string): Promise<void>;
    /**
     * Remove all artifacts whose `retained_until` is in the past.
     * Intended to be called as a nightly maintenance job.
     *
     * @returns Number of artifacts removed.
     */
    purgeExpired(): number;
    /** Total artifacts currently in the store (including superseded). */
    get size(): number;
    /** Returns all registered writers. */
    registeredWriters(): ReadonlyMap<ArtifactType, ComponentId>;
}
export declare const globalArtifactStore: ArtifactStore;
//# sourceMappingURL=artifact-store.d.ts.map