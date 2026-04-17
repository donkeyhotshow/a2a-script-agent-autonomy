/**
 * EventBus — ADR-0063: Internal typed event bus for decoupled agent services.
 *
 * In-process only (no network). Designed for < 0.05 ms publish latency.
 * Each session keeps a circular buffer of the last 500 events for causal replay.
 *
 * Wiring points (callers register themselves):
 *   OrchestratorKernel  → publish FSM_TRANSITION
 *   ArtifactStore       → publish ARTIFACT_WRITTEN
 *   SafetyLayer         → publish SAFETY_INTERCEPT
 *   AutonomousDecision  → publish DECISION_MADE
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';

// ── Public event types ────────────────────────────────────────────────────────

export type AgentEventType =
  | 'FSM_TRANSITION'
  | 'ARTIFACT_WRITTEN'
  | 'REASONING_COMPLETE'
  | 'GOAL_UPDATED'
  | 'MEMORY_RECALLED'
  | 'DRIFT_DETECTED'
  | 'DECISION_MADE'
  | 'TOOL_RESULT'
  | 'SAFETY_INTERCEPT'
  | 'SESSION_ENDED'
  | 'OPERATOR_STOP';

export interface AgentEvent<T = unknown> {
  id: string;
  type: AgentEventType;
  session_id: string;
  timestamp: number;
  payload: T;
  correlation_id?: string;
}

// ── Subscription handler ──────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (event: AgentEvent<T>) => void;

/** Returns an unsubscribe function */
export type Unsubscribe = () => void;

// ── Circular buffer ───────────────────────────────────────────────────────────

const BUFFER_SIZE = 500;

class CircularBuffer {
  private readonly buf: AgentEvent[] = [];
  private head = 0;
  private count = 0;
  private lastAccessed: number = 0;

  push(event: AgentEvent): void {
    if (this.count < BUFFER_SIZE) {
      this.buf.push(event);
      this.count++;
    } else {
      this.buf[this.head] = event;
      this.head = (this.head + 1) % BUFFER_SIZE;
    }
    this.lastAccessed = Date.now();
  }

  /** Returns all stored events in insertion order */
  toArray(): AgentEvent[] {
    this.lastAccessed = Date.now();
    if (this.count < BUFFER_SIZE) {
      return this.buf.slice();
    }
    const tail = this.buf.slice(this.head);
    const head = this.buf.slice(0, this.head);
    return [...tail, ...head];
  }

  /** Get the timestamp of when the buffer was last accessed */
  getLastAccessed(): number {
    return this.lastAccessed;
  }
}

// ── EventBus ────────────────────────────────────────────────────────────────

export class EventBus {
  private readonly emitter = new EventEmitter();
  /** Per-session circular buffers */
  private readonly buffers = new Map<string, CircularBuffer>();
  /** Maximum time (in ms) a buffer can be idle before being eligible for cleanup */
  private static readonly MAX_IDLE_TIME_MS = 60 * 60 * 1000; // 1 hour
  /** Maximum number of session buffers to keep in memory */
  private static readonly MAX_BUFFERS = 1000;

  constructor() {
    // Allow many listeners per event type (one per service)
    this.emitter.setMaxListeners(100);
  }

  // ── publish() ──────────────────────────────────────────────────────────────

  /**
   * Publish an event. Runs synchronously < 0.05 ms for in-process delivery.
   * Async handlers are wrapped in setImmediate to avoid blocking the caller.
   */
  publish<T>(event: Omit<AgentEvent<T>, 'id' | 'timestamp'>): AgentEvent<T> {
    const full: AgentEvent<T> = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...event,
    };

    // Buffer for replay
    this._getBuffer(full.session_id).push(full as AgentEvent);

    // Emit synchronously; async handlers MUST be wrapped by the subscriber
    this.emitter.emit(full.type, full);

