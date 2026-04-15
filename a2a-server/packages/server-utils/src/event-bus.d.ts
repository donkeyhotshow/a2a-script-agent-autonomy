/**
 * EventBus — ADR-0063: Internal typed event bus for decoupled agent services.
 */
export type AgentEventType = "FSM_TRANSITION" | "ARTIFACT_WRITTEN" | "REASONING_COMPLETE" | "GOAL_UPDATED" | "MEMORY_RECALLED" | "DRIFT_DETECTED" | "DECISION_MADE" | "TOOL_RESULT" | "SAFETY_INTERCEPT" | "SESSION_ENDED";
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
export declare class EventBus {
    private readonly emitter;
    private readonly buffers;
    private static readonly MAX_IDLE_TIME_MS;
    private static readonly MAX_BUFFERS;
    constructor();
    publish<T>(event: Omit<AgentEvent<T>, "id" | "timestamp">): AgentEvent<T>;
    subscribe<T = unknown>(type: AgentEventType, handler: EventHandler<T>): Unsubscribe;
    replay(sessionId: string, fromTimestamp?: number): AgentEvent[];
    getEventChain(correlationId: string): AgentEvent[];
    private _getBuffer;
    evictSession(sessionId: string): void;
    get activeSessions(): number;
    getBufferLastAccessed(sessionId: string): number;
    cleanupIdleBuffers(): number;
}
export declare const globalEventBus: EventBus;
//# sourceMappingURL=event-bus.d.ts.map