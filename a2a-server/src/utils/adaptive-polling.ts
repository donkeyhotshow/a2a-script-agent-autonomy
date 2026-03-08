/**
 * Adaptive Polling
 * Provides dynamic polling interval adjustment based on activity
 */

import { logger } from './logger.js';

// ===========================================
// Types
// ===========================================

export interface AdaptivePollingOptions {
    /** Minimum polling interval in ms */
    minInterval: number;
    /** Maximum polling interval in ms */
    maxInterval: number;
    /** Factor to increase interval on empty results */
    backoffFactor: number;
    /** Factor to decrease interval on activity */
    accelerationFactor: number;
    /** Number of consecutive empty results before backing off */
    emptyThreshold: number;
}

// ===========================================
// Default Configuration
// ===========================================

export const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingOptions = {
    minInterval: 1000,
    maxInterval: 60000,
    backoffFactor: 1.5,
    accelerationFactor: 0.5,
    emptyThreshold: 3
};

// ===========================================
// Adaptive Polling Class
// ===========================================

export class AdaptivePolling {
    private currentInterval: number;
    private consecutiveEmpty = 0;
    private options: AdaptivePollingOptions;

    constructor(options: Partial<AdaptivePollingOptions> = {}) {
        this.options = { ...DEFAULT_ADAPTIVE_POLLING, ...options };
        this.currentInterval = this.options.minInterval;
    }

    /**
     * Record a polling result and get the next interval
     */
    onPollResult(hasData: boolean): number {
        if (hasData) {
            // Activity detected - decrease interval
            this.consecutiveEmpty = 0;
            this.currentInterval = Math.max(
                this.options.minInterval,
                this.currentInterval * this.options.accelerationFactor
            );
        } else {
            // No data - increase interval after threshold
            this.consecutiveEmpty++;
            if (this.consecutiveEmpty >= this.options.emptyThreshold) {
                this.currentInterval = Math.min(
                    this.options.maxInterval,
                    this.currentInterval * this.options.backoffFactor
                );
            }
        }

        return Math.round(this.currentInterval);
    }

    getCurrentInterval(): number {
        return Math.round(this.currentInterval);
    }

    reset(): void {
        this.currentInterval = this.options.minInterval;
        this.consecutiveEmpty = 0;
    }
}