    return full;
  }

  // ── subscribe() ───────────────────────────────────────────────────────────

  /**
   * Subscribe to a specific event type. No wildcard subscriptions.
   * Returns an unsubscribe function.
   *
   * Async handlers: wrap your handler body in setImmediate or promise to
   * avoid blocking the publish() caller:
   *
   * ```ts
   * bus.subscribe('ARTIFACT_WRITTEN', (evt) => {
   *   setImmediate(() => processAsync(evt));
   * });
   * ```
   */
  subscribe<T = unknown>(
    type: AgentEventType,
    handler: EventHandler<T>,
  ): Unsubscribe {
    const listener = handler as EventHandler;
    this.emitter.on(type, listener);
    return () => this.emitter.off(type, listener);
  }


  // ── replay() ────────────────────────────────────────────────────────────

  /**
   * Return all buffered events for a session, ordered chronologically,
   * optionally filtered to events after fromTimestamp.
   */
  replay(sessionId: string, fromTimestamp?: number): AgentEvent[] {
    const all = this._getBuffer(sessionId).toArray();
    if (fromTimestamp === undefined) return all;
    return all.filter((e) => e.timestamp >= fromTimestamp);
  }

  // ── getEventChain() ───────────────────────────────────────────────────────

  /**
   * Return all events sharing the given correlation_id, ordered by timestamp.
   * Searches across ALL session buffers (correlation IDs are cross-session).
   */
  getEventChain(correlationId: string): AgentEvent[] {
    const chain: AgentEvent[] = [];
    this.buffers.forEach((buf) => {
      buf.toArray().forEach((evt) => {
        if (evt.correlation_id === correlationId) chain.push(evt);
      });
    });
    chain.sort((a, b) => a.timestamp - b.timestamp);
    return chain;
  }

  // ── helpers ───────────────────────────────────────────────────────────

  private _getBuffer(sessionId: string): CircularBuffer {
    let buf = this.buffers.get(sessionId);
    if (!buf) {
      // If we're at max capacity, evict the least recently used buffer
      if (this.buffers.size >= EventBus.MAX_BUFFERS) {
        let lruSessionId: string | null = null;
        let lruTime = Date.now();

        this.buffers.forEach((buffer, id) => {
          const lastAccessed = buffer.getLastAccessed();
          if (lastAccessed < lruTime) {
            lruTime = lastAccessed;
            lruSessionId = id;
          }
        });

        if (lruSessionId !== null) {
          this.buffers.delete(lruSessionId);
        }
      }

      buf = new CircularBuffer();
      this.buffers.set(sessionId, buf);
    }
    return buf;
  }

  /** Remove the buffer for a session (call on SESSION_ENDED). */
  evictSession(sessionId: string): void {
    this.buffers.delete(sessionId);
  }

  /** Number of sessions with active buffers. */
  get activeSessions(): number {
    return this.buffers.size;
  }

  /**
   * Get the last accessed timestamp for a session's buffer.
   * Returns 0 if the buffer doesn't exist.
   */
  getBufferLastAccessed(sessionId: string): number {
    const buf = this.buffers.get(sessionId);
    return buf ? buf.getLastAccessed() : 0;
  }

  /**
   * Remove buffers that have been idle longer than MAX_IDLE_TIME_MS.
   * Returns the number of buffers removed.
   */
  cleanupIdleBuffers(): number {
    const now = Date.now();
    let removedCount = 0;

    this.buffers.forEach((buf, sessionId) => {
      if (now - buf.getLastAccessed() > EventBus.MAX_IDLE_TIME_MS) {
        this.buffers.delete(sessionId);
        removedCount++;
      }
    });

    return removedCount;
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────

/**
 * Process-singleton EventBus. Import and use directly in service constructors:
 *
 * ```ts
 * import { globalEventBus } from '../../core/event-bus.js';
 * globalEventBus.publish({ type: 'FSM_TRANSITION', session_id, payload: … });
 * ```
 */
export const globalEventBus = new EventBus();