// 5-phase cognitive cycle (ADR-0071) — runs inside EXECUTING
export type CognitivePhase =
  | 'REFLECT'      // Phase 1: Analyse outcome + inject memory
  | 'SYNTHESIZE'   // Phase 2: Generate Living Spec + done-criteria
  | 'ENRICH'       // Phase 3: Episodic recall + TRACE_RISK critique
  | 'PLAN'         // Phase 4: DryRun PlanGraph + confidence calibration
  | 'EXECUTE';     // Phase 5: Tool audit + deviation monitoring

// Operational FSM states (ADR-0051)
export type OperationalState =
  | 'IDLE' | 'SCANNING' | 'SYNTHESIZING' | 'ENRICHING'
  | 'EXECUTING' | 'SELF_CORRECTING' | 'WAITING_ON_HUMAN'
  | 'VALIDATING' | 'DELIVERING' | 'STOPPED';

// Combined state used across UI — cognitive phases are valid session states
export type OrchestratorState = OperationalState | CognitivePhase;

// Type guards
export function isCognitivePhase(s: OrchestratorState): s is CognitivePhase {
  return ['REFLECT', 'SYNTHESIZE', 'ENRICH', 'PLAN', 'EXECUTE'].includes(s as string);
}

export function isOperationalState(s: OrchestratorState): s is OperationalState {
  return !isCognitivePhase(s);
}

// Type-safe FSM transition map (ADR-0051)
export const FSM_TRANSITIONS: Partial<Record<OrchestratorState, OrchestratorState[]>> = {
  IDLE:             ['SCANNING'],
  SCANNING:         ['SYNTHESIZING', 'IDLE'],
  SYNTHESIZING:     ['ENRICHING', 'IDLE'],
  ENRICHING:        ['EXECUTING', 'WAITING_ON_HUMAN'],
  EXECUTING:        ['REFLECT', 'VALIDATING', 'SELF_CORRECTING', 'WAITING_ON_HUMAN', 'STOPPED'],
  REFLECT:          ['SYNTHESIZE'],
  SYNTHESIZE:       ['ENRICH'],
  ENRICH:           ['PLAN'],
  PLAN:             ['EXECUTE', 'WAITING_ON_HUMAN'],
  EXECUTE:          ['VALIDATING', 'SELF_CORRECTING', 'WAITING_ON_HUMAN'],
  SELF_CORRECTING:  ['EXECUTING', 'WAITING_ON_HUMAN', 'STOPPED'],
  WAITING_ON_HUMAN: ['EXECUTING', 'STOPPED'],
  VALIDATING:       ['DELIVERING', 'WAITING_ON_HUMAN'],
  DELIVERING:       ['IDLE', 'STOPPED'],
  STOPPED:          [],
};

// Artifact types
export type ArtifactType =
  | 'CONFIDENCE_TRACE' | 'EXECUTION_DECISION' | 'WAITING_STATE'
  | 'LOOP_SIGNAL' | 'TRACE_RISK' | 'DRYRUN_PLANGRAPH' | 'DRYRUN_DELTA'
  | 'MEMORY_INFLUENCE' | 'DONECRITERIA_RESULT' | 'VALIDATION_SUMMARY'
  | 'BRANCH_INTEGRITY' | 'PREFLIGHT_IMPROVEMENT' | 'BLOCKER_SET'
  | 'ORCHESTRATOR_CYCLE' | 'SESSION_END_RECORD' | 'SCAN_RESULT'
  | 'OPPORTUNITY_SET' | 'SELF_CORRECTION_ATTEMPT' | 'TOOL_AUDIT'
  | 'STEERING_DECISION' | 'LIVING_SPEC';

export type ArtifactSeverity = 'info' | 'warning' | 'critical';

export interface ArtifactBase {
  artifact_id: string;
  artifact_type: ArtifactType;
  session_id: string;
  task_run_id?: string;
  turn_id: string;
  created_at: string;
  schema_version: string;
  severity?: ArtifactSeverity;
  summary: string;
  consumed_by?: string[];
  retained_until?: string;
  data: Record<string, unknown>;
}

export type WaitingReason =
  | 'low_confidence' | 'loop_detected' | 'integrity_fail'
  | 'self_correction_exhausted' | 'tool_unverifiable'
  | 'donecriteria_unverifiable' | 'branch_safety_violation'
  | 'checkpoint_restore_failed' | 'missing_risk_evidence' | 'policy_block';

export type HumanLayerApprovalType =
  | 'CRITICAL_PATH' | 'EXTERNAL_CALL' | 'DATA_ACCESS'
  | 'ESCALATION' | 'DELEGATION' | 'ACTION_APPROVAL' | 'TEXT_APPROVAL';

export interface RequiredInput {
  id: string;
  label: string;
  type: 'text' | 'choice' | 'confirm';
  options?: string[];
}

