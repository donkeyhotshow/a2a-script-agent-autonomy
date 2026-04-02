/**
 * ToolTracker — ADR-0066: Tool performance tracking and adaptive routing.
 *
 * Records every tool call so the agent can:
 *   1. Identify tools that fail most often
 *   2. Prefer alternative tools in similar FSM states
 *   3. Surface p95 latency regressions before they cascade
 *
 * Persisted in-memory (ring buffer, last 2000 records per tool).
 * Designed to be queried by PromptRouter to influence routing decisions.
 */

import type { OrchestratorState } from '../core/orchestrator-kernel.js';
import { globalEventBus } from '../core/event-bus.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ToolCallRecord {
  tool_name: string;
  session_id: string;
  timestamp: number;
  duration_ms: number;
  success: boolean;
  error_type?: 'timeout' | 'error' | 'invalid_output';
  input_token_count: number;
  output_quality: number;       // 0.0–1.0, estimated (0.5 default)
  fsm_state: OrchestratorState;
}

export interface ToolPerformanceProfile {
  tool_name: string;
  total_calls: number;
  success_rate: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  common_error_types: Record<string, number>;
  quality_avg: number;
  state_success_rates: Partial<Record<OrchestratorState, number>>;
  recommendation: 'prefer' | 'neutral' | 'avoid';
  last_updated: number;
}

export interface ToolRoutingHint {
  tool_name: string;
  score: number;              // 0.0–1.0, higher = more recommended
  reason: string;
}

// ── Ring buffer ───────────────────────────────────────────────────────────────

const RING_SIZE = 2000;

class RingBuffer<T> {
  private readonly buf: T[] = [];
  private head = 0;
  private count = 0;

  push(item: T): void {
    if (this.count < RING_SIZE) {
      this.buf.push(item);
      this.count++;
    } else {
      this.buf[this.head] = item;
      this.head = (this.head + 1) % RING_SIZE;
    }
  }

  toArray(): T[] {
    if (this.count < RING_SIZE) return this.buf.slice();
    return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
  }

  get length(): number {
    return this.count;
  }
}

// ── ToolTracker ───────────────────────────────────────────────────────────────

export class ToolTracker {
  /** Per-tool call records */
  private readonly records = new Map<string, RingBuffer<ToolCallRecord>>();

  constructor() {
    // Subscribe to TOOL_RESULT events from the EventBus for automatic tracking
    globalEventBus.subscribe<ToolCallRecord>('TOOL_RESULT', (event) => {
      setImmediate(() => this.record(event.payload));
    });
  }

  // ── record() ──────────────────────────────────────────────────────────────

  /**
   * Record a tool call result. Called directly OR via EventBus subscription.
   */
  record(call: ToolCallRecord): void {
    let buf = this.records.get(call.tool_name);
    if (!buf) {
      buf = new RingBuffer<ToolCallRecord>();
      this.records.set(call.tool_name, buf);
    }
    buf.push(call);
  }

  // ── getProfile() ──────────────────────────────────────────────────────────

  /**
   * Compute the performance profile for a specific tool.
   * Returns null if the tool has never been called.
   */
  getProfile(toolName: string): ToolPerformanceProfile | null {
    const buf = this.records.get(toolName);
    if (!buf || buf.length === 0) return null;

    const calls = buf.toArray();
    return this._buildProfile(toolName, calls);
  }

  // ── getAllProfiles() ───────────────────────────────────────────────────────

  /**
   * Return profiles for all tracked tools.
   */
  getAllProfiles(): ToolPerformanceProfile[] {
    const profiles: ToolPerformanceProfile[] = [];
    for (const [name, buf] of this.records) {
      if (buf.length > 0) {
        profiles.push(this._buildProfile(name, buf.toArray()));
      }
    }
    return profiles;
  }

  // ── routingHints() ────────────────────────────────────────────────────────

  /**
   * Given a list of candidate tool names and the current FSM state,
   * return routing hints sorted by recommendation score (highest first).
   * Tools with no history get a neutral score of 0.5.
   */
  routingHints(
    candidates: string[],
    fsmState: OrchestratorState,
  ): ToolRoutingHint[] {
    return candidates
      .map((name) => {
        const profile = this.getProfile(name);
        if (!profile) {
          return { tool_name: name, score: 0.5, reason: 'No performance history.' };
        }

        const stateRate = profile.state_success_rates[fsmState];
        const rate = stateRate !== undefined ? stateRate : profile.success_rate;
        const latencyPenalty = Math.min(profile.p95_duration_ms / 30_000, 0.3);
        const score = Math.max(0, rate - latencyPenalty);

        return {
          tool_name: name,
          score,
          reason:
            `success_rate=${(rate * 100).toFixed(0)}%, ` +
            `p95=${profile.p95_duration_ms}ms, ` +
            `recommendation=${profile.recommendation}`,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ── getCallsForSession() ──────────────────────────────────────────────────

  /**
   * Return all recorded calls for a session, across all tools.
   */
  getCallsForSession(sessionId: string): ToolCallRecord[] {
    const results: ToolCallRecord[] = [];
    for (const buf of this.records.values()) {
      for (const call of buf.toArray()) {
        if (call.session_id === sessionId) results.push(call);
      }
    }
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _buildProfile(toolName: string, calls: ToolCallRecord[]): ToolPerformanceProfile {
    const total = calls.length;
    const successes = calls.filter((c) => c.success);
    const successRate = total > 0 ? successes.length / total : 0;

    const durations = calls.map((c) => c.duration_ms).sort((a, b) => a - b);
    const avgDuration = durations.reduce((s, v) => s + v, 0) / Math.max(total, 1);
    const p95Index = Math.floor(total * 0.95);
    const p95Duration = durations[Math.min(p95Index, total - 1)] ?? 0;

    const errorTypes: Record<string, number> = {};
    for (const call of calls) {
      if (!call.success && call.error_type) {
        errorTypes[call.error_type] = (errorTypes[call.error_type] ?? 0) + 1;
      }
    }

    const qualityAvg =
      calls.reduce((s, c) => s + c.output_quality, 0) / Math.max(total, 1);

    // Per-state success rates
    const stateMap: Partial<Record<OrchestratorState, { success: number; total: number }>> = {};
    for (const call of calls) {
      const s = stateMap[call.fsm_state] ?? { success: 0, total: 0 };
      s.total++;
      if (call.success) s.success++;
      stateMap[call.fsm_state] = s;
    }
    const stateSuccessRates: Partial<Record<OrchestratorState, number>> = {};
    for (const [state, stat] of Object.entries(stateMap)) {
      if (stat) {
        stateSuccessRates[state as OrchestratorState] = stat.success / stat.total;
      }
    }

    const recommendation: 'prefer' | 'neutral' | 'avoid' =
      successRate >= 0.9 && p95Duration < 5_000
        ? 'prefer'
        : successRate < 0.5 || p95Duration > 20_000
        ? 'avoid'
        : 'neutral';

    return {
      tool_name: toolName,
      total_calls: total,
      success_rate: successRate,
      avg_duration_ms: Math.round(avgDuration),
      p95_duration_ms: p95Duration,
      common_error_types: errorTypes,
      quality_avg: qualityAvg,
      state_success_rates: stateSuccessRates,
      recommendation,
      last_updated: calls[total - 1]?.timestamp ?? Date.now(),
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Process-singleton ToolTracker. Import and use directly:
 *
 * ```ts
 * import { globalToolTracker } from './monitoring/tool-tracker.js';
 * globalToolTracker.record({ tool_name: 'read-file', ... });
 * const hints = globalToolTracker.routingHints(['read-file', 'rag-search'], 'SCANNING');
 * ```
 */
export const globalToolTracker = new ToolTracker();
