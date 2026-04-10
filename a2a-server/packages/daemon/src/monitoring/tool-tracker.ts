/**
 * ToolTracker — ADR-0066: Tool performance tracking and adaptive routing.
 *
 * Storage strategy (ADR-0066 §persistence):
 *   Primary   — Redis sorted set per tool (key: `tool:calls:{tool_name}`,
 *               score = timestamp, member = JSON-encoded ToolCallRecord).
 *               Requires REDIS_URL env var (default: redis://localhost:6379).
 *               TTL = 7 days per key.
 *   Fallback  — In-memory Map (ring buffer, last 2 000 records per tool).
 *               Used automatically when Redis is unavailable.
 *
 * The tracker exposes:
 *   record()            — persist a single call record
 *   getProfile()        — compute performance stats for one tool
 *   getAllProfiles()     — stats for all tracked tools
 *   routingHints()      — scored recommendations for a candidate tool list
 *   getCallsForSession()— all calls belonging to a session
 */

import type { OrchestratorState } from '../core/orchestrator-kernel.js';
import { globalEventBus } from '../core/event-bus.js';
import { logger } from '@a2a/server-utils/logger.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ToolCallRecord {
  tool_name: string;
  session_id: string;
  timestamp: number;
  duration_ms: number;
  success: boolean;
  error_type?: 'timeout' | 'error' | 'invalid_output';
  input_token_count?: number;
  output_quality?: number;        // 0.0–1.0, estimated (0.5 default)
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

// ── Redis client type (dynamically imported) ──────────────────────────────────

