/**
 * RateLimiter — simple time-based rate limiter per key.
 *
 * Ported from root `src/rateLimiter.js` to a proper TypeScript module.
 * Used by the dynamic agent registry (ADR-0058/0059) to prevent excessive
 * registrations for the same agentId.
 */

export class RateLimiter {
  private readonly minIntervalMs: number;
  private readonly lastRequests = new Map<string, number>();

  /**
   * @param minIntervalMs Minimum time (ms) between allowed requests for the same key.
   */
  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * Returns `true` if a request for the given key is allowed right now
   * and records the current timestamp; `false` if the interval has not
   * elapsed since the last allowed request.
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequests.get(key);

    if (lastRequest !== undefined && now - lastRequest < this.minIntervalMs) {
      return false;
    }

    this.lastRequests.set(key, now);
    return true;
  }

  /**
   * Returns milliseconds until the next request for `key` will be allowed,
   * or 0 if it is allowed right now.
   */
  timeUntilAllowed(key: string): number {
    const now = Date.now();
    const lastRequest = this.lastRequests.get(key);

    if (lastRequest === undefined) return 0;

    const elapsed = now - lastRequest;
    return Math.max(0, this.minIntervalMs - elapsed);
  }

  /** Clear rate-limit history for a single key. */
  clear(key: string): void {
    this.lastRequests.delete(key);
  }

  /** Clear all rate-limit history. */
  clearAll(): void {
    this.lastRequests.clear();
  }
}
