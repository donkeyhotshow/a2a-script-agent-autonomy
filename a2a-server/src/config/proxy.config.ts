/**
 * Proxy integration configuration for A2A Server.
 *
 * Centralized configuration for the External AI Hub Proxy integration,
 * including caching, rate limiting, load balancing, and monitoring settings.
 */

import type {CacheConfig} from '../services/proxy-cache.service.js';
import type {RateLimitConfig} from '../services/proxy-rate-limiter.service.js';
import type {MonitorConfig} from '../services/proxy-monitor.service.js';
import type {ProxyClientConfig} from '../services/proxy-client.js';

/**
 * Load configuration from environment variables
 */
function env(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
}

function envInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
}

function envBool(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value === '1' || value === 'true' || value === 'yes';
}

function envJson<T>(key: string, defaultValue: T): T {
    const value = process.env[key];
    if (!value) return defaultValue;
    try {
        return JSON.parse(value) as T;
    } catch {
        return defaultValue;
    }
}

/**
 * Proxy connection configuration
 */
export const proxyConnectionConfig = {
    /** Base URL for External AI Hub Proxy */
    baseUrl: env('PROXY_BASE_URL', 'http://localhost:5000'),

    /** Fallback proxy URLs for load balancing */
    fallbackUrls: envJson<string[]>('PROXY_FALLBACK_URLS', []),

    /** API key for proxy authentication */
    apiKey: env('PROXY_API_KEY', ''),

    /** Request timeout in milliseconds */
    timeoutMs: envInt('PROXY_TIMEOUT_MS', 30000),

    /** Retry configuration */
    retry: {
        /** Number of retries */
        retries: envInt('PROXY_RETRY_COUNT', 2),
        /** Initial delay between retries in ms */
        delayMs: envInt('PROXY_RETRY_DELAY_MS', 1000),
        /** Maximum delay between retries in ms */
        maxDelayMs: envInt('PROXY_RETRY_MAX_DELAY_MS', 30000),
        /** Backoff multiplier */
        backoffMultiplier: envInt('PROXY_RETRY_BACKOFF_MULTIPLIER', 2),
        /** HTTP status codes to retry */
        retryableStatuses: envJson<number[]>('PROXY_RETRYABLE_STATUSES', [408, 429, 500, 502, 503, 504]),
    },
};

/**
 * Cache configuration
 */
export const proxyCacheConfig: CacheConfig = {
    /** Enable caching */
    enabled: envBool('PROXY_CACHE_ENABLED', true),
    /** TTL in seconds */
    ttlSeconds: envInt('PROXY_CACHE_TTL_SECONDS', 300),
    /** Maximum items in memory cache */
    maxItems: envInt('PROXY_CACHE_MAX_ITEMS', 1000),
    /** Redis URL for L2 cache */
    redisUrl: env('PROXY_CACHE_REDIS_URL', ''),
    /** Cache key prefix */
    keyPrefix: env('PROXY_CACHE_KEY_PREFIX', 'a2a:proxy'),
};

/**
 * Rate limiting configuration
 */
export const proxyRateLimitConfig: RateLimitConfig = {
    /** Enable rate limiting */
    enabled: envBool('PROXY_RATE_LIMIT_ENABLED', true),
    /** Global requests per minute */
    requestsPerMinute: envInt('PROXY_RATE_LIMIT_RPM', 1000),
    /** Burst size for token bucket */
    burstSize: envInt('PROXY_RATE_LIMIT_BURST', 100),
    /** Block duration in seconds */
    blockDuration: envInt('PROXY_RATE_LIMIT_BLOCK_DURATION', 60),
    /** Per-endpoint limits */
    endpointLimits: envJson('PROXY_RATE_LIMIT_ENDPOINTS', {
        '/api/v1/generate': {rpm: 600, burst: 60},
        '/api/v1/chat': {rpm: 600, burst: 60},
        '/api/v1/embeddings': {rpm: 300, burst: 30},
    }),
    /** Per-user limits */
    userLimits: envJson('PROXY_RATE_LIMIT_USERS', {}),
};

/**
 * Monitoring configuration
 */
export const proxyMonitorConfig: MonitorConfig = {
    /** Enable monitoring */
    enabled: envBool('PROXY_MONITOR_ENABLED', true),
    /** Metrics retention time in minutes */
    retentionMinutes: envInt('PROXY_MONITOR_RETENTION_MINUTES', 60),
    /** Enable latency histogram */
    enableLatencyHistogram: envBool('PROXY_MONITOR_LATENCY_HISTOGRAM', true),
    /** Latency buckets in ms */
    latencyBuckets: envJson('PROXY_MONITOR_LATENCY_BUCKETS', [10, 50, 100, 250, 500, 1000, 2500, 5000]),
    /** Error rate threshold for alerting (0.1 = 10%) */
    errorRateThreshold: parseFloat(env('PROXY_MONITOR_ERROR_THRESHOLD', '0.1')),
    /** Latency threshold for alerting in ms */
    latencyThreshold: envInt('PROXY_MONITOR_LATENCY_THRESHOLD', 5000),
};

/**
 * Circuit breaker configuration
 */
