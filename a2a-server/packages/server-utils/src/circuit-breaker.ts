/**
 * Circuit Breaker Pattern
 * Provides fault tolerance by tracking failures and opening circuit
 */

import { logger } from "./logger.js";

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

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 3,
};

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private options: CircuitBreakerOptions;
  private metrics: RetryMetrics;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      circuitBreakerOpens: 0,
      averageDelay: 0,
    };
  }

  getState(): CircuitState {
    if (this.state === "OPEN" && Date.now() >= this.nextAttempt) {
      this.state = "HALF_OPEN";
      logger.info("[CircuitBreaker] Transitioning to HALF_OPEN");
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === "OPEN") {
      throw new CircuitBreakerOpenError("Circuit breaker is OPEN");
    }

    this.metrics.totalAttempts++;
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.reset();
        logger.info("[CircuitBreaker] Circuit CLOSED after successful calls");
      }
    } else {
      this.failures = 0;
    }
    this.metrics.successfulRetries++;
  }

  private onFailure(): void {
    this.failures++;
    this.metrics.failedRetries++;
    if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = "OPEN";
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    this.metrics.circuitBreakerOpens++;
    logger.warn("[CircuitBreaker] Circuit OPENED", {
      failures: this.failures,
      resetTimeout: this.options.resetTimeout,
    });
  }

  private reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
  }

  forceOpen(): void {
    this.open();
  }

  forceClose(): void {
    this.reset();
  }

  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

export function withCircuitBreaker(
  fn: () => Promise<unknown>,
  breakerOptions?: Partial<CircuitBreakerOptions>,
): { execute: () => Promise<unknown>; breaker: CircuitBreaker } {
  const breaker = new CircuitBreaker(breakerOptions);
  return {
    execute: () => breaker.execute(fn),
    breaker,
  };
}
