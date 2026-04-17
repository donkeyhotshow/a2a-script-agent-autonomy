/**
 * EventBus — ADR-0063: Internal typed event bus for decoupled agent services.
 */

import { EventEmitter } from "events";
import { randomUUID } from "node:crypto";

export type AgentEventType =
  | "FSM_TRANSITION"
  | "ARTIFACT_WRITTEN"
  | "REASONING_COMPLETE"
  | "GOAL_UPDATED"
  | "MEMORY_RECALLED"
  | "DRIFT_DETECTED"
  | "DECISION_MADE"
  | "TOOL_RESULT"
  | "SAFETY_INTERCEPT"
  | "SESSION_ENDED"
  | "OPERATOR_STOP";

export interface AgentEvent<T = unknown> {
  id: string;
  type: AgentEventType;
  session_id: string;
  timestamp: number;
  payload: T;
  correlation_id?: string;
}

export type EventHandler<T = unknown> = (event: AgentEvent<T>) => void;
export type Unsubscribe = () => void;

const BUFFER_SIZE = 500;

class CircularBuffer {
  private readonly buf: AgentEvent[] = [];
  private head = 0;
  private count = 0;
  private lastAccessed = 0;

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

  toArray(): AgentEvent[] {
    this.lastAccessed = Date.now();
    if (this.count < BUFFER_SIZE) {
      return this.buf.slice();
    }
    const tail = this.buf.slice(this.head);
    const head = this.buf.slice(0, this.head);
    return [...tail, ...head];
  }

  getLastAccessed(): number {
    return this.lastAccessed;
  }
}

export class EventBus {
  private readonly emitter = new EventEmitter();
  private readonly buffers = new Map<string, CircularBuffer>();
  private static readonly MAX_IDLE_TIME_MS = 60 * 60 * 1000;
  private static readonly MAX_BUFFERS = 1000;

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publish<T>(event: Omit<AgentEvent<T>, "id" | "timestamp">): AgentEvent<T> {
    const full: AgentEvent<T> = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...event,
    };

    this._getBuffer(full.session_id).push(full as AgentEvent);
    this.emitter.emit(full.type, full);
    return full;
  }

  subscribe<T = unknown>(type: AgentEventType, handler: EventHandler<T>): Unsubscribe {
    const listener = handler as EventHandler;
    this.emitter.on(type, listener);
    return () => this.emitter.off(type, listener);
  }

  replay(sessionId: string, fromTimestamp?: number): AgentEvent[] {
    const all = this._getBuffer(sessionId).toArray();
    if (fromTimestamp === undefined) return all;
    return all.filter((e) => e.timestamp >= fromTimestamp);
  }

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

  private _getBuffer(sessionId: string): CircularBuffer {
    let buf = this.buffers.get(sessionId);
    if (!buf) {
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

  evictSession(sessionId: string): void {
    this.buffers.delete(sessionId);
  }

  get activeSessions(): number {
    return this.buffers.size;
  }

  getBufferLastAccessed(sessionId: string): number {
    const buf = this.buffers.get(sessionId);
    return buf ? buf.getLastAccessed() : 0;
  }

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

export const globalEventBus = new EventBus();
