/**
 * registry-v2.ts — ADR-0058/0059: Dynamic Agent Registry
 *
 * In-memory registry with Redis-compatible key semantics (Redis is optional;
 * the store falls back to a local Map when REDIS_URL is not set so the server
 * starts cleanly in dev / CI without a Redis instance).
 *
 * Key design points:
 *  - `register(reg)` → stores agent metadata + adds to active set
 *  - `routeTask(caps)` → least-loaded agent whose caps intersect the request
 *  - `heartbeat(id)` → resets health clock; called by agents every 15 s
 *  - `health()` → returns AgentHealthMap (online / draining / total counts)
 *  - Background poller drains agents whose last heartbeat is > 30 s old
 */

import { logger } from '../../utils/logger.js';

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface AgentRegistration {
  /** Unique stable identifier, e.g. "worker-7" */
  agentId: string;
  /** Capability tags, e.g. ["code_review", "typescript"] */
  caps: string[];
  /** WebSocket or HTTP endpoint the agent listens on */
  endpoint: string;
  /** Optional health-probe URL */
  healthEndpoint?: string;
  /** Maximum concurrent tasks (used for load scoring) */
  maxLoad?: number;
}

export type AgentHealth = 'online' | 'draining' | 'offline';

export interface AgentRecord extends Required<AgentRegistration> {
  health: AgentHealth;
  /** Number of tasks currently assigned */
  load: number;
  /** Unix ms of last successful heartbeat */
  heartbeat: number;
}

export interface RouteDecision {
  agentId: string;
  endpoint: string;
  /** 0.0–1.0 — fraction of requested caps covered by agent */
  capsMatch: number;
  /** Normalised load score: load / maxLoad (lower = better) */
  loadScore: number;
  reason: 'capability_match' | 'least_loaded';
}

export interface RegistryHealthSummary {
  online: number;
  draining: number;
  offline: number;
  total: number;
  /** Per-agent detail map */
  agents: Record<string, Pick<AgentRecord, 'health' | 'load' | 'heartbeat' | 'caps'>>;
}

// ── Internal constants ────────────────────────────────────────────────────────

/** Agent is considered unhealthy after this many ms without a heartbeat */
const HEARTBEAT_TTL_MS = 30_000;

/** How often the drain poller runs */
const POLL_INTERVAL_MS = 15_000;

const DEFAULT_MAX_LOAD = 10;

// ── Registry implementation ───────────────────────────────────────────────────

class AgentRegistryV2 {
  private readonly agents = new Map<string, AgentRecord>();
  private pollerHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startPoller();
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Register or re-register an agent.  Re-registration resets health to
   * 'online' and updates all fields.
   */
  register(reg: AgentRegistration): AgentRecord {
    const existing = this.agents.get(reg.agentId);
    const record: AgentRecord = {
      agentId: reg.agentId,
      caps: reg.caps,
      endpoint: reg.endpoint,
      healthEndpoint: reg.healthEndpoint ?? '',
      maxLoad: reg.maxLoad ?? DEFAULT_MAX_LOAD,
      health: 'online',
      load: existing?.load ?? 0,
      heartbeat: Date.now(),
    };
    this.agents.set(reg.agentId, record);
    logger.info('[RegistryV2] Agent registered', { agentId: reg.agentId, caps: reg.caps });
    return record;
  }

  /**
   * Update the heartbeat timestamp for an agent, restoring it to 'online'.
   * No-op if the agent is unknown.
   */
  heartbeat(agentId: string): boolean {
    const rec = this.agents.get(agentId);
    if (!rec) return false;
    rec.heartbeat = Date.now();
    rec.health = 'online';
    return true;
  }

  /**
   * Increment load counter when a task is dispatched to an agent.
   */
  incrementLoad(agentId: string): void {
    const rec = this.agents.get(agentId);
    if (rec) rec.load = Math.min(rec.load + 1, rec.maxLoad);
  }

  /**
   * Decrement load counter when a task completes.
   */
  decrementLoad(agentId: string): void {
    const rec = this.agents.get(agentId);
    if (rec) rec.load = Math.max(rec.load - 1, 0);
  }

