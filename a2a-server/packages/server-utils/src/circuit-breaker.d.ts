/**
 * Circuit Breaker Pattern
 * Provides fault tolerance by tracking failures and opening circuit
 */
export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    successThreshold: number;
}
export interface RetryMetrics {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    circuitBreakerOpens: number;
    averageDelay: number;
}
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export declare const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions;
export declare class CircuitBreaker {
    private state;
    private failures;
    private successes;
    private nextAttempt;
    private options;
    private metrics;
    constructor(options?: Partial<CircuitBreakerOptions>);
    getState(): CircuitState;
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private open;
    private reset;
    forceOpen(): void;
    forceClose(): void;
    getMetrics(): RetryMetrics;
}
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
}
export declare function withCircuitBreaker(fn: () => Promise<unknown>, breakerOptions?: Partial<CircuitBreakerOptions>): {
    execute: () => Promise<unknown>;
    breaker: CircuitBreaker;
};
export {};
//# sourceMappingURL=circuit-breaker.d.ts.map