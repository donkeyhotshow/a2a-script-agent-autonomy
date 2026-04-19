/**
 * Adaptive Polling
 * Provides dynamic polling interval adjustment based on activity
 */
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
export declare const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingOptions;
export declare class AdaptivePolling {
    private currentInterval;
    private consecutiveEmpty;
    private options;
    constructor(options?: Partial<AdaptivePollingOptions>);
    /**
     * Record a polling result and get the next interval
     */
    onPollResult(hasData: boolean): number;
    getCurrentInterval(): number;
    reset(): void;
}
//# sourceMappingURL=adaptive-polling.d.ts.map