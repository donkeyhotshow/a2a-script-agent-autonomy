/**
 * Circuit Breaker Pattern
 * Provides fault tolerance by tracking failures and opening circuit
 */
import { logger } from "./logger.js";
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 3,
};
export class CircuitBreaker {
    state = "CLOSED";
    failures = 0;
    successes = 0;
    nextAttempt = 0;
    options;
    metrics;
    constructor(options = {}) {
        this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
        this.metrics = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            circuitBreakerOpens: 0,
            averageDelay: 0,
        };
    }
    getState() {
        if (this.state === "OPEN" && Date.now() >= this.nextAttempt) {
            this.state = "HALF_OPEN";
            logger.info("[CircuitBreaker] Transitioning to HALF_OPEN");
        }
        return this.state;
    }
    async execute(fn) {
        const currentState = this.getState();
        if (currentState === "OPEN") {
            throw new CircuitBreakerOpenError("Circuit breaker is OPEN");
        }
        this.metrics.totalAttempts++;
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        if (this.state === "HALF_OPEN") {
            this.successes++;
            if (this.successes >= this.options.successThreshold) {
                this.reset();
                logger.info("[CircuitBreaker] Circuit CLOSED after successful calls");
            }
        }
        else {
            this.failures = 0;
        }
        this.metrics.successfulRetries++;
    }
    onFailure() {
        this.failures++;
        this.metrics.failedRetries++;
        if (this.failures >= this.options.failureThreshold) {
            this.open();
        }
    }
    open() {
        this.state = "OPEN";
        this.nextAttempt = Date.now() + this.options.resetTimeout;
        this.metrics.circuitBreakerOpens++;
        logger.warn("[CircuitBreaker] Circuit OPENED", {
            failures: this.failures,
            resetTimeout: this.options.resetTimeout,
        });
    }
    reset() {
        this.state = "CLOSED";
        this.failures = 0;
        this.successes = 0;
    }
    forceOpen() {
        this.open();
    }
    forceClose() {
        this.reset();
    }
    getMetrics() {
        return { ...this.metrics };
    }
}
export class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = "CircuitBreakerOpenError";
    }
}
export function withCircuitBreaker(fn, breakerOptions) {
    const breaker = new CircuitBreaker(breakerOptions);
    return {
        execute: () => breaker.execute(fn),
        breaker,
    };
}
//# sourceMappingURL=circuit-breaker.js.map