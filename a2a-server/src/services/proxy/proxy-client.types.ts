/**
 * Proxy Client Types
 * 
 * Типы для ProxyClient
 */

export interface RetryConfig {
    retries: number;
    delayMs: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableStatuses?: number[];
}

export interface CircuitBreakerConfig {
    enabled: boolean;
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
    halfOpenMaxCalls?: number;
}

export interface LoadBalancerConfig {
    strategy: 'round_robin' | 'least_connections' | 'weighted' | 'priority';
    weights?: Record<string, number>;
    healthCheckIntervalMs?: number;
}

export interface ProxyClientConfig {
    baseUrl: string;
    fallbackUrls?: string[];
    apiKey?: string;
    timeoutMs?: number;
    retry?: RetryConfig;
    cache?: Record<string, unknown>;
    rateLimit?: Record<string, unknown>;
    monitor?: Record<string, unknown>;
    circuitBreaker?: Partial<CircuitBreakerConfig>;
    loadBalancer?: LoadBalancerConfig;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestId?: string;
    sessionId?: string;
    userId?: string;
    signal?: AbortSignal;
    /** Skip cache for this request */
    skipCache?: boolean;
    /** Custom cache TTL in seconds */
    cacheTtl?: number;
    /** Target service for load balancing */
    serviceName?: string;
    /** Priority for request routing */
    priority?: 'low' | 'normal' | 'high';
}

export interface ProxyResponse<T> {
    data: T;
    statusCode: number;
    headers: Record<string, string>;
    fromCache: boolean;
    rateLimit: RateLimitStatus;
    responseTimeMs: number;
}

export interface RateLimitStatus {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
    blocked: boolean;
}
