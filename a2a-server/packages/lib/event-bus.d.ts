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
export type AgentEventType = 'FSM_TRANSITION' | 'ARTIFACT_WRITTEN' | 'REASONING_COMPLETE' | 'GOAL_UPDATED' | 'MEMORY_RECALLED' | 'DRIFT_DETECTED' | 'DECISION_MADE' | 'TOOL_RESULT' | 'SAFETY_INTERCEPT' | 'SESSION_ENDED';
export interface AgentEvent<T = unknown> {
    id: string;
    type: AgentEventType;
    session_id: string;
    timestamp: number;
    payload: T;
    correlation_id?: string;
}
export type EventHandler<T = unknown> = (event: AgentEvent<T>) => void;
/** Returns an unsubscribe function */
export type Unsubscribe = () => void;
export declare class EventBus {
    private readonly emitter;
    /** Per-session circular buffers */
    private readonly buffers;
    /** Maximum time (in ms) a buffer can be idle before being eligible for cleanup */
    private static readonly MAX_IDLE_TIME_MS;
    /** Maximum number of session buffers to keep in memory */
    private static readonly MAX_BUFFERS;
    constructor();
    /**
     * Publish an event. Runs synchronously < 0.05 ms for in-process delivery.
     * Async handlers are wrapped in setImmediate to avoid blocking the caller.
     */
    publish<T>(event: Omit<AgentEvent<T>, 'id' | 'timestamp'>): AgentEvent<T>;
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
    subscribe<T = unknown>(type: AgentEventType, handler: EventHandler<T>): Unsubscribe;
    /**
     * Return all buffered events for a session, ordered chronologically,
     * optionally filtered to events after fromTimestamp.
     */
    replay(sessionId: string, fromTimestamp?: number): AgentEvent[];
    /**
     * Return all events sharing the given correlation_id, ordered by timestamp.
     * Searches across ALL session buffers (correlation IDs are cross-session).
     */
    getEventChain(correlationId: string): AgentEvent[];
    private _getBuffer;
    /** Remove the buffer for a session (call on SESSION_ENDED). */
    evictSession(sessionId: string): void;
    /** Number of sessions with active buffers. */
    get activeSessions(): number;
    /**
     * Get the last accessed timestamp for a session's buffer.
     * Returns 0 if the buffer doesn't exist.
     */
    getBufferLastAccessed(sessionId: string): number;
    /**
     * Remove buffers that have been idle longer than MAX_IDLE_TIME_MS.
     * Returns the number of buffers removed.
     */
    cleanupIdleBuffers(): number;
}
/**
 * Process-singleton EventBus. Import and use directly in service constructors:
 *
 * ```ts
 * import { globalEventBus } from '../../core/event-bus';
 * globalEventBus.publish({ type: 'FSM_TRANSITION', session_id, payload: … });
 * ```
 */
export declare const globalEventBus: EventBus;
//# sourceMappingURL=event-bus.d.ts.map