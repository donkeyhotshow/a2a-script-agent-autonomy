/**
 * Rate limiting service for Proxy client.
 *
 * Implements token bucket and sliding window algorithms for rate limiting.
 * Supports per-endpoint, per-user, and global rate limits.
 */

import {logger} from '../utils/logger.js';

export interface RateLimitConfig {
    /** Enable rate limiting */
    enabled: boolean;
    /** Requests per minute (default: 1000) */
    requestsPerMinute: number;
    /** Burst size for token bucket (default: 100) */
    burstSize: number;
    /** Block duration in seconds after exceeding limit (default: 60) */
    blockDuration: number;
    /** Per-endpoint limits */
    endpointLimits?: Record<string, {rpm: number; burst: number}>;
    /** Per-user limits */
    userLimits?: Record<string, {rpm: number; burst: number}>;
}

export interface RateLimitStatus {
    /** Whether request is allowed */
    allowed: boolean;
    /** Remaining requests in current window */
    remaining: number;
    /** Unix timestamp when limit resets */
    resetTime: number;
    /** Total limit for the window */
    limit: number;
    /** Blocked status */
    blocked: boolean;
    /** Seconds until unblocked */
    retryAfter?: number;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
    blockedUntil?: number;
}

interface SlidingWindowEntry {
    count: number;
    windowStart: number;
}

/**
 * Token bucket rate limiter
 */
class TokenBucketLimiter {
    private buckets = new Map<string, TokenBucket>();
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per ms
    private readonly blockDurationMs: number;

    constructor(maxTokens: number, refillRatePerMinute: number, blockDurationSeconds: number) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRatePerMinute / (60 * 1000);
        this.blockDurationMs = blockDurationSeconds * 1000;
    }

    check(key: string): RateLimitStatus {
        const now = Date.now();
        let bucket = this.buckets.get(key);

        if (!bucket) {
            bucket = {
                tokens: this.maxTokens,
                lastRefill: now,
            };
            this.buckets.set(key, bucket);
        }

        // Check if blocked
        if (bucket.blockedUntil && bucket.blockedUntil > now) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: Math.ceil(bucket.blockedUntil / 1000),
                limit: this.maxTokens,
                blocked: true,
                retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000),
            };
        }

        // Refill tokens
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = timePassed * this.refillRate;
        bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        // Clear block if expired
        if (bucket.blockedUntil && bucket.blockedUntil <= now) {
            delete bucket.blockedUntil;
            bucket.tokens = this.maxTokens;
        }

        // Check if request can be processed
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetTime: Math.ceil((now + (this.maxTokens - bucket.tokens) / this.refillRate) / 1000),
                limit: this.maxTokens,
                blocked: false,
            };
        }

        // Block the key
        bucket.blockedUntil = now + this.blockDurationMs;
        return {
            allowed: false,
            remaining: 0,
            resetTime: Math.ceil(bucket.blockedUntil / 1000),
            limit: this.maxTokens,
            blocked: true,
            retryAfter: Math.ceil(this.blockDurationMs / 1000),
        };
    }

    reset(key: string): void {
        this.buckets.delete(key);
    }

    resetAll(): void {
        this.buckets.clear();
    }

    cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];
        this.buckets.forEach((bucket, key) => {
            if (bucket.blockedUntil && bucket.blockedUntil <= now) {
                keysToDelete.push(key);
            }
        });
        for (const key of keysToDelete) {
            this.buckets.delete(key);
        }
    }
}

/**
 * Sliding window rate limiter
 */
class SlidingWindowLimiter {
    private windows = new Map<string, SlidingWindowEntry>();
    private readonly windowSizeMs: number;
    private readonly maxRequests: number;

    constructor(maxRequestsPerMinute: number) {
        this.maxRequests = maxRequestsPerMinute;
        this.windowSizeMs = 60 * 1000; // 1 minute
    }

    check(key: string): RateLimitStatus {
        const now = Date.now();
        let entry = this.windows.get(key);

        if (!entry) {
            entry = {
                count: 0,
                windowStart: now,
            };
            this.windows.set(key, entry);
        }

        // Reset window if expired
        if (now - entry.windowStart > this.windowSizeMs) {
            entry.count = 0;
            entry.windowStart = now;
        }

        const remaining = Math.max(0, this.maxRequests - entry.count);
        const resetTime = Math.ceil((entry.windowStart + this.windowSizeMs) / 1000);

        if (entry.count >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime,
                limit: this.maxRequests,
                blocked: true,
                retryAfter: Math.ceil((entry.windowStart + this.windowSizeMs - now) / 1000),
            };
        }

        entry.count += 1;
        return {
            allowed: true,
            remaining: remaining - 1,
            resetTime,
            limit: this.maxRequests,
            blocked: false,
        };
    }

    reset(key: string): void {
        this.windows.delete(key);
    }

    resetAll(): void {
        this.windows.clear();
    }
}

/**
 * Rate limiting service for proxy requests
 */