  /**
   * Explicitly drain an agent — stops new tasks being routed to it.
   */
  drain(agentId: string): boolean {
    const rec = this.agents.get(agentId);
    if (!rec) return false;
    rec.health = 'draining';
    logger.info('[RegistryV2] Agent draining', { agentId });
    return true;
  }

  /**
   * Remove an agent from the registry entirely.
   */
  deregister(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) logger.info('[RegistryV2] Agent deregistered', { agentId });
    return removed;
  }

  // ── Routing ───────────────────────────────────────────────────────────────

  /**
   * Route a task to the best available agent.
   *
   * Selection algorithm:
   *  1. Filter to 'online' agents only.
   *  2. Score each by (caps overlap) + (1 - normalised load).
   *  3. Return the highest-scoring agent.
   *
   * Returns null when no healthy agent is available.
   */
  routeTask(caps: string[]): RouteDecision | null {
    const candidates = Array.from(this.agents.values()).filter(
      (a) => a.health === 'online',
    );

    if (candidates.length === 0) return null;

    const capSet = new Set(caps);

    const scored = candidates.map((agent) => {
      const matchCount = agent.caps.filter((c) => capSet.has(c)).length;
      const capsMatch = caps.length > 0 ? matchCount / caps.length : 1;
      const loadScore = agent.load / agent.maxLoad;
      const totalScore = capsMatch + (1 - loadScore);
      return { agent, capsMatch, loadScore, totalScore };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    const best = scored[0];
    if (!best) return null;

    return {
      agentId: best.agent.agentId,
      endpoint: best.agent.endpoint,
      capsMatch: best.capsMatch,
      loadScore: best.loadScore,
      reason: best.capsMatch > 0 ? 'capability_match' : 'least_loaded',
    };
  }

  // ── Health reporting ──────────────────────────────────────────────────────

  health(): RegistryHealthSummary {
    const all = Array.from(this.agents.values());
    const counts = { online: 0, draining: 0, offline: 0 };
    const agents: RegistryHealthSummary['agents'] = {};

    for (const a of all) {
      counts[a.health]++;
      agents[a.agentId] = {
        health: a.health,
        load: a.load,
        heartbeat: a.heartbeat,
        caps: a.caps,
      };
    }

    return { ...counts, total: all.length, agents };
  }

  // ── Background health poller ──────────────────────────────────────────────

  /**
   * Every POLL_INTERVAL_MS:
   *  - Agents with no heartbeat for > HEARTBEAT_TTL_MS → 'draining'
   *  - Draining agents with load = 0 and stale heartbeat for > 2× TTL → 'offline'
   */
  private startPoller(): void {
    if (this.pollerHandle) return;
    this.pollerHandle = setInterval(() => this.runHealthCheck(), POLL_INTERVAL_MS);
    // Allow Node.js to exit even if poller is running
    if (typeof this.pollerHandle === 'object' && this.pollerHandle !== null) {
      (this.pollerHandle as ReturnType<typeof setInterval> & { unref?: () => void }).unref?.();
    }
  }

  private runHealthCheck(): void {
    const now = Date.now();
    for (const rec of this.agents.values()) {
      const age = now - rec.heartbeat;
      if (rec.health === 'online' && age > HEARTBEAT_TTL_MS) {
        rec.health = 'draining';
        logger.warn('[RegistryV2] Agent auto-drained (heartbeat timeout)', {
          agentId: rec.agentId,
          ageMs: age,
        });
      } else if (rec.health === 'draining' && rec.load === 0 && age > HEARTBEAT_TTL_MS * 2) {
        rec.health = 'offline';
        logger.info('[RegistryV2] Agent marked offline', { agentId: rec.agentId });
      }
    }
  }

  /** Stop the background poller (for tests / shutdown). */
  stopPoller(): void {
    if (this.pollerHandle) {
      clearInterval(this.pollerHandle);
      this.pollerHandle = null;
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const agentRegistry = new AgentRegistryV2();
