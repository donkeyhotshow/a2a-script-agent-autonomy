/**
 * AutonomyGlue — Integration helper that wires the autonomy layer together.
 *
 * Provides a single `shouldContinue()` decision point consumed by the
 * request processor before advancing to the next FSM state.
 *
 * Design:
 *   1. Check latest safety intercept result for the session
 *   2. Query tool routing hints for the current FSM state
 *   3. Ask EventBus whether a SAFETY_INTERCEPT was recently emitted
 *   4. Return a typed AutonomyDecision
 *
 * Usage:
 * ```ts
 * const ok = await AutonomyGlue.shouldContinue(sessionId, 'EXECUTING');
 * if (!ok) return; // block transition
 * ```
 */

import type { OrchestratorState } from './core/orchestrator-kernel';
import { globalEventBus } from './core/event-bus';
import { globalToolTracker } from './monitoring/tool-tracker';

// ── Public types ──────────────────────────────────────────────────────────────

export type AutonomyAction = 'CONTINUE' | 'WAIT' | 'ABORT';

export interface AutonomyDecision {
  action: AutonomyAction;
  reason: string;
  tool_hints: { tool_name: string; score: number }[];
  safety_clear: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** How far back to look for SAFETY_INTERCEPT events (ms) */
const SAFETY_WINDOW_MS = 30_000;

/** Tools considered in every routing hint query */
const DEFAULT_CANDIDATE_TOOLS = [
  'read-file',
  'write-file',
  'rag-search',
  'mcp-call',
  'script',
] as const;

// ── AutonomyGlue ──────────────────────────────────────────────────────────────

export class AutonomyGlue {
  /**
   * Primary decision gate: should the agent continue into the next FSM state?
   *
   * Returns false when:
   *   - A SAFETY_INTERCEPT event with decision !== 'continue' was emitted
   *     in the last 30 s for this session
   *   - No viable tools are available (all routing hints score < 0.1)
   */
  static async shouldContinue(
    sessionId: string,
    fsmState: OrchestratorState,
  ): Promise<boolean> {
    const decision = await AutonomyGlue.decide(sessionId, fsmState);
    return decision.action === 'CONTINUE';
  }

  /**
   * Full decision with reasoning, tool hints, and safety status.
   */
  static async decide(
    sessionId: string,
    fsmState: OrchestratorState,
  ): Promise<AutonomyDecision> {
    // ── 1. Safety check ────────────────────────────────────────────────────
    const safetyClear = AutonomyGlue._isSafetyClear(sessionId);

    if (!safetyClear) {
      return {
        action: 'ABORT',
        reason: 'Recent SAFETY_INTERCEPT detected — aborting transition.',
        tool_hints: [],
        safety_clear: false,
      };
    }

    // ── 2. Tool hints ──────────────────────────────────────────────────────
    const hints = await globalToolTracker.routingHints(
      DEFAULT_CANDIDATE_TOOLS as unknown as string[],
      fsmState,
    );

    const viableHints = hints.filter((h) => h.score >= 0.1);

    if (viableHints.length === 0 && hints.length > 0) {
      return {
        action: 'WAIT',
        reason: 'All tools have low performance scores — waiting for recovery.',
        tool_hints: hints,
        safety_clear: true,
      };
    }

    // ── 3. CONTINUE ────────────────────────────────────────────────────────
    return {
      action: 'CONTINUE',
      reason: `Safety clear, ${viableHints.length}/${hints.length} tools viable for ${fsmState}.`,
      tool_hints: viableHints,
      safety_clear: true,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Returns true if no non-continue SAFETY_INTERCEPT event was published
   * for this session within the safety window.
   */
  private static _isSafetyClear(sessionId: string): boolean {
    const fromTs = Date.now() - SAFETY_WINDOW_MS;
    const recentEvents = globalEventBus.replay(sessionId, fromTs);

    for (const evt of recentEvents) {
      if (evt.type === 'SAFETY_INTERCEPT') {
        const payload = evt.payload as { decision?: string } | null;
        if (payload && payload.decision && payload.decision !== 'continue') {
          return false;
        }
      }
    }
    return true;
  }
}
