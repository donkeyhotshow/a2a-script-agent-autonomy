/**
 * ArtifactStore — ADR-0053: Artifact Lifecycle Authority
 */
export type ArtifactType = "CONFIDENCE_TRACE" | "EXECUTION_DECISION" | "WAITING_STATE" | "LOOP_SIGNAL" | "TRACE_RISK" | "DRYRUN_PLANGRAPH" | "DRYRUN_DELTA" | "MEMORY_INFLUENCE" | "DONECRITERIA_RESULT" | "VALIDATION_SUMMARY" | "BRANCH_INTEGRITY" | "PREFLIGHT_IMPROVEMENT" | "BLOCKER_SET" | "ORCHESTRATOR_CYCLE" | "SESSION_END_RECORD" | "SCAN_RESULT" | "OPPORTUNITY_SET" | "SELF_CORRECTION_ATTEMPT" | "TOOL_AUDIT" | "STEERING_DECISION" | "LIVING_SPEC" | "EXECUTION_TRACE" | "POLICY_DECISION" | "WAITING_STATE_EVENT" | "OPPORTUNITY_SUPPRESSION" | "REGISTRY_HEALTH" | "ROUTE_DECISION" | "REASONING_CHAIN" | "EXECUTION_PLAN" | "REPLAN_DECISION" | "JUDGMENT_RESULT" | "POLICY_VIOLATION" | "VISION_QA_RESULT" | "ANALYZER_INSIGHTS" | "SKILL_EVOLUTION" | "SKILL_ORACLE_TEST" | "COGNITION_PRIORS" | "RAG_LAYER_TRACE" | "VERIFICATION_RESULT" | "DESIGN_MANIFEST" | "DESIGN_MANIFESTO";
export type ComponentId = string;
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
    severity?: "info" | "warning" | "critical";
    summary: string;
    data: Record<string, unknown>;
    written_by: ComponentId;
    consumed_by: string[];
    superseded_by: string | null;
}
export type ArtifactStoreWritePayload = Omit<StoredArtifact, "written_by" | "consumed_by" | "superseded_by" | "retained_until">;
export declare function createArtifactWriteInput(opts: {
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
    private readonly store;
    private readonly writers;
    registerWriter(type: ArtifactType, writer: ComponentId): void;
    write(artifact: Omit<StoredArtifact, "written_by" | "consumed_by" | "superseded_by" | "retained_until">, writer: ComponentId): Promise<StoredArtifact>;
    get(artifact_id: string): Promise<StoredArtifact>;
    query(params: ArtifactQuery): Promise<StoredArtifact[]>;
    recordConsumption(source_artifact_id: string, consumer_artifact_id: string): Promise<void>;
    supersede(old_artifact_id: string, new_artifact_id: string): Promise<void>;
    purgeExpired(): number;
    get size(): number;
    registeredWriters(): ReadonlyMap<ArtifactType, ComponentId>;
}
export declare const globalArtifactStore: ArtifactStore;
//# sourceMappingURL=artifact-store.d.ts.map