export class ProxyRateLimiter {
    private globalLimiter: TokenBucketLimiter;
    private endpointLimiters = new Map<string, TokenBucketLimiter>();
    private userLimiters = new Map<string, TokenBucketLimiter>();
    private config: RateLimitConfig;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            requestsPerMinute: config.requestsPerMinute ?? 1000,
            burstSize: config.burstSize ?? 100,
            blockDuration: config.blockDuration ?? 60,
            endpointLimits: config.endpointLimits,
            userLimits: config.userLimits,
        };

        this.globalLimiter = new TokenBucketLimiter(
            this.config.burstSize,
            this.config.requestsPerMinute,
            this.config.blockDuration
        );

        // Setup endpoint limiters
        if (this.config.endpointLimits) {
            for (const [endpoint, limits] of Object.entries(this.config.endpointLimits)) {
                this.endpointLimiters.set(
                    endpoint,
                    new TokenBucketLimiter(
                        limits.burst,
                        limits.rpm,
                        this.config.blockDuration
                    )
                );
            }
        }

        // Setup user limiters
        if (this.config.userLimits) {
            for (const [userId, limits] of Object.entries(this.config.userLimits)) {
                this.userLimiters.set(
                    userId,
                    new TokenBucketLimiter(
                        limits.burst,
                        limits.rpm,
                        this.config.blockDuration
                    )
                );
            }
        }

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    /**
     * Check rate limit for request
     */
    check(options: {
        endpoint?: string;
        userId?: string;
        requestId?: string;
    } = {}): RateLimitStatus {
        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                resetTime: 0,
                limit: Infinity,
                blocked: false,
            };
        }

        const {endpoint, userId} = options;

        // Check user limit first (most specific)
        if (userId && this.userLimiters.has(userId)) {
            const userStatus = this.userLimiters.get(userId)!.check(userId);
            if (!userStatus.allowed) {
                logger.warn('[ProxyRateLimiter] user rate limit exceeded', {userId});
                return userStatus;
            }
        }

        // Check endpoint limit
        if (endpoint) {
            const endpointKey = this.findMatchingEndpoint(endpoint);
            if (endpointKey && this.endpointLimiters.has(endpointKey)) {
                const endpointStatus = this.endpointLimiters.get(endpointKey)!.check(endpointKey);
                if (!endpointStatus.allowed) {
                    logger.warn('[ProxyRateLimiter] endpoint rate limit exceeded', {endpoint});
                    return endpointStatus;
                }
            }
        }

        // Check global limit
        const globalStatus = this.globalLimiter.check('global');
        if (!globalStatus.allowed) {
            logger.warn('[ProxyRateLimiter] global rate limit exceeded');
        }

        return globalStatus;
    }

    /**
     * Check if request is allowed (convenience method)
     */
    isAllowed(options: {
        endpoint?: string;
        userId?: string;
        requestId?: string;
    } = {}): boolean {
        return this.check(options).allowed;
    }

    /**
     * Get rate limit headers for response
     */
    getHeaders(status: RateLimitStatus): Record<string, string> {
        return {
            'X-RateLimit-Limit': String(status.limit),
            'X-RateLimit-Remaining': String(status.remaining),
            'X-RateLimit-Reset': String(status.resetTime),
        };
    }

    /**
     * Reset rate limit for specific key
     */
    reset(key: 'global' | 'endpoint' | 'user', id?: string): void {
        if (key === 'global') {
            this.globalLimiter.reset('global');
        } else if (key === 'endpoint' && id) {
            this.endpointLimiters.get(id)?.reset(id);
        } else if (key === 'user' && id) {
            this.userLimiters.get(id)?.reset(id);
        }
    }

    /**
     * Reset all rate limits
     */
    resetAll(): void {
        this.globalLimiter.resetAll();
        this.endpointLimiters.forEach((limiter) => {
            limiter.resetAll();
        });
        this.userLimiters.forEach((limiter) => {
            limiter.resetAll();
        });
    }

    /**
     * Destroy the rate limiter and cleanup
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }

    private findMatchingEndpoint(endpoint: string): string | undefined {
        // Exact match first
        if (this.endpointLimiters.has(endpoint)) {
            return endpoint;
        }

        // Pattern match
        let matchedKey: string | undefined;
        this.endpointLimiters.forEach((_, key) => {
            if (!matchedKey && (endpoint.includes(key) || key.includes(endpoint))) {
                matchedKey = key;
            }
        });

        return matchedKey;
    }

    private cleanup(): void {
        this.globalLimiter.cleanup();
        this.endpointLimiters.forEach((limiter) => {
            limiter.cleanup();
        });
    }
}

// Singleton instance
let defaultRateLimiter: ProxyRateLimiter | undefined;

/**
 * Get or create default rate limiter
 */
export function getProxyRateLimiter(
    config?: Partial<RateLimitConfig>
): ProxyRateLimiter {
    if (!defaultRateLimiter) {
        defaultRateLimiter = new ProxyRateLimiter(config);
    }
    return defaultRateLimiter;
}

/**
 * Reset default rate limiter (for testing)
 */
export function resetProxyRateLimiter(): void {
    if (defaultRateLimiter) {
        defaultRateLimiter.destroy();
    }
    defaultRateLimiter = undefined;
}
