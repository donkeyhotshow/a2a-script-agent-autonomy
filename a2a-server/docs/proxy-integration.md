# Server-Proxy Integration Documentation

## Overview

This document describes the integration between A2A Server and External AI Hub Proxy, providing a unified AI service orchestration system with advanced features like load balancing, caching, and monitoring.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   A2A Server    │    │  External AI     │    │   AI Services   │
│   (Node.js)     │───▶│  Hub Proxy       │───▶│                 │
│                 │    │  (Python)        │    │  • OpenAI       │
│  • Routes       │    │                   │    │  • Local LLM upstream       │
│  • Services     │    │  • Load Balancer  │    │  • Custom APIs  │
│  • Middleware   │    │  • Caching        │    │  • Fallbacks    │
│  • Config       │    │  • Rate Limiting  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Session       │    │   Service        │    │   Monitoring    │
│   Management    │    │   Discovery      │    │   & Logging     │
│                 │    │                   │    │                 │
│  • Session      │    │  • Health Checks │    │  • Metrics      │
│    Storage      │    │  • Auto-scaling  │    │  • Error Logs   │
│  • Context      │    │  • Failover      │    │  • Performance  │
│    Management   │    │  • Circuit       │    │                 │
│  • State        │    │    Breakers      │    │                 │
│    Persistence  │    │                   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. ProxyClient

Enhanced HTTP client with the following features:

- **Retry Logic**: Exponential backoff with configurable retries
- **Circuit Breaker**: Prevents cascading failures
- **Load Balancing**: Multiple strategies (round-robin, least-connections, weighted)
- **Caching**: Multi-level caching (L1 memory, L2 Redis)
- **Rate Limiting**: Token bucket algorithm with per-endpoint/user limits
- **Monitoring**: Comprehensive metrics and alerting

```typescript
import {ProxyClient, getProxyClientConfig} from './services/proxy.index.js';

const client = new ProxyClient(getProxyClientConfig());

// Send request
const response = await client.sendJson('/api/v1/generate', {
    model: 'qwen3:8b',
    prompt: 'Hello, world!',
});

// Access metrics
const metrics = client.getMetrics();
console.log(`Error rate: ${metrics.errorRate}`);
```

### 2. Cache Service

Multi-level caching implementation:

```typescript
import {getProxyCacheService} from './services/proxy.index.js';

const cache = getProxyCacheService();

// Get cached value
const cached = await cache.get('my-key');

// Set value with TTL
await cache.set('my-key', {data: 'value'}, 300);

// Get cache stats
const stats = cache.getStats();
console.log(`Cache hits: ${stats.hits}, misses: ${stats.misses}`);
```

### 3. Rate Limiter

Token bucket rate limiting:

```typescript
import {getProxyRateLimiter} from './services/proxy.index.js';

const limiter = getProxyRateLimiter();

// Check rate limit
const status = limiter.check({
    endpoint: '/api/v1/generate',
    userId: 'user-123',
});

if (!status.allowed) {
    console.log(`Rate limited. Retry after: ${status.retryAfter}s`);
}
```

### 4. Monitor Service

Metrics collection and alerting:

```typescript
import {getProxyMonitor} from './services/proxy.index.js';

const monitor = getProxyMonitor({
    onAlert: (alert) => {
        console.error(`ALERT: ${alert.message}`);
    },
});

// Get metrics snapshot
const snapshot = monitor.getSnapshot();
console.log(`P95 latency: ${snapshot.p95Latency}ms`);
```

## Configuration

### Environment Variables

```bash
# Connection Settings
PROXY_BASE_URL=http://localhost:5000
PROXY_FALLBACK_URLS=["http://proxy2:5000","http://proxy3:5000"]
PROXY_API_KEY=your-api-key
PROXY_TIMEOUT_MS=30000

# Retry Configuration
PROXY_RETRY_COUNT=2
PROXY_RETRY_DELAY_MS=1000
PROXY_RETRY_MAX_DELAY_MS=30000
PROXY_RETRY_BACKOFF_MULTIPLIER=2

# Cache Configuration (in-memory only)
PROXY_CACHE_ENABLED=true
PROXY_CACHE_TTL_SECONDS=300
PROXY_CACHE_MAX_ITEMS=1000
PROXY_CACHE_KEY_PREFIX=a2a:proxy

# Note: Redis L2 cache removed - server is stateless

# Rate Limiting
PROXY_RATE_LIMIT_ENABLED=true
PROXY_RATE_LIMIT_RPM=1000
PROXY_RATE_LIMIT_BURST=100
PROXY_RATE_LIMIT_BLOCK_DURATION=60

# Circuit Breaker
PROXY_CIRCUIT_BREAKER_ENABLED=true
PROXY_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
PROXY_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
PROXY_CIRCUIT_BREAKER_TIMEOUT_MS=60000

# Load Balancer
PROXY_LB_STRATEGY=round_robin
PROXY_LB_WEIGHTS={"http://proxy1:5000":2,"http://proxy2:5000":1}
PROXY_LB_HEALTH_CHECK_INTERVAL_MS=30000

# Monitoring
PROXY_MONITOR_ENABLED=true
PROXY_MONITOR_RETENTION_MINUTES=60
PROXY_MONITOR_LATENCY_HISTOGRAM=true
PROXY_MONITOR_ERROR_THRESHOLD=0.1
PROXY_MONITOR_LATENCY_THRESHOLD=5000
```

