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

export const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingOptions = {
  minInterval: 1000,
  maxInterval: 60000,
  backoffFactor: 1.5,
  accelerationFactor: 0.5,
  emptyThreshold: 3,
};

export class AdaptivePolling {
  private currentInterval: number;
  private consecutiveEmpty = 0;
  private options: AdaptivePollingOptions;

  constructor(options: Partial<AdaptivePollingOptions> = {}) {
    this.options = { ...DEFAULT_ADAPTIVE_POLLING, ...options };
    this.currentInterval = this.options.minInterval;
  }

  onPollResult(hasData: boolean): number {
    if (hasData) {
      this.consecutiveEmpty = 0;
      this.currentInterval = Math.max(
        this.options.minInterval,
        this.currentInterval * this.options.accelerationFactor,
      );
    } else {
      this.consecutiveEmpty++;
      if (this.consecutiveEmpty >= this.options.emptyThreshold) {
        this.currentInterval = Math.min(
          this.options.maxInterval,
          this.currentInterval * this.options.backoffFactor,
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
