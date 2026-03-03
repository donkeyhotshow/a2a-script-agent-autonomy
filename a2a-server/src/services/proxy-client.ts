/**
 * Enhanced HTTP client for talking to the external AI proxy (ai-integration).
 *
 * Features:
 * - Multi-level caching (L1 memory, L2 Redis)
 * - Rate limiting (token bucket, per-endpoint, per-user)
 * - Load balancing (round-robin, least-connections, weighted)
 * - Circuit breaker pattern
 * - Comprehensive monitoring and metrics
 * - Retry logic with exponential backoff
 */

import {logger} from '../utils/logger.js';
import {
    ProxyCacheService,
    getProxyCacheService,
    CacheConfig,
} from './proxy-cache.service.js';
import {
    ProxyRateLimiter,
    getProxyRateLimiter,
    RateLimitConfig,
    RateLimitStatus,
} from './proxy-rate-limiter.service.js';
import {
    ProxyMonitor,
    getProxyMonitor,
    MonitorConfig,
    RequestMetric,
} from './proxy-monitor.service.js';

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
    cache?: Partial<CacheConfig>;
    rateLimit?: Partial<RateLimitConfig>;
    monitor?: Partial<MonitorConfig>;
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

export class HttpError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly body?: string,
        public readonly headers?: Record<string, string>
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class CircuitBreakerError extends Error {
    constructor(
        message: string,
        public readonly serviceName: string,
        public readonly state: 'open' | 'half_open'
    ) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class RateLimitError extends Error {
    constructor(
        message: string,
        public readonly retryAfter: number,
        public readonly rateLimitStatus: RateLimitStatus
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}

/**
 * Circuit breaker state machine
 */
class CircuitBreaker {
    private state: 'closed' | 'open' | 'half_open' = 'closed';
    private failures = 0;
    private successes = 0;
    private lastFailureTime?: number;
    private halfOpenCalls = 0;
    private readonly config: Required<CircuitBreakerConfig>;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 3,
            timeoutMs: config.timeoutMs ?? 60000,
            halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
        };
    }

    canExecute(): boolean {
        if (!this.config.enabled) return true;

        if (this.state === 'closed') return true;

        if (this.state === 'open') {
            const now = Date.now();
            if (this.lastFailureTime && now - this.lastFailureTime > this.config.timeoutMs) {
                this.state = 'half_open';
                this.halfOpenCalls = 0;
                logger.info('[CircuitBreaker] transitioning to half_open');
                return true;
            }
            return false;
        }

        // Half-open state
        if (this.halfOpenCalls < this.config.halfOpenMaxCalls) {
            this.halfOpenCalls++;
            return true;
        }

        return false;
    }

    recordSuccess(): void {
        if (!this.config.enabled) return;

        if (this.state === 'half_open') {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                this.close();
            }
        } else {
            this.failures = Math.max(0, this.failures - 1);
        }
    }

    recordFailure(): void {
        if (!this.config.enabled) return;

        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === 'half_open' || this.failures >= this.config.failureThreshold) {
            this.open();
        }
    }

    getState(): 'closed' | 'open' | 'half_open' {
        return this.state;
    }

    private open(): void {
        if (this.state !== 'open') {
            logger.warn('[CircuitBreaker] opening circuit', {
                failures: this.failures,
                threshold: this.config.failureThreshold,
            });
        }
        this.state = 'open';
        this.successes = 0;
        this.halfOpenCalls = 0;
    }

    private close(): void {
        logger.info('[CircuitBreaker] closing circuit');
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.halfOpenCalls = 0;
    }
}

/**
 * Load balancer for multiple proxy endpoints
 */
class LoadBalancer {
    private currentIndex = 0;
    private connectionCounts = new Map<string, number>();
    private healthStatus = new Map<string, 'healthy' | 'unhealthy'>();
    private readonly config: Required<LoadBalancerConfig>;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor(
        private urls: string[],
        config: Partial<LoadBalancerConfig> = {}
    ) {
        this.config = {
            strategy: config.strategy ?? 'round_robin',
            weights: config.weights ?? {},
            healthCheckIntervalMs: config.healthCheckIntervalMs ?? 30000,
        };

        // Initialize health status
        for (const url of urls) {
            this.healthStatus.set(url, 'healthy');
            this.connectionCounts.set(url, 0);
        }

        // Start health checks
        this.startHealthChecks();
    }

