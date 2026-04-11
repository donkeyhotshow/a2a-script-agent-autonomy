/**
 * Adaptive Polling
 * Provides dynamic polling interval adjustment based on activity
 */
// ===========================================
// Default Configuration
// ===========================================
export const DEFAULT_ADAPTIVE_POLLING = {
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
    currentInterval;
    consecutiveEmpty = 0;
    options;
    constructor(options = {}) {
        this.options = { ...DEFAULT_ADAPTIVE_POLLING, ...options };
        this.currentInterval = this.options.minInterval;
    }
    /**
     * Record a polling result and get the next interval
     */
    onPollResult(hasData) {
        if (hasData) {
            // Activity detected - decrease interval
            this.consecutiveEmpty = 0;
            this.currentInterval = Math.max(this.options.minInterval, this.currentInterval * this.options.accelerationFactor);
        }
        else {
            // No data - increase interval after threshold
            this.consecutiveEmpty++;
            if (this.consecutiveEmpty >= this.options.emptyThreshold) {
                this.currentInterval = Math.min(this.options.maxInterval, this.currentInterval * this.options.backoffFactor);
            }
        }
        return Math.round(this.currentInterval);
    }
    getCurrentInterval() {
        return Math.round(this.currentInterval);
    }
    reset() {
        this.currentInterval = this.options.minInterval;
        this.consecutiveEmpty = 0;
    }
}
//# sourceMappingURL=adaptive-polling.js.map