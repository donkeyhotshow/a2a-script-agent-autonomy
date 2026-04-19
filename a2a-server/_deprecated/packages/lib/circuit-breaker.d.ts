/**
 * Circuit Breaker Pattern
 * Provides fault tolerance by tracking failures and opening circuit
 */
export interface CircuitBreakerOptions {
    /** Number of failures before opening circuit */
    failureThreshold: number;
    /** Time in ms before attempting reset */
    resetTimeout: number;
    /** Number of successful calls to close circuit */
    successThreshold: number;
}
export interface RetryMetrics {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    circuitBreakerOpens: number;
    averageDelay: number;
}
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
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
/**
 * Create a function with circuit breaker
 */
export declare function withCircuitBreaker(fn: () => Promise<unknown>, breakerOptions?: Partial<CircuitBreakerOptions>): {
    execute: () => Promise<unknown>;
    breaker: CircuitBreaker;
};
export {};
//# sourceMappingURL=circuit-breaker.d.ts.map