    getNextUrl(context?: {priority?: string}): string {
        const healthyUrls = this.urls.filter(url => this.healthStatus.get(url) === 'healthy');
        const urlsToUse = healthyUrls.length > 0 ? healthyUrls : this.urls;

        switch (this.config.strategy) {
            case 'round_robin':
                return this.roundRobin(urlsToUse);
            case 'least_connections':
                return this.leastConnections(urlsToUse);
            case 'weighted':
                return this.weighted(urlsToUse);
            case 'priority':
                return this.priorityBased(urlsToUse, context);
            default:
                return this.roundRobin(urlsToUse);
        }
    }

    startConnection(url: string): void {
        const count = this.connectionCounts.get(url) ?? 0;
        this.connectionCounts.set(url, count + 1);
    }

    endConnection(url: string): void {
        const count = this.connectionCounts.get(url) ?? 0;
        this.connectionCounts.set(url, Math.max(0, count - 1));
    }

    markUnhealthy(url: string): void {
        this.healthStatus.set(url, 'unhealthy');
        logger.warn('[LoadBalancer] marked unhealthy', {url});
    }

    markHealthy(url: string): void {
        this.healthStatus.set(url, 'healthy');
        logger.info('[LoadBalancer] marked healthy', {url});
    }

    getHealthStatus(): Record<string, 'healthy' | 'unhealthy'> {
        return Object.fromEntries(this.healthStatus);
    }

    destroy(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }

    private roundRobin(urls: string[]): string {
        const selected = urls[this.currentIndex % urls.length];
        this.currentIndex = (this.currentIndex + 1) % urls.length;
        return selected;
    }

    private leastConnections(urls: string[]): string {
        return urls.reduce((min, url) => {
            const count = this.connectionCounts.get(url) ?? 0;
            const minCount = this.connectionCounts.get(min) ?? 0;
            return count < minCount ? url : min;
        }, urls[0]);
    }

    private weighted(urls: string[]): string {
        const weights = urls.map(url => this.config.weights[url] ?? 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < urls.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return urls[i];
            }
        }

        return urls[urls.length - 1];
    }

    private priorityBased(urls: string[], context?: {priority?: string}): string {
        // For high priority, use least connections
        if (context?.priority === 'high') {
            return this.leastConnections(urls);
        }
        return this.roundRobin(urls);
    }

    private startHealthChecks(): void {
        this.healthCheckInterval = setInterval(async () => {
            for (const url of this.urls) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`${url}/health`, {
                        method: 'GET',
                        signal: controller.signal,
                    });

                    clearTimeout(timeout);

                    if (response.ok) {
                        this.markHealthy(url);
                    } else {
                        this.markUnhealthy(url);
                    }
                } catch {
                    this.markUnhealthy(url);
                }
            }
        }, this.config.healthCheckIntervalMs);
    }
}

/**
 * Enhanced Proxy Client with caching, rate limiting, load balancing, and monitoring
 */
export class ProxyClient {
    private readonly baseUrl: string;
    private readonly fallbackUrls: string[];
    private readonly apiKey?: string;
    private readonly timeoutMs: number;
    private readonly retry: Required<RetryConfig>;
    private readonly cache: ProxyCacheService;
    private readonly rateLimiter: ProxyRateLimiter;
    private readonly monitor: ProxyMonitor;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly loadBalancer: LoadBalancer;

    constructor(config: ProxyClientConfig) {
        if (!config.baseUrl) {
            throw new Error('ProxyClient: baseUrl is required');
        }

        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.fallbackUrls = (config.fallbackUrls ?? []).map(url => url.replace(/\/+$/, ''));
        this.apiKey = config.apiKey;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.retry = {
            retries: config.retry?.retries ?? 2,
            delayMs: config.retry?.delayMs ?? 1_000,
            maxDelayMs: config.retry?.maxDelayMs ?? 30_000,
            backoffMultiplier: config.retry?.backoffMultiplier ?? 2,
            retryableStatuses: config.retry?.retryableStatuses ?? [408, 429, 500, 502, 503, 504],
        };

        // Initialize services
        this.cache = getProxyCacheService(config.cache);
        this.rateLimiter = getProxyRateLimiter(config.rateLimit);
        this.monitor = getProxyMonitor(config.monitor);
        this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

        // Initialize load balancer if fallback URLs provided
        const allUrls = [this.baseUrl, ...this.fallbackUrls];
        this.loadBalancer = new LoadBalancer(allUrls, config.loadBalancer);

        logger.info('[ProxyClient] initialized', {
            baseUrl: this.baseUrl,
            fallbackCount: this.fallbackUrls.length,
            strategy: config.loadBalancer?.strategy ?? 'round_robin',
            caching: this.cache.isEnabled(),
            rateLimiting: config.rateLimit?.enabled ?? true,
        });
    }

