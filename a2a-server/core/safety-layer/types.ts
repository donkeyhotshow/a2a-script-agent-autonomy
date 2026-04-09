/**
 * Safety Layer types — ADR-0035
 *
 * Shared interfaces used by LoopDetector, ContextValidator, ConfidenceTracer
 * and the SafetyLayer orchestrator.
 */

// ── Lightweight artifact payloads (server-side, no frontend dependency) ────

export interface LOOP_SIGNAL {
  triple: [string, string, string];
  repeat_count: number;
  severity: 'info' | 'warning' | 'critical';
  downgrade_action?: 'pause' | 'stop';
}

export interface CONFIDENCE_TRACE {
  routing_point: string;
  confidence: number;
  gate_threshold: number;
  decision: 'proceed' | 'wait' | 'handoff' | 'stop' | 'downgrade';
  recommendation: 'PROCEED' | 'SELF_CORRECT' | 'WAIT_HUMAN' | 'ABORT';
  correction_attempts?: number;
  reason_code?: string;
}

export interface IntegrityResult {
  valid: boolean;
  expected_hash: string;
  actual_hash: string;
  context_size_bytes: number;
}

export interface WAITING_STATE {
  reason: string;
  reason_code: string;
  expires_at: string;
  approval_type: string;
  checkpoint_id: string;
  required_inputs?: Array<{
    id: string;
    label: string;
    type: 'text' | 'choice' | 'confirm';
    options?: string[];
  }>;
}

// ── Turn descriptor passed to SafetyLayer.intercept() ──────────────────────

export interface SafetyTurn {
  /** Reason string from the last InterruptDirective */
  interruptReason: string;
  /** Coarse outcome classification of the last LLM / transform cycle */
  outcomeClass: 'success' | 'fail' | 'partial' | 'noop';
  /** SHA-256 hex of the current serialised context */
  contextHash: string;
  /** Monotonically increasing turn counter within the session */
  turnId: string;
  /** Optional thinking-slot content extracted from the LLM output */
  thinkingSlot?: Record<string, unknown>;
  /** Full serialised context (used by ContextValidator) */
  context?: Record<string, unknown>;
}
