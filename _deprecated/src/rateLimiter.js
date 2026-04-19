/**
 * Rate limiter utility for preventing excessive requests
 * Implements a simple time-based rate limiter per key
 */
class RateLimiter {
  /**
   * @param {number} minIntervalMs - Minimum time between requests for the same key
   */
  constructor(minIntervalMs) {
    this.minIntervalMs = minIntervalMs;
    this.lastRequests = new Map(); // key -> timestamp
  }

  /**
   * Check if a request is allowed for the given key
   * @param {string} key - Identifier for the request (e.g., agentId, userId)
   * @returns {boolean} - true if request is allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();
    const lastRequest = this.lastRequests.get(key);
    
    if (lastRequest && now - lastRequest < this.minIntervalMs) {
      return false;
    }
    
    this.lastRequests.set(key, now);
    return true;
  }

  /**
   * Get time until next request is allowed for the key
   * @param {string} key - Identifier for the request
   * @returns {number} - milliseconds until next request is allowed, 0 if allowed now
   */
  timeUntilAllowed(key) {
    const now = Date.now();
    const lastRequest = this.lastRequests.get(key);
    
    if (!lastRequest) return 0;
    
    const elapsed = now - lastRequest;
    return Math.max(0, this.minIntervalMs - elapsed);
  }

  /**
   * Clear rate limit history for a key
   * @param {string} key - Identifier to clear
   */
  clear(key) {
    this.lastRequests.delete(key);
  }

  /**
   * Clear all rate limit history
   */
  clearAll() {
    this.lastRequests.clear();
  }
}

module.exports = RateLimiter;