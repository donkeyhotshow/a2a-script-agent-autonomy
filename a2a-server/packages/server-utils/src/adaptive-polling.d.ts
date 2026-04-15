/**
 * Adaptive Polling
 * Provides dynamic polling interval adjustment based on activity
 */
export interface AdaptivePollingOptions {
    minInterval: number;
    maxInterval: number;
    backoffFactor: number;
    accelerationFactor: number;
    emptyThreshold: number;
}
export declare const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingOptions;
export declare class AdaptivePolling {
    private currentInterval;
    private consecutiveEmpty;
    private options;
    constructor(options?: Partial<AdaptivePollingOptions>);
    onPollResult(hasData: boolean): number;
    getCurrentInterval(): number;
    reset(): void;
}
//# sourceMappingURL=adaptive-polling.d.ts.map