### Configuration File

```typescript
import {getProxyClientConfig} from './config/proxy.config.js';

const config = getProxyClientConfig();
// Returns complete configuration object
```

## Usage Examples

### Basic Request

```typescript
import {ProxyClient} from './services/proxy.index.js';
import {getProxyClientConfig} from './config/proxy.config.js';

const client = new ProxyClient(getProxyClientConfig());

try {
    const response = await client.sendJson('/api/v1/generate', {
        model: 'qwen3:8b',
        prompt: 'Explain quantum computing',
    });

    console.log('Response:', response.data);
    console.log('From cache:', response.fromCache);
    console.log('Response time:', response.responseTimeMs);
} catch (error) {
    if (error instanceof RateLimitError) {
        console.error('Rate limited:', error.retryAfter);
    } else if (error instanceof CircuitBreakerError) {
        console.error('Circuit open:', error.serviceName);
    } else {
        console.error('Request failed:', error);
    }
}
```

### With Caching Options

```typescript
const response = await client.sendJson(
    '/api/v1/generate',
    {model: 'qwen3:8b', prompt: 'Hello'},
    {
        // Skip cache for this request
        skipCache: false,
        // Custom cache TTL
        cacheTtl: 600,
        // Request metadata
        requestId: 'req-123',
        userId: 'user-456',
    }
);
```

### With Priority Routing

```typescript
const response = await client.sendJson(
    '/api/v1/generate',
    {model: 'qwen3:8b', prompt: 'Urgent request'},
    {
        priority: 'high',
        serviceName: 'llm-primary',
    }
);
```

### Monitoring and Metrics

```typescript
// Get comprehensive metrics
const metrics = client.getMetrics();

console.log('Total requests:', metrics.totalRequests);
console.log('Error rate:', metrics.errorRate);
console.log('Average latency:', metrics.averageLatency);
console.log('P95 latency:', metrics.p95Latency);
console.log('P99 latency:', metrics.p99Latency);

// Service health
const health = client.getServiceHealth();
for (const [service, status] of Object.entries(health)) {
    console.log(`${service}: ${status}`);
}

// Circuit breaker state
console.log('Circuit state:', client.getCircuitBreakerState());
```

### Cleanup

```typescript
// Clear cache
client.clearCache();

// Reset rate limits
client.resetRateLimits();

// Destroy client and cleanup resources
client.destroy();
```

## Load Balancing Strategies

### Round Robin (default)

```typescript
const client = new ProxyClient({
    baseUrl: 'http://proxy1:5000',
    fallbackUrls: ['http://proxy2:5000', 'http://proxy3:5000'],
    loadBalancer: {
        strategy: 'round_robin',
    },
});
```

### Least Connections

```typescript
loadBalancer: {
    strategy: 'least_connections',
}
```

### Weighted

```typescript
loadBalancer: {
    strategy: 'weighted',
    weights: {
        'http://proxy1:5000': 3,
        'http://proxy2:5000': 2,
        'http://proxy3:5000': 1,
    },
}
```

### Priority-Based

```typescript
// High priority requests use least connections
const response = await client.sendJson(
    '/api/v1/generate',
    payload,
    {priority: 'high'}
);
```

## Circuit Breaker States

```
CLOSED  ──failure──▶  OPEN  ──timeout──▶  HALF_OPEN
   ▲                    │                       │
   │                    │                       │
   └──success───────────┴────────success────────┘
```

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Circuit is open, requests fail fast
- **HALF_OPEN**: Testing if service has recovered

## Error Handling

