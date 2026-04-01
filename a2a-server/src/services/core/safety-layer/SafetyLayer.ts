/**
 * SafetyLayer — ADR-0035
 *
 * Intercept hook that sits between extractInterrupt() and applyInterrupt()
 * in GrayRoomOrchestrator.runLoop(). Three deterministic components run in
 * priority order (cheapest first):
 *
 *   1. ContextValidator  (SHA-256, CPU-only, < 1 ms) — synchronous
 *   2. LoopDetector      (Map lookup, < 1 ms)         — synchronous
 *   3. ConfidenceTracer  (extracts from thinkingSlot) — synchronous*
 *      * A real LLM sidecar call can be added by subclassing ConfidenceTracer
 *
 * Pipeline:
 *   request.json → … → extractInterrupt()
 *                     → SafetyLayer.intercept()  ← YOU ARE HERE
 *                     → applyInterrupt()          (only when decision === 'continue')
 */
import { LoopDetector } from './LoopDetector.js';
import { ContextValidator } from './ContextValidator.js';
import { ConfidenceTracer } from './ConfidenceTracer.js';
import type { LOOP_SIGNAL, CONFIDENCE_TRACE, IntegrityResult, WAITING_STATE, SafetyTurn } from './types.js';

export type InterceptDecision =
  | { decision: 'continue' }
  | { decision: 'interrupt'; kind: 'loop'; signal: LOOP_SIGNAL }
  | { decision: 'stop'; kind: 'integrity'; result: IntegrityResult }
  | { decision: 'wait'; kind: 'confidence'; waitingState: WAITING_STATE; trace: CONFIDENCE_TRACE };

export interface SafetyLayerOptions {
  /** Skip ContextValidator check (useful in tests). Default: false */
  skipIntegrityCheck?: boolean;
  /** Only run ConfidenceTracer when thinkingSlot is present. Default: true */
  requireThinkingSlot?: boolean;
}

export class SafetyLayer {
  private readonly loopDetector: LoopDetector;
  private readonly contextValidator: ContextValidator;
  private readonly confidenceTracer: ConfidenceTracer;
  private readonly opts: Required<SafetyLayerOptions>;

  constructor(opts: SafetyLayerOptions = {}) {
    this.loopDetector = new LoopDetector();
    this.contextValidator = new ContextValidator();
    this.confidenceTracer = new ConfidenceTracer();
    this.opts = {
      skipIntegrityCheck: false,
      requireThinkingSlot: true,
      ...opts,
    };
  }

  /**
   * Intercept a turn after extractInterrupt(), before applyInterrupt().
   *
   * Returns:
   *   { decision: 'continue' }         — safe to call applyInterrupt()
   *   { decision: 'interrupt', ... }   — loop detected; log and re-enter wait state
   *   { decision: 'stop', ... }        — context integrity violated; hard stop
   *   { decision: 'wait', ... }        — confidence below gate; request human approval
   */
  intercept(turn: SafetyTurn, sessionId?: string): InterceptDecision {
    // ── 1. Context integrity (fastest, runs first) ─────────────────────────
    if (!this.opts.skipIntegrityCheck && turn.context) {
      const integrity = this.contextValidator.validate(turn.context, turn.contextHash);
      if (!integrity.valid) {
        return { decision: 'stop', kind: 'integrity', result: integrity };
      }
    }

    // ── 2. Loop detection ──────────────────────────────────────────────────
    const loopSignal = this.loopDetector.check(
      turn.interruptReason,
      turn.outcomeClass,
      turn.contextHash,
      turn.turnId
    );

    if (loopSignal?.severity === 'critical') {
      return { decision: 'interrupt', kind: 'loop', signal: loopSignal };
    }

    // ── 3. Confidence tracing (only when thinking slot is available) ───────
    const hasThinkingSlot = !!turn.thinkingSlot && Object.keys(turn.thinkingSlot).length > 0;
    if (hasThinkingSlot || !this.opts.requireThinkingSlot) {
      const { trace, waitingState } = this.confidenceTracer.trace(
        turn.thinkingSlot,
        turn.interruptReason,
        0,   // correction_attempts: caller should track and pass in
        sessionId
      );

      if (waitingState) {
        return { decision: 'wait', kind: 'confidence', waitingState, trace };
      }
    }

    return { decision: 'continue' };
  }

  /** Reset per-session state (call when a new session starts). */
  resetSession(): void {
    this.loopDetector.reset();
  }
}