    async sendJson<TResponse>(
        endpoint: string,
        payload: unknown,
        options: RequestOptions = {}
    ): Promise<ProxyResponse<TResponse>> {
        const startTime = Date.now();
        const requestId = options.requestId ?? this.generateRequestId();

        // Check rate limit
        const rateLimitStatus = this.rateLimiter.check({
            endpoint,
            userId: options.userId,
            requestId,
        });

        if (!rateLimitStatus.allowed) {
            throw new RateLimitError(
                `Rate limit exceeded. Retry after ${rateLimitStatus.retryAfter} seconds`,
                rateLimitStatus.retryAfter ?? 60,
                rateLimitStatus
            );
        }

        // Check circuit breaker
        if (!this.circuitBreaker.canExecute()) {
            throw new CircuitBreakerError(
                'Circuit breaker is open',
                options.serviceName ?? 'default',
                this.circuitBreaker.getState() as 'open' | 'half_open'
            );
        }

        // Check cache
        const cacheKey = this.cache.buildKey(endpoint, payload);
        if (!options.skipCache && this.cache.isEnabled()) {
            const cached = await this.cache.get<TResponse>(cacheKey);
            if (cached !== undefined) {
                const responseTime = Date.now() - startTime;
                this.recordMetric({
                    timestamp: startTime,
                    endpoint,
                    method: options.method ?? 'POST',
                    statusCode: 200,
                    latencyMs: responseTime,
                    success: true,
                    requestId,
                    userId: options.userId,
                    serviceName: options.serviceName,
                });

                return {
                    data: cached,
                    statusCode: 200,
                    headers: {'X-Cache': 'HIT'},
                    fromCache: true,
                    rateLimit: rateLimitStatus,
                    responseTimeMs: responseTime,
                };
            }
        }

        // Select URL using load balancer
        const url = this.loadBalancer.getNextUrl({priority: options.priority});
        const fullUrl = `${url}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        // Execute request
        try {
            const result = await this.executeRequest<TResponse>(
                fullUrl,
                payload,
                options,
                requestId,
                startTime
            );

            // Cache successful response
            if (!options.skipCache && this.cache.isEnabled()) {
                await this.cache.set(cacheKey, result.data, options.cacheTtl);
            }

            // Record success in circuit breaker
            this.circuitBreaker.recordSuccess();
            this.loadBalancer.markHealthy(url);

            return {
                ...result,
                rateLimit: rateLimitStatus,
                fromCache: false,
            };
        } catch (error) {
            // Record failure in circuit breaker
            this.circuitBreaker.recordFailure();

            // Mark unhealthy on server errors
            if (error instanceof HttpError && error.statusCode >= 500) {
                this.loadBalancer.markUnhealthy(url);
            }

            throw error;
        }
    }

    /**
     * Get current metrics snapshot
     */
    getMetrics(): ReturnType<ProxyMonitor['getSnapshot']> {
        return this.monitor.getSnapshot();
    }

    /**
     * Get service health status
     */
    getServiceHealth(): Record<string, 'healthy' | 'unhealthy'> {
        return this.loadBalancer.getHealthStatus();
    }

    /**
     * Get circuit breaker state
     */
    getCircuitBreakerState(): 'closed' | 'open' | 'half_open' {
        return this.circuitBreaker.getState();
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Reset rate limits
     */
    resetRateLimits(): void {
        this.rateLimiter.resetAll();
    }

    /**
     * Destroy the client and cleanup resources
     */
    destroy(): void {
        this.loadBalancer.destroy();
        this.rateLimiter.destroy();
    }

    private async executeRequest<TResponse>(
        url: string,
        payload: unknown,
        options: RequestOptions,
        requestId: string,
        startTime: number
    ): Promise<Omit<ProxyResponse<TResponse>, 'rateLimit' | 'fromCache'>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        if (requestId) {
            headers['X-Request-ID'] = requestId;
        }
        if (options.sessionId) {
            headers['X-Session-ID'] = options.sessionId;
        }
        if (options.userId) {
            headers['X-User-ID'] = options.userId;
        }
        if (options.priority) {
            headers['X-Priority'] = options.priority;
        }

        const method = options.method ?? 'POST';
        const body = method === 'GET' ? undefined : JSON.stringify(payload);

        const attemptRequest = async (): Promise<ProxyResponse<TResponse>> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const res = await fetch(url, {
                    method,
                    headers,
                    body,
                    signal: options.signal ?? controller.signal,
                });

                const responseTime = Date.now() - startTime;
                const responseHeaders: Record<string, string> = {};
                res.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                // Handle HTTP errors
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new HttpError(
                        `Proxy request failed with status ${res.status}`,
                        res.status,
                        text || undefined,
                        responseHeaders
                    );
                }

                const data = (await res.json()) as TResponse;

                this.recordMetric({
                    timestamp: startTime,
                    endpoint: url,
                    method,
                    statusCode: res.status,
                    latencyMs: responseTime,
                    success: true,
                    requestId,
                    userId: options.userId,
                    serviceName: options.serviceName,
                });

                return {
                    data,
                    statusCode: res.status,
                    headers: responseHeaders,
                    fromCache: false,
                    rateLimit: {allowed: true, remaining: Infinity, resetTime: 0, limit: Infinity, blocked: false},
                    responseTimeMs: responseTime,
                };
            } finally {
                clearTimeout(timeout);
            }
        };

        return this.performWithRetry(attemptRequest, {url, method, startTime, options, requestId});
    }

    private async performWithRetry<T>(
        fn: () => Promise<T>,
        context: {
            url: string;
            method: string;
            startTime: number;
            options: RequestOptions;
            requestId: string;
        }
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= this.retry.retries; attempt += 1) {
            try {
                if (attempt > 0) {
                    logger.warn('[ProxyClient] retrying request', {
                        attempt,
                        url: context.url,
                        method: context.method,
                    });
                }
                return await fn();
            } catch (error) {
                lastError = error;

                const isLastAttempt = attempt === this.retry.retries;
                if (isLastAttempt || !this.shouldRetry(error)) {
                    break;
                }

                const delayMs = Math.min(
                    this.retry.delayMs * Math.pow(this.retry.backoffMultiplier, attempt),
                    this.retry.maxDelayMs
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        // Record final failure
        const errorStatusCode = lastError instanceof HttpError ? lastError.statusCode : 0;
        const errorType = lastError instanceof Error ? lastError.name : 'Unknown';

        this.recordMetric({
            timestamp: context.startTime,
            endpoint: context.url,
            method: context.method,
            statusCode: errorStatusCode,
            latencyMs: Date.now() - context.startTime,
            success: false,
            errorType,
            requestId: context.requestId,
            userId: context.options.userId,
            serviceName: context.options.serviceName,
        });

        logger.error('[ProxyClient] request failed', {
            url: context.url,
            method: context.method,
            error: String(lastError),
        });

        throw lastError instanceof Error
            ? lastError
            : new Error(`ProxyClient request failed: ${String(lastError)}`);
    }

    private shouldRetry(error: unknown): boolean {
        if (error instanceof HttpError) {
            return this.retry.retryableStatuses.includes(error.statusCode);
        }

        if (error instanceof CircuitBreakerError) {
            return false;
        }

        if (error instanceof RateLimitError) {
            // Retry on rate limit if retry-after is reasonable
            return error.retryAfter < 30;
        }

        // Network/timeout errors are retryable
        return true;
    }

    private recordMetric(metric: RequestMetric): void {
        this.monitor.record(metric);
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