```typescript
try {
    const response = await client.sendJson('/api/v1/generate', payload);
} catch (error) {
    if (error instanceof HttpError) {
        // HTTP error (4xx, 5xx)
        console.error('HTTP Error:', error.statusCode, error.body);
    } else if (error instanceof RateLimitError) {
        // Rate limit exceeded
        console.error('Rate limited. Retry after:', error.retryAfter);
    } else if (error instanceof CircuitBreakerError) {
        // Circuit breaker is open
        console.error('Service temporarily unavailable:', error.serviceName);
    } else {
        // Unknown error
        console.error('Unexpected error:', error);
    }
}
```

## Integration with A2A Server

### Service Registration

```typescript
// In your service initialization
import {ProxyClient} from '../services/proxy.index.js';
import {getProxyClientConfig, validateProxyConfig} from '../config/proxy.config.js';

export class AIService {
    private proxyClient: ProxyClient;

    constructor() {
        const validation = validateProxyConfig();
        if (!validation.valid) {
            throw new Error(`Invalid proxy config: ${validation.errors.join(', ')}`);
        }

        this.proxyClient = new ProxyClient(getProxyClientConfig());
    }

    async generateText(prompt: string): Promise<string> {
        const response = await this.proxyClient.sendJson('/api/v1/generate', {
            model: 'qwen3:8b',
            prompt,
        });
        return response.data.text;
    }
}
```

### Health Check Endpoint

```typescript
app.get('/health/proxy', async (req, res) => {
    const health = client.getServiceHealth();
    const metrics = client.getMetrics();
    const circuitState = client.getCircuitBreakerState();

    res.json({
        status: Object.values(health).some(h => h === 'unhealthy') ? 'degraded' : 'healthy',
        services: health,
        circuitBreaker: circuitState,
        metrics: {
            errorRate: metrics.errorRate,
            averageLatency: metrics.averageLatency,
        },
    });
});
```

## Performance Tuning

### Cache Optimization

```typescript
// Increase cache size for high-throughput scenarios
const cache = getProxyCacheService({
    maxItems: 5000,
    ttlSeconds: 600,
});

// Note: Redis L2 cache removed - server is stateless
// All caching is in-memory only (L1)
```

### Retry Configuration

```typescript
// Aggressive retry for critical services
const client = new ProxyClient({
    retry: {
        retries: 5,
        delayMs: 500,
        backoffMultiplier: 1.5,
        maxDelayMs: 10000,
    },
});
```

### Rate Limit Tuning

```typescript
// Higher limits for internal services
const limiter = getProxyRateLimiter({
    requestsPerMinute: 5000,
    burstSize: 500,
    endpointLimits: {
        '/api/v1/generate': {rpm: 2000, burst: 200},
        '/api/v1/embeddings': {rpm: 1000, burst: 100},
    },
});
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Increase `PROXY_TIMEOUT_MS`
   - Check network connectivity
   - Verify proxy is running

2. **High Error Rate**
   - Check circuit breaker state
   - Review service health
   - Analyze error logs

3. **Cache Misses**
   - Verify cache is enabled
   - Check TTL settings
   - Monitor cache stats

4. **Rate Limiting**
   - Adjust rate limits
   - Check per-user limits
   - Review endpoint-specific limits

### Debugging

```typescript
// Enable debug logging
import {logger} from './utils/logger.js';
logger.level = 'debug';

// Log proxy configuration
import {logProxyConfig} from './config/proxy.config.js';
logProxyConfig();

// Monitor metrics in real-time
setInterval(() => {
    const metrics = client.getMetrics();
    console.log(`RPS: ${metrics.requestsPerMinute}, Error: ${(metrics.errorRate * 100).toFixed(2)}%`);
}, 10000);
```

## Migration Guide

### From Basic Proxy Client

```typescript
// Before
import {ProxyClient} from './services/proxy-client.js';
const client = new ProxyClient({baseUrl: 'http://localhost:5000'});

// After
import {ProxyClient} from './services/proxy.index.js';
import {getProxyClientConfig} from './config/proxy.config.js';
const client = new ProxyClient(getProxyClientConfig());
```

### Adding Caching

```typescript
// Existing code works, caching is automatic
const response = await client.sendJson('/api/v1/generate', payload);
// Check if from cache
console.log('Cached:', response.fromCache);
```

## API Reference

See inline JSDoc comments in:
- `src/services/proxy-client.ts`
- `src/services/proxy-cache.service.ts`
- `src/services/proxy-rate-limiter.service.ts`
- `src/services/proxy-monitor.service.ts`