interface RedisClient {
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]>;
  zremrangebyscore(key: string, min: string | number, max: string | number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

// ── Ring buffer (in-memory fallback) ─────────────────────────────────────────

const RING_SIZE = 2_000;

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

// ── Redis key helpers ─────────────────────────────────────────────────────────

const KEY_PREFIX = 'tool:calls:';
const TTL_SECONDS = 7 * 24 * 60 * 60;   // 7 days

function toolKey(toolName: string): string {
  return `${KEY_PREFIX}${toolName}`;
}

// ── Try to connect to Redis ───────────────────────────────────────────────────

async function tryConnectRedis(): Promise<RedisClient | null> {
  try {
    // Dynamic import so the module still loads when ioredis is absent
    const ioredis = await import('ioredis');
    const RedisConstructor = (ioredis.default ?? ioredis) as unknown as new (url: string) => RedisClient;
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    const client = new RedisConstructor(url);
    // Probe with a harmless command
    await (client as unknown as { ping(): Promise<string> }).ping();
    return client;
  } catch (err: unknown) {
    logger.debug('[ToolTracker] Redis connect/ping failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ── ToolTracker ───────────────────────────────────────────────────────────────

export class ToolTracker {
  private redis: RedisClient | null = null;
  private readonly memory = new Map<string, RingBuffer<ToolCallRecord>>();
  private readonly initPromise: Promise<void>;

  constructor() {
    this.initPromise = tryConnectRedis().then((client) => {
      if (client) {
        this.redis = client;
      }
    });

    // Subscribe to TOOL_RESULT events from the EventBus for automatic tracking
    globalEventBus.subscribe<ToolCallRecord>('TOOL_RESULT', (event) => {
      setImmediate(() => { this.record(event.payload); });
    });
  }

  // ── record() ──────────────────────────────────────────────────────────────

  /**
   * Record a tool call result. Redis write is fire-and-forget; falls back to
   * in-memory immediately so callers need not await.
   */
  record(call: ToolCallRecord): void {
    void this._recordAsync(call);
  }

  private async _recordAsync(call: ToolCallRecord): Promise<void> {
    await this.initPromise;

    if (this.redis) {
      try {
        const key = toolKey(call.tool_name);
        const member = JSON.stringify(call);
        await this.redis.zadd(key, call.timestamp, member);
        // Trim to last MAX_RECORDS_PER_TOOL entries by removing the oldest
        const cutoffScore = call.timestamp - (TTL_SECONDS * 1_000);
        await this.redis.zremrangebyscore(key, '-inf', cutoffScore);
        await this.redis.expire(key, TTL_SECONDS);
        return;
      } catch (err) {
        // Redis error — fall through to in-memory
        console.warn('[ToolTracker] Redis write failed, using in-memory fallback:', err);
        this.redis = null;
      }
    }

    // In-memory fallback
    let buf = this.memory.get(call.tool_name);
    if (!buf) {
      buf = new RingBuffer<ToolCallRecord>();
      this.memory.set(call.tool_name, buf);
    }
    buf.push(call);
  }

  // ── getCallsForTool() ─────────────────────────────────────────────────────

  private async getCallsForTool(toolName: string): Promise<ToolCallRecord[]> {
    await this.initPromise;

    if (this.redis) {
      try {
        const members = await this.redis.zrangebyscore(
          toolKey(toolName), '-inf', '+inf',
        );
        return members.map((m) => JSON.parse(m) as ToolCallRecord);
      } catch (err) {
        console.warn('[ToolTracker] Redis read failed, using in-memory fallback:', err);
        this.redis = null;
      }
    }

    const buf = this.memory.get(toolName);
    return buf ? buf.toArray() : [];
  }

  // ── getProfile() ──────────────────────────────────────────────────────────

  /**
   * Compute the performance profile for a specific tool.
   * Returns null if the tool has never been called.
   */
  async getProfile(toolName: string): Promise<ToolPerformanceProfile | null> {
    const calls = await this.getCallsForTool(toolName);
    if (calls.length === 0) return null;
    return this._buildProfile(toolName, calls);
  }

  // ── getAllProfiles() ───────────────────────────────────────────────────────

  /**
   * Return profiles for all tracked tools.
   */
  async getAllProfiles(): Promise<ToolPerformanceProfile[]> {
    await this.initPromise;

    let toolNames: string[] = [];

    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${KEY_PREFIX}*`);
        toolNames = keys.map((k) => k.slice(KEY_PREFIX.length));
      } catch (err: unknown) {
        logger.warn('[ToolTracker] Redis keys() failed, falling back to in-memory', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.redis = null;
      }
    }

    if (!this.redis) {
      toolNames = [...this.memory.keys()];
    }

    const profiles = await Promise.all(
      toolNames.map((name) => this.getProfile(name)),
    );
    return profiles.filter((p): p is ToolPerformanceProfile => p !== null);
  }

  // ── routingHints() ────────────────────────────────────────────────────────

  /**
   * Given a list of candidate tool names and the current FSM state,
   * return routing hints sorted by recommendation score (highest first).
   * Tools with no history get a neutral score of 0.5.
   */
  async routingHints(
    candidates: string[],
    fsmState: OrchestratorState,
  ): Promise<ToolRoutingHint[]> {
    const hints = await Promise.all(
      candidates.map(async (name) => {
        const profile = await this.getProfile(name);
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
      }),
    );
    return hints.sort((a, b) => b.score - a.score);
  }

  // ── getCallsForSession() ──────────────────────────────────────────────────

  /**
   * Return all recorded calls for a session, across all tools.
   */
  async getCallsForSession(sessionId: string): Promise<ToolCallRecord[]> {
    const profiles = await this.getAllProfiles();
    const toolNames = profiles.map((p) => p.tool_name);

    const allCalls = await Promise.all(
      toolNames.map((name) => this.getCallsForTool(name)),
    );

    return allCalls
      .flat()
      .filter((c) => c.session_id === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
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
      calls.reduce((s, c) => s + (c.output_quality ?? 0.5), 0) / Math.max(total, 1);

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

// ── Singletons ────────────────────────────────────────────────────────────────

/**
 * Process-singleton ToolTracker. Import and use directly:
 *
 * ```ts
 * import { toolTracker } from './monitoring/tool-tracker.js';
 * await toolTracker.record({ tool_name: 'read-file', ... });
 * const hints = await toolTracker.routingHints(['read-file', 'rag-search'], 'SCANNING');
 * ```
 */
export const toolTracker = new ToolTracker();

/** @deprecated Use toolTracker instead */
export const globalToolTracker = toolTracker;
