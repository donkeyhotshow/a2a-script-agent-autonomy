/**
 * Proxy services index - unified exports for Server-Proxy Integration.
 *
 * This module provides all services needed for A2A Server integration
 * with External AI Hub Proxy, including caching, rate limiting,
 * monitoring, and the enhanced HTTP client.
 */

// Export cache service
export {
    ProxyCacheService,
    buildCacheKey,
    getProxyCacheService,
    resetProxyCacheService,
    type CacheConfig,
    type CacheEntry,
    type CacheStats,
} from './proxy-cache.service.js';

// Export rate limiter service
export {
    ProxyRateLimiter,
    getProxyRateLimiter,
    resetProxyRateLimiter,
    type RateLimitConfig,
    type RateLimitStatus,
} from './proxy-rate-limiter.service.js';

// Export monitor service
export {
    ProxyMonitor,
    getProxyMonitor,
    resetProxyMonitor,
    type MonitorConfig,
    type RequestMetric,
    type ServiceHealth,
    type AlertEvent,
    type MetricsSnapshot,
    type EndpointMetrics,
} from './proxy-monitor.service.js';

// Export enhanced proxy client
export {
    ProxyClient,
    HttpError,
    CircuitBreakerError,
    RateLimitError,
    type ProxyClientConfig,
    type RetryConfig,
    type CircuitBreakerConfig,
    type LoadBalancerConfig,
    type RequestOptions,
    type ProxyResponse,
} from './proxy-client.js';
