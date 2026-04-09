/**
 * LoopDetector — ADR-0035 component 1
 *
 * Detects repeated (interruptReason, outcomeClass, contextHash) triples.
 * CPU-only, < 1 ms per check via Map lookup.
 */
import type { LOOP_SIGNAL } from './types.js';

interface HistoryEntry {
  count: number;
  lastTurnId: string;
}

/** Triples that fire a warning before escalating to critical. */
const WARNING_THRESHOLD = 2;
/** Triples at this count trigger a CRITICAL LOOP_SIGNAL. */
const CRITICAL_THRESHOLD = 3;

export class LoopDetector {
  private readonly history = new Map<string, HistoryEntry>();

  /**
   * Record a turn and check for looping patterns.
   *
   * @returns LOOP_SIGNAL if a loop was detected, null otherwise.
   */
  check(
    interruptReason: string,
    outcomeClass: string,
    contextHash: string,
    turnId: string
  ): LOOP_SIGNAL | null {
    // Build a canonical triple key — order matters for identity
    const key = `${interruptReason}|${outcomeClass}|${contextHash}`;
    const existing = this.history.get(key);
    const count = (existing?.count ?? 0) + 1;
    this.history.set(key, { count, lastTurnId: turnId });

    if (count >= CRITICAL_THRESHOLD) {
      return {
        triple: [interruptReason, outcomeClass, contextHash],
        repeat_count: count,
        severity: 'critical',
        downgrade_action: 'stop',
      };
    }

    if (count >= WARNING_THRESHOLD) {
      return {
        triple: [interruptReason, outcomeClass, contextHash],
        repeat_count: count,
        severity: 'warning',
        downgrade_action: 'pause',
      };
    }

    return null;
  }

  /** Reset all history (call at session start). */
  reset(): void {
    this.history.clear();
  }

  /** Return current size for observability. */
  get size(): number {
    return this.history.size;
  }
}