export interface WaitingStateArtifact extends ArtifactBase {
  reason: WaitingReason;
  expires_at: string;
  expiry_policy: 'escalate' | 'reroute' | 'stop';
  resume_target: string;
  required_inputs: RequiredInput[];
  humanlayer_approval_type: HumanLayerApprovalType;
  checkpoint_id: string;
  heartbeat_timestamp: string;
}

export interface Project {
  project_id: string;
  name: string;
  description: string;
  repo_url: string;
  session_count: number;
  last_active: string;
}

// Inline waiting-state embedded in a Session (used when state === 'WAITING_ON_HUMAN')
export interface WaitingStateInfo {
  reason: string;
  reason_code: string;
  expires_at: string;
  approval_type: HumanLayerApprovalType;
  human_layer_category: string;
  required_inputs: RequiredInput[];
  checkpoint_id?: string;
}

export interface Session {
  session_id: string;
  project_id: string;
  name: string;
  state: OrchestratorState;
  created_at: string;
  updated_at: string;
  autonomy_level: 'FULL' | 'BOUNDED' | 'HITL' | 'STOPPED';
  failure_budget: number;
  current_task?: string;
  history_hash: string;
  branch?: string;
  intent_locked?: boolean;
  metrics: {
    confidence: number;
    loop_rate: number;
    validation_pass_rate: number;
    tasks_completed: number;
  };
  waiting_state?: WaitingStateInfo;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'agent' | 'operator';
  content: string;
  created_at: string;
  artifact_refs?: string[];
  evidence_chips?: EvidenceChipData[];
}

export interface EvidenceChipData {
  artifact_id: string;
  artifact_type: ArtifactType;
  label: string;
  severity?: ArtifactSeverity;
  value?: string | number;
}

// ── Strongly-typed data shapes for key artifact types ───────────────────────

// VALIDATION_SUMMARY (ADR-0071 spec v3.0)
export interface TestSuite {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface ValidationSummaryData {
  validation_id: string;
  suites: {
    unit: TestSuite;
    integration: TestSuite;
    simulation: TestSuite;
    regression: TestSuite;
  };
  coverage: number;           // percentage 0–100
  all_passed: boolean;
  blocking_failures: string[];
  merge_ready: boolean;
  branch_safety: 'SAFE' | 'UNSAFE' | 'UNKNOWN';
  donecriteria_passed: boolean;
  manual_review_required: boolean;
}

// MEMORY_INFLUENCE (ADR-0071 spec v3.0)
export interface EpisodicRecall {
  run_id: string;
  task_similarity: number;
  outcome: 'SUCCESS' | 'FAILED';
  roi_metrics: { time_saved_ms: number; errors_prevented: number };
  applied_lessons: string[];
}

export interface PatternInjection {
  pattern_id: string;
  pattern_name: string;
  anti_pattern: boolean;
  confidence: number;
  injection_effect: string;
}

export interface MemoryInfluenceData {
  episodic_recalls: EpisodicRecall[];
  pattern_injections: PatternInjection[];
  total_influence_score: number;   // 0.0 – 1.0
  confidence_delta_from_memory: number;
}

// SESSION_END_RECORD (ADR-0071 spec v3.0)
export interface FitnessViolation {
  metric: string;
  threshold: number;
  actual: number;
}

export interface SessionEndRecordData {
  end_reason: 'SUCCESS' | 'FAILED' | 'ABORTED' | 'TIMEOUT' | 'OPERATOR_STOPPED';
  duration_ms: number;
  total_loop_count: number;
  total_tool_calls: number;
  total_human_interrupts: number;
  total_self_corrections: number;
  final_confidence: number;
  donecriteria_completion_rate: number;  // 0–100 %
  branch_merged: boolean;
  roi_metrics: {
    estimated_time_saved_ms: number;
    errors_prevented: number;
    suggestions_applied: number;
  };
  fitness_violations: FitnessViolation[];
  lessons_saved_to_memory: number;
}

// ── TaskFlowStep ─────────────────────────────────────────────────────────────

export interface TaskFlowStep {
  step_id: string;
  session_id: string;
  phase: OrchestratorState;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'done' | 'error' | 'waiting';
  created_at: string;
  artifact_ref?: string;
  duration_ms?: number;
}

export interface LogLine {
  id: string;
  session_id: string;
  timestamp: string;
  severity: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
}

export interface StorageItem {
  name: string;
  type: 'artifact' | 'step' | 'checkpoint';
  created_at: string;
  size_bytes: number;
  status: 'active' | 'archived' | 'consumed';
  artifact_type?: ArtifactType;
  download_url?: string;
}

// Steering intent (IntentPanel / Steering tab)
export interface SteeringIntent {
  id: string;
  session_id: string;
  goal: string;
  constraints: string[];
  submitted_at: string;
  status: 'pending' | 'applied' | 'rejected';
}

// AJV-validated artifact result
export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
}