export const proxyCircuitBreakerConfig = {
    /** Enable circuit breaker */
    enabled: envBool('PROXY_CIRCUIT_BREAKER_ENABLED', true),
    /** Failures before opening circuit */
    failureThreshold: envInt('PROXY_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
    /** Successes before closing circuit */
    successThreshold: envInt('PROXY_CIRCUIT_BREAKER_SUCCESS_THRESHOLD', 3),
    /** Timeout before attempting reset in ms */
    timeoutMs: envInt('PROXY_CIRCUIT_BREAKER_TIMEOUT_MS', 60000),
    /** Max calls in half-open state */
    halfOpenMaxCalls: envInt('PROXY_CIRCUIT_BREAKER_HALF_OPEN_MAX', 3),
};

/**
 * Load balancer configuration
 */
export const proxyLoadBalancerConfig = {
    /** Load balancing strategy */
    strategy: env('PROXY_LB_STRATEGY', 'round_robin') as 'round_robin' | 'least_connections' | 'weighted' | 'priority',
    /** Service weights for weighted strategy */
    weights: envJson<Record<string, number>>('PROXY_LB_WEIGHTS', {}),
    /** Health check interval in ms */
    healthCheckIntervalMs: envInt('PROXY_LB_HEALTH_CHECK_INTERVAL_MS', 30000),
};

/**
 * Complete proxy client configuration
 */
export function getProxyClientConfig(): ProxyClientConfig {
    return {
        baseUrl: proxyConnectionConfig.baseUrl,
        fallbackUrls: proxyConnectionConfig.fallbackUrls,
        apiKey: proxyConnectionConfig.apiKey || undefined,
        timeoutMs: proxyConnectionConfig.timeoutMs,
        retry: proxyConnectionConfig.retry,
        cache: proxyCacheConfig,
        rateLimit: proxyRateLimitConfig,
        monitor: proxyMonitorConfig,
        circuitBreaker: proxyCircuitBreakerConfig,
        loadBalancer: proxyLoadBalancerConfig,
    };
}

/**
 * Get proxy URL for specific AI service
 */
export function getProxyServiceUrl(service: 'ollama' | 'openai' | 'custom'): string {
    const baseUrl = proxyConnectionConfig.baseUrl;
    const paths = {
        ollama: '/api/v1/ollama',
        openai: '/api/v1/openai',
        custom: '/api/v1/custom',
    };
    return `${baseUrl}${paths[service]}`;
}

/**
 * Health check configuration
 */
export const proxyHealthCheckConfig = {
    /** Health check endpoint */
    endpoint: env('PROXY_HEALTH_ENDPOINT', '/health'),
    /** Health check interval in ms */
    intervalMs: envInt('PROXY_HEALTH_INTERVAL_MS', 30000),
    /** Health check timeout in ms */
    timeoutMs: envInt('PROXY_HEALTH_TIMEOUT_MS', 5000),
    /** Failure threshold before marking unhealthy */
    failureThreshold: envInt('PROXY_HEALTH_FAILURE_THRESHOLD', 3),
};

/**
 * Validate proxy configuration
 */
export function validateProxyConfig(): {valid: boolean; errors: string[]} {
    const errors: string[] = [];

    // Validate base URL
    if (!proxyConnectionConfig.baseUrl) {
        errors.push('PROXY_BASE_URL is required');
    } else {
        try {
            new URL(proxyConnectionConfig.baseUrl);
        } catch {
            errors.push('PROXY_BASE_URL must be a valid URL');
        }
    }

    // Validate fallback URLs
    for (const url of proxyConnectionConfig.fallbackUrls) {
        try {
            new URL(url);
        } catch {
            errors.push(`Invalid fallback URL: ${url}`);
        }
    }

    // Validate timeout
    if (proxyConnectionConfig.timeoutMs < 1000) {
        errors.push('PROXY_TIMEOUT_MS must be at least 1000ms');
    }

    // Validate retry config
    if (proxyConnectionConfig.retry.retries < 0) {
        errors.push('PROXY_RETRY_COUNT must be non-negative');
    }

    // Validate cache config
    if (proxyCacheConfig.ttlSeconds < 1) {
        errors.push('PROXY_CACHE_TTL_SECONDS must be at least 1');
    }

    // Validate rate limit config
    if (proxyRateLimitConfig.requestsPerMinute < 1) {
        errors.push('PROXY_RATE_LIMIT_RPM must be at least 1');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Log proxy configuration (with sensitive data redacted)
 */
export function logProxyConfig(): void {
    const config = {
        baseUrl: proxyConnectionConfig.baseUrl,
        fallbackUrls: proxyConnectionConfig.fallbackUrls,
        hasApiKey: !!proxyConnectionConfig.apiKey,
        timeoutMs: proxyConnectionConfig.timeoutMs,
        retry: proxyConnectionConfig.retry,
        cache: {
            enabled: proxyCacheConfig.enabled,
            ttlSeconds: proxyCacheConfig.ttlSeconds,
            maxItems: proxyCacheConfig.maxItems,
            hasRedis: !!proxyCacheConfig.redisUrl,
        },
        rateLimit: {
            enabled: proxyRateLimitConfig.enabled,
            requestsPerMinute: proxyRateLimitConfig.requestsPerMinute,
            burstSize: proxyRateLimitConfig.burstSize,
        },
        circuitBreaker: proxyCircuitBreakerConfig,
        loadBalancer: proxyLoadBalancerConfig,
    };

    // eslint-disable-next-line no-console
    console.log('Proxy Configuration:', JSON.stringify(config, null, 2));
}
