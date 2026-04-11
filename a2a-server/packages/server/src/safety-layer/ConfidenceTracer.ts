/**
 * ConfidenceTracer — ADR-0035 component 3
 *
 * Extracts a confidence value from the LLM thinking-slot and decides
 * whether to proceed, self-correct, wait for human, or abort.
 *
 * This is a lightweight *synchronous* implementation — no actual LLM sidecar
 * call is made here. In production a separate sidecar LLM can be wired in
 * by overriding `extractFromThinkingSlot`.
 */
import type { CONFIDENCE_TRACE, WAITING_STATE } from './types';

export interface ConfidenceConfig {
  /** Gate below which agent pauses and waits for human. Default: 0.65 */
  gate: number;
  /** After this many self-correction attempts, escalate to WAIT_HUMAN. Default: 3 */
  maxCorrectionAttempts: number;
  /** Time-to-live for waiting state in ms. Default: 3 600 000 (1 hour) */
  waitingTtlMs: number;
}

const DEFAULT_CONFIG: ConfidenceConfig = {
  gate: 0.65,
  maxCorrectionAttempts: 3,
  waitingTtlMs: 3_600_000,
};

export interface ConfidenceDecision {
  trace: CONFIDENCE_TRACE;
  waitingState?: WAITING_STATE;
}

export class ConfidenceTracer {
  private readonly config: ConfidenceConfig;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract confidence from the thinking slot and emit a CONFIDENCE_TRACE.
   * Returns a WAITING_STATE when the recommendation is WAIT_HUMAN.
   */
  trace(
    thinkingSlot: Record<string, unknown> | undefined,
    routingPoint: string,
    correctionAttempts = 0,
    sessionId?: string
  ): ConfidenceDecision {
    const confidence = this.extractFromThinkingSlot(thinkingSlot);
    const { gate, maxCorrectionAttempts, waitingTtlMs } = this.config;

    let recommendation: CONFIDENCE_TRACE['recommendation'];
    let decision: CONFIDENCE_TRACE['decision'];

    if (confidence >= gate) {
      recommendation = 'PROCEED';
      decision = 'proceed';
    } else if (correctionAttempts < maxCorrectionAttempts) {
      recommendation = 'SELF_CORRECT';
      decision = 'downgrade';
    } else {
      recommendation = 'WAIT_HUMAN';
      decision = 'wait';
    }

    const trace: CONFIDENCE_TRACE = {
      routing_point: routingPoint,
      confidence,
      gate_threshold: gate,
      decision,
      recommendation,
      correction_attempts: correctionAttempts,
      reason_code: confidence < gate ? 'below_confidence_gate' : undefined,
    };

    if (recommendation === 'WAIT_HUMAN') {
      const expiresAt = new Date(Date.now() + waitingTtlMs).toISOString();
      const waitingState: WAITING_STATE = {
        reason: `Confidence ${confidence.toFixed(2)} < gate ${gate} after ${correctionAttempts} correction attempt(s)`,
        reason_code: 'low_confidence',
        expires_at: expiresAt,
        approval_type: 'CRITICAL_PATH',
        checkpoint_id: `ckpt_${sessionId ?? 'unknown'}_${routingPoint}`,
      };
      return { trace, waitingState };
    }

    return { trace };
  }

  /**
   * Extract a numeric confidence in [0, 1] from the thinking slot.
   * Falls back to 0.5 if the slot is absent or malformed.
   */
  protected extractFromThinkingSlot(slot: Record<string, unknown> | undefined): number {
    if (!slot) return 0.5;

    // Common keys LLMs may use
    for (const key of ['confidence', 'confidence_score', 'certainty', 'score']) {
      const val = slot[key];
      if (typeof val === 'number' && val >= 0 && val <= 1) return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    }

    return 0.5;
  }
}
