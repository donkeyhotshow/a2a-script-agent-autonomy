/**
 * Circuit Breaker Implementation
 * 
 * Реализация паттерна Circuit Breaker для ProxyClient
 */

import {logger} from '../utils/logger.js';
import type {CircuitBreakerConfig} from './proxy-client.types.js';

export class CircuitBreaker {
    private state: 'closed' | 'open' | 'half_open' = 'closed';
    private failures = 0;
    private successes = 0;
    private halfOpenCalls = 0;
    private lastFailureTime = 0;
    private readonly config: Required<CircuitBreakerConfig>;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 3,
            timeoutMs: config.timeoutMs ?? 60000,
            halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
        };
    }

    canExecute(): boolean {
        if (!this.config.enabled) return true;
        if (this.state === 'closed') return true;

        // Check timeout
        if (this.state === 'open') {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed >= this.config.timeoutMs) {
                logger.info('[CircuitBreaker] transitioning to half_open');
                this.state = 'half_open';
                this.halfOpenCalls = 0;
                return true;
            }
            return false;
        }

        // Half-open state
        if (this.halfOpenCalls < this.config.halfOpenMaxCalls) {
            this.halfOpenCalls++;
            return true;
        }

        return false;
    }

    recordSuccess(): void {
        if (!this.config.enabled) return;

        if (this.state === 'half_open') {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                this.close();
            }
        } else {
            this.failures = Math.max(0, this.failures - 1);
        }
    }

    recordFailure(): void {
        if (!this.config.enabled) return;

        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === 'half_open' || this.failures >= this.config.failureThreshold) {
            this.open();
        }
    }

    getState(): 'closed' | 'open' | 'half_open' {
        return this.state;
    }

    private open(): void {
        if (this.state !== 'open') {
            logger.warn('[CircuitBreaker] opening circuit', {
                failures: this.failures,
                threshold: this.config.failureThreshold,
            });
        }
        this.state = 'open';
        this.successes = 0;
        this.halfOpenCalls = 0;
    }

    private close(): void {
        logger.info('[CircuitBreaker] closing circuit');
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.halfOpenCalls = 0;
    }
}
