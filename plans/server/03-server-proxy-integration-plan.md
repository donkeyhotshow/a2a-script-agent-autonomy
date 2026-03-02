# Server-Proxy Integration Architecture Plan

## Overview

This plan outlines the integration between the A2A Server (`a2a-server`) and the External AI Hub proxy (`ai-integration`) to create a unified AI service orchestration system with load balancing, caching, and advanced routing capabilities.

## Current State Analysis

### A2A Server Architecture
```
a2a-server/
├── src/
│   ├── app.ts              # Main application
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── middleware/        # Request processing
│   └── config/           # Configuration
├── prisma/               # Database schema
└── docs/                # API documentation
```

### External AI Hub Proxy
```
ai-integration/
├── proxy/               # Main proxy implementation
├── scripts/            # Utility scripts
├── tests/              # Proxy tests
├── docs/               # Proxy documentation
└── requirements.txt    # Python dependencies
```

### Current Integration Points
- Server makes direct AI service calls
- No centralized proxy layer
- Limited load balancing and caching
- No unified service discovery

## Integration Architecture

### 1. Proxy-Server Communication Flow

```
A2A Server (Node.js)
    ↓ HTTP/REST
External AI Hub Proxy (Python)
    ↓ Service Discovery & Load Balancing
Multiple AI Services:
├── OpenAI API
├── Local LLM (Ollama)
├── Custom AI Services
└── Caching Layer
```

### 2. Enhanced Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   A2A Server    │    │  External AI     │    │   AI Services   │
│   (Node.js)     │───▶│  Hub Proxy       │───▶│                 │
│                 │    │  (Python)        │    │  • OpenAI       │
│  • Routes       │    │                   │    │  • Ollama       │
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

## Core Components

### 1. Proxy Service Enhancement

#### Enhanced Proxy Configuration
```python
# ai-integration/proxy/config.py
class ProxyConfig:
    def __init__(self):
        self.services = {
            'openai': {
                'url': os.getenv('OPENAI_API_URL', 'https://api.openai.com/v1'),
                'api_key': os.getenv('OPENAI_API_KEY'),
                'timeout': 30,
                'retries': 3,
                'rate_limit': 60  # requests per minute
            },
            'ollama': {
                'url': os.getenv('OLLAMA_URL', 'http://localhost:11434'),
                'timeout': 60,
                'retries': 2,
                'rate_limit': 100
            },
            'custom': {
                'url': os.getenv('CUSTOM_AI_URL'),
                'timeout': 45,
                'retries': 3,
                'rate_limit': 50
            }
        }
        
        self.load_balancing = {
            'strategy': 'round_robin',  # round_robin, least_connections, weighted
            'health_check_interval': 30,
            'failure_threshold': 3,
            'recovery_threshold': 2
        }
        
        self.caching = {
            'enabled': True,
            'ttl': 300,  # 5 minutes
            'max_size': 1000,
            'strategy': 'lru'  # lru, ttl, hybrid
        }
        
        self.rate_limiting = {
            'enabled': True,
            'requests_per_minute': 1000,
            'burst_size': 100,
            'block_duration': 60
        }
```

#### Service Discovery and Health Monitoring
```python
# ai-integration/proxy/service_discovery.py
class ServiceDiscovery:
    def __init__(self, config: ProxyConfig):
        self.config = config
        self.services = {}
        self.health_status = {}
        self.load_balancer = LoadBalancer(config.load_balancing)
        
    async def register_service(self, service_name: str, service_config: dict):
        """Register a new AI service"""
        self.services[service_name] = service_config
        self.health_status[service_name] = {
            'status': 'unknown',
            'last_check': None,
            'failures': 0,
            'successes': 0
        }
        
        # Start health check
        asyncio.create_task(self._health_check(service_name))
        
    async def _health_check(self, service_name: str):
        """Monitor service health"""
        while True:
            try:
                service_config = self.services[service_name]
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{service_config['url']}/health",
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        if response.status == 200:
                            self._update_health(service_name, True)
                        else:
                            self._update_health(service_name, False)
            except Exception as e:
                self._update_health(service_name, False, str(e))
            
            await asyncio.sleep(self.config.load_balancing['health_check_interval'])
    
    def _update_health(self, service_name: str, healthy: bool, error=None):
        """Update service health status"""
        status = self.health_status[service_name]
        if healthy:
            status['successes'] += 1
            status['failures'] = 0
            status['status'] = 'healthy'
        else:
            status['failures'] += 1
            status['successes'] = 0
            status['status'] = 'unhealthy'
            status['last_error'] = error
        
        status['last_check'] = datetime.now()
```

#### Load Balancer Implementation
```python
# ai-integration/proxy/load_balancer.py
class LoadBalancer:
    def __init__(self, config: dict):
        self.strategy = config['strategy']
        self.service_weights = config.get('weights', {})
        self.connection_counts = defaultdict(int)
        self.last_used = {}
        
    def select_service(self, available_services: list, request_context: dict = None) -> str:
        """Select the best service based on strategy"""
        if self.strategy == 'round_robin':
            return self._round_robin(available_services)
        elif self.strategy == 'least_connections':
            return self._least_connections(available_services)
        elif self.strategy == 'weighted':
            return self._weighted_round_robin(available_services)
        elif self.strategy == 'priority':
            return self._priority_based(available_services, request_context)
        else:
            return random.choice(available_services)
    
    def _round_robin(self, services: list) -> str:
        """Round robin service selection"""
        current_service = getattr(self, '_rr_counter', 0)
        selected = services[current_service % len(services)]
        self._rr_counter = (current_service + 1) % len(services)
        return selected
    
    def _least_connections(self, services: list) -> str:
        """Select service with least active connections"""
        return min(services, key=lambda s: self.connection_counts[s])
    
    def _weighted_round_robin(self, services: list) -> str:
        """Weighted round robin based on service weights"""
        weights = [self.service_weights.get(s, 1) for s in services]
        total_weight = sum(weights)
        random_weight = random.randint(1, total_weight)
        
        current_weight = 0
        for service, weight in zip(services, weights):
            current_weight += weight
            if current_weight >= random_weight:
                return service
        return services[0]
    
    def _priority_based(self, services: list, context: dict) -> str:
        """Select service based on request priority and context"""
        # Implementation based on request type, user priority, etc.
        if context and context.get('priority') == 'high':
            # Prefer faster services for high priority
            return self._select_by_latency(services)
        else:
            # Use cost-based selection for normal priority
            return self._select_by_cost(services)
```

### 2. Enhanced A2A Server Integration

#### Proxy Client Implementation
```typescript
// a2a-server/src/services/proxy-client.ts
export class ProxyClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryConfig: RetryConfig;
  
  constructor(config: ProxyConfig) {
    this.baseUrl = config.proxyUrl;
    this.apiKey = config.proxyApiKey;
    this.timeout = config.timeout || 30000;
    this.retryConfig = config.retry || { retries: 3, delay: 1000 };
  }
  
  async sendRequest<T>(
    endpoint: string, 
    payload: any, 
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestConfig: AxiosRequestConfig = {
      method: options.method || 'POST',
      url,
      data: payload,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Request-ID': options.requestId || generateRequestId(),
        'X-Session-ID': options.sessionId,
        'X-User-ID': options.userId
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };
    
    try {
      const response = await this.makeRequestWithRetry(requestConfig);
      return response.data;
    } catch (error) {
      this.handleRequestError(error, endpoint);
      throw error;
    }
  }
  
  private async makeRequestWithRetry(config: AxiosRequestConfig): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.retries; attempt++) {
      try {
        const response = await axios.request(config);
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.retryConfig.retries) {
          break;
        }
        
        if (this.shouldRetry(error)) {
          await this.delay(this.retryConfig.delay * Math.pow(2, attempt));
          continue;
        }
        
        break;
      }
    }
    
    throw lastError!;
  }
  
  private shouldRetry(error: any): boolean {
    // Don't retry on client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    // Retry on network errors, timeouts, and server errors (5xx)
    return true;
  }
}
```

#### Enhanced AI Service Integration
```typescript
// a2a-server/src/services/ai-service.ts
export class AIService {
  private proxyClient: ProxyClient;
  private cache: LRUCache<string, any>;
  private metrics: MetricsCollector;
  
  constructor(config: AIServiceConfig) {
    this.proxyClient = new ProxyClient(config.proxy);
    this.cache = new LRUCache({
      max: config.cache.maxSize || 1000,
      ttl: config.cache.ttl || 300000 // 5 minutes
    });
    this.metrics = new MetricsCollector();
  }
  
  async generateText(
    prompt: string, 
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const cacheKey = this.generateCacheKey('generate', prompt, options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.increment('cache_hits');
      return cached;
    }
    
    this.metrics.increment('cache_misses');
    
    const startTime = Date.now();
    const payload = {
      type: 'text_generation',
      prompt,
      options: {
        model: options.model || 'gpt-3.5-turbo',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1.0,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      }
    };
    
    try {
      const result = await this.proxyClient.sendRequest<GenerationResult>(
        '/api/v1/generate',
        payload,
        {
          requestId: generateRequestId(),
          sessionId: options.sessionId,
          userId: options.userId
        }
      );
      
      // Cache successful results
      this.cache.set(cacheKey, result);
      
      const duration = Date.now() - startTime;
      this.metrics.recordGeneration(duration, result.tokens_used || 0);
      
      return result;
    } catch (error) {
      this.metrics.recordError(error);
      throw error;
    }
  }
  
  async embedText(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    const cacheKey = this.generateCacheKey('embed', text, options);
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.increment('cache_hits');
      return cached;
    }
    
    this.metrics.increment('cache_misses');
    
    const payload = {
      type: 'embedding',
      text,
      options: {
        model: options.model || 'text-embedding-ada-002',
        dimensions: options.dimensions
      }
    };
    
    try {
      const result = await this.proxyClient.sendRequest<EmbeddingResult>(
        '/api/v1/embed',
        payload,
        { requestId: generateRequestId() }
      );
      
      this.cache.set(cacheKey, result);
      this.metrics.recordEmbedding(Date.now() - startTime);
      
      return result;
    } catch (error) {
      this.metrics.recordError(error);
      throw error;
    }
  }
  
  private generateCacheKey(type: string, input: string, options: any): string {
    const keyData = {
      type,
      input: input.substring(0, 100), // Limit input length for cache key
      options: {
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature
      }
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }
}
```

### 3. Caching and Performance Optimization

#### Multi-Level Caching Strategy
```python
# ai-integration/proxy/caching.py
class MultiLevelCache:
    def __init__(self, config: dict):
        self.config = config
        self.l1_cache = LRUCache(maxsize=config['l1_size'])  # In-memory
        self.l2_cache = RedisCache(config['redis_url'])       # Redis
        self.l3_cache = FileCache(config['cache_dir'])        # File system
        
    async def get(self, key: str) -> Optional[CacheEntry]:
        # L1: In-memory cache (fastest)
        result = self.l1_cache.get(key)
        if result:
            self._update_access_stats('l1_hit')
            return result
            
        # L2: Redis cache
        result = await self.l2_cache.get(key)
        if result:
            self._update_access_stats('l2_hit')
            # Promote to L1
            self.l1_cache.set(key, result)
            return result
            
        # L3: File cache
        result = await self.l3_cache.get(key)
        if result:
            self._update_access_stats('l3_hit')
            # Promote to L1 and L2
            self.l1_cache.set(key, result)
            await self.l2_cache.set(key, result)
            return result
            
        self._update_access_stats('miss')
        return None
        
    async def set(self, key: str, value: CacheEntry):
        # Set in all cache levels
        self.l1_cache.set(key, value)
        await self.l2_cache.set(key, value)
        await self.l3_cache.set(key, value)
        
    def _update_access_stats(self, level: str):
        # Update cache access statistics
        pass
```

#### Intelligent Cache Invalidation
```python
# ai-integration/proxy/cache_invalidator.py
class CacheInvalidator:
    def __init__(self, cache: MultiLevelCache):
        self.cache = cache
        self.invalidation_rules = {}
        
    def add_invalidation_rule(self, pattern: str, callback: Callable):
        """Add cache invalidation rule"""
        self.invalidation_rules[pattern] = callback
        
    async def invalidate_by_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        keys_to_invalidate = []
        
        # Check L1 cache
        for key in list(self.cache.l1_cache.cache.keys()):
            if re.match(pattern, key):
                keys_to_invalidate.append(key)
                
        # Invalidate in all cache levels
        for key in keys_to_invalidate:
            await self.cache.l1_cache.delete(key)
            await self.cache.l2_cache.delete(key)
            await self.cache.l3_cache.delete(key)
            
    async def invalidate_related(self, key: str):
        """Invalidate cache entries related to the given key"""
        for pattern, callback in self.invalidation_rules.items():
            if callback(key):
                await self.invalidate_by_pattern(pattern)
```

### 4. Monitoring and Observability

#### Comprehensive Metrics Collection
```python
# ai-integration/proxy/metrics.py
class MetricsCollector:
    def __init__(self):
        self.metrics = {
            'requests_total': Counter('proxy_requests_total', 'Total requests'),
            'requests_duration': Histogram('proxy_request_duration_seconds', 'Request duration'),
            'cache_hits': Counter('proxy_cache_hits_total', 'Cache hits'),
            'cache_misses': Counter('proxy_cache_misses_total', 'Cache misses'),
            'service_health': Gauge('proxy_service_health', 'Service health status'),
            'error_rate': Counter('proxy_error_total', 'Total errors')
        }
        
    def record_request(self, service: str, duration: float, status: str):
        """Record request metrics"""
        self.metrics['requests_total'].labels(service=service, status=status).inc()
        self.metrics['requests_duration'].labels(service=service).observe(duration)
        
    def record_cache_hit(self, cache_level: str):
        """Record cache hit"""
        self.metrics['cache_hits'].labels(level=cache_level).inc()
        
    def record_cache_miss(self):
        """Record cache miss"""
        self.metrics['cache_misses'].inc()
        
    def update_service_health(self, service: str, healthy: bool):
        """Update service health status"""
        self.metrics['service_health'].labels(service=service).set(1 if healthy else 0)
        
    def record_error(self, service: str, error_type: str):
        """Record error metrics"""
        self.metrics['error_rate'].labels(service=service, type=error_type).inc()
```

#### Real-time Dashboard
```python
# ai-integration/proxy/dashboard.py
class ProxyDashboard:
    def __init__(self, metrics: MetricsCollector):
        self.metrics = metrics
        self.app = FastAPI()
        self.setup_routes()
        
    def setup_routes(self):
        @self.app.get("/metrics")
        async def get_metrics():
            """Get current metrics"""
            return {
                'requests_total': self.metrics.get_counter_value('requests_total'),
                'avg_response_time': self.metrics.get_avg_response_time(),
                'cache_hit_rate': self.metrics.get_cache_hit_rate(),
                'service_health': self.metrics.get_service_health(),
                'error_rate': self.metrics.get_error_rate()
            }
            
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'services': self.get_service_status()
            }
            
        @self.app.get("/dashboard")
        async def dashboard():
            """Web dashboard"""
            return HTMLResponse(content=self.render_dashboard())
            
    def render_dashboard(self) -> str:
        """Render HTML dashboard"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI Proxy Dashboard</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <h1>AI Proxy Dashboard</h1>
            <div id="metrics-container">
                <!-- Metrics will be populated here -->
            </div>
            <canvas id="responseTimeChart"></canvas>
            <script>
                // Dashboard JavaScript
                setInterval(updateMetrics, 5000);
            </script>
        </body>
        </html>
        """
```

## Configuration Management

### 1. Environment-Based Configuration
```yaml
# ai-integration/config/development.yml
proxy:
  host: localhost
  port: 8000
  debug: true
  
services:
  openai:
    url: https://api.openai.com/v1
    api_key: ${OPENAI_API_KEY}
    timeout: 30
    retries: 3
    
  ollama:
    url: http://localhost:11434
    timeout: 60
    retries: 2
    
load_balancing:
  strategy: round_robin
  health_check_interval: 30
  
caching:
  enabled: true
  l1_size: 1000
  l2_ttl: 300
  l3_ttl: 3600
  
monitoring:
  enabled: true
  metrics_port: 9090
  log_level: debug
```

### 2. Dynamic Configuration Updates
```python
# ai-integration/proxy/config_manager.py
class ConfigurationManager:
    def __init__(self, config_file: str):
        self.config_file = config_file
        self.config = self.load_config()
        self.watchers = []
        
    def load_config(self) -> dict:
        """Load configuration from file"""
        with open(self.config_file, 'r') as f:
            return yaml.safe_load(f)
            
    def update_config(self, updates: dict):
        """Update configuration dynamically"""
        self.config = self.merge_configs(self.config, updates)
        self.notify_watchers()
        
    def add_config_watcher(self, callback: Callable):
        """Add configuration change watcher"""
        self.watchers.append(callback)
        
    def notify_watchers(self):
        """Notify all watchers of configuration changes"""
        for watcher in self.watchers:
            try:
                watcher(self.config)
            except Exception as e:
                logger.error(f"Config watcher error: {e}")
```

## Security and Authentication

### 1. API Key Management
```python
# ai-integration/proxy/auth.py
class APIKeyManager:
    def __init__(self, config: dict):
        self.api_keys = {}
        self.key_limits = {}
        self.load_api_keys(config.get('api_keys', []))
        
    def load_api_keys(self, api_keys: list):
        """Load API keys from configuration"""
        for key_config in api_keys:
            self.api_keys[key_config['key']] = {
                'services': key_config['services'],
                'rate_limit': key_config.get('rate_limit', {}),
                'expires_at': key_config.get('expires_at')
            }
            
    def validate_key(self, api_key: str, service: str) -> bool:
        """Validate API key for service access"""
        if api_key not in self.api_keys:
            return False
            
        key_config = self.api_keys[api_key]
        
        # Check expiration
        if key_config.get('expires_at'):
            if datetime.now() > key_config['expires_at']:
                return False
                
        # Check service access
        if service not in key_config['services']:
            return False
            
        # Check rate limits
        if not self.check_rate_limit(api_key, service):
            return False
            
        return True
        
    def check_rate_limit(self, api_key: str, service: str) -> bool:
        """Check if request is within rate limits"""
        # Implementation of rate limiting logic
        pass
```

### 2. Request Signing and Verification
```python
# ai-integration/proxy/security.py
class RequestSecurity:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        
    def sign_request(self, request_data: dict) -> str:
        """Sign request data"""
        data_str = json.dumps(request_data, sort_keys=True)
        signature = hmac.new(
            self.secret_key.encode(),
            data_str.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
        
    def verify_request(self, request_data: dict, signature: str) -> bool:
        """Verify request signature"""
        expected_signature = self.sign_request(request_data)
        return hmac.compare_digest(signature, expected_signature)
```

## Deployment and Scaling

### 1. Docker Configuration
```dockerfile
# ai-integration/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose ports
EXPOSE 8000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["python", "-m", "proxy.main"]
```

### 2. Kubernetes Deployment
```yaml
# ai-integration/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-proxy
  template:
    metadata:
      labels:
        app: ai-proxy
    spec:
      containers:
      - name: ai-proxy
        image: ai-proxy:latest
        ports:
        - containerPort: 8000
        - containerPort: 9090
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: openai-api-key
        - name: OLLAMA_URL
          value: "http://ollama-service:11434"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Testing Strategy

### 1. Integration Tests
```python
# ai-integration/tests/integration/test_proxy_integration.py
class TestProxyIntegration:
    async def test_service_discovery(self, proxy_client):
        """Test service discovery and health monitoring"""
        # Register services
        await proxy_client.register_service('test-service-1', {
            'url': 'http://test-service-1:8000',
            'timeout': 30
        })
        
        # Verify service is discovered
        services = await proxy_client.get_available_services()
        assert 'test-service-1' in services
        
        # Verify health status
        health = await proxy_client.get_service_health('test-service-1')
        assert health['status'] in ['healthy', 'unhealthy']
    
    async def test_load_balancing(self, proxy_client):
        """Test load balancing across multiple services"""
        # Register multiple services
        for i in range(3):
            await proxy_client.register_service(f'test-service-{i}', {
                'url': f'http://test-service-{i}:8000',
                'timeout': 30
            })
        
        # Send multiple requests
        responses = []
        for _ in range(10):
            response = await proxy_client.send_request('/test', {})
            responses.append(response)
        
        # Verify load is distributed
        service_counts = Counter(r['service'] for r in responses)
        assert len(service_counts) > 1  # Requests went to multiple services
    
    async def test_caching(self, proxy_client):
        """Test caching functionality"""
        # Send identical requests
        response1 = await proxy_client.send_request('/test', {'query': 'test'})
        response2 = await proxy_client.send_request('/test', {'query': 'test'})
        
        # Verify cache hit
        assert response1 == response2
        # Check cache metrics
        metrics = await proxy_client.get_metrics()
        assert metrics['cache_hits'] > 0
```

### 2. Performance Tests
```python
# ai-integration/tests/performance/test_proxy_performance.py
class TestProxyPerformance:
    async def test_concurrent_requests(self, proxy_client):
        """Test handling of concurrent requests"""
        start_time = time.time()
        
        # Send concurrent requests
        tasks = []
        for i in range(100):
            task = proxy_client.send_request('/test', {'request_id': i})
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        duration = time.time() - start_time
        
        # Verify all requests completed
        assert len(responses) == 100
        # Verify reasonable performance
        assert duration < 10.0  # Should complete in under 10 seconds
    
    async def test_cache_performance(self, proxy_client):
        """Test cache performance under load"""
        # Warm up cache
        await proxy_client.send_request('/test', {'query': 'warmup'})
        
        # Measure cache hit performance
        start_time = time.time()
        tasks = [proxy_client.send_request('/test', {'query': 'warmup'}) for _ in range(50)]
        await asyncio.gather(*tasks)
        cache_hit_time = time.time() - start_time
        
        # Measure cache miss performance
        start_time = time.time()
        tasks = [proxy_client.send_request('/test', {'query': f'miss-{i}'}) for i in range(50)]
        await asyncio.gather(*tasks)
        cache_miss_time = time.time() - start_time
        
        # Cache hits should be faster
        assert cache_hit_time < cache_miss_time
```

## Implementation Timeline

### Phase 1: Core Proxy Infrastructure (Week 1-2)
- [ ] Service discovery and health monitoring
- [ ] Basic load balancing implementation
- [ ] Simple caching layer
- [ ] Basic monitoring and metrics

### Phase 2: Advanced Features (Week 3-4)
- [ ] Multi-level caching strategy
- [ ] Intelligent cache invalidation
- [ ] Rate limiting and security
- [ ] Configuration management

### Phase 3: Integration and Optimization (Week 5-6)
- [ ] A2A Server integration
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation and deployment

### Phase 4: Production Readiness (Week 7-8)
- [ ] Monitoring dashboard
- [ ] Alerting and notifications
- [ ] Security hardening
- [ ] Scaling and high availability

## Success Criteria

### Functional Requirements
- [ ] Service discovery and health monitoring
- [ ] Load balancing across multiple AI services
- [ ] Multi-level caching with intelligent invalidation
- [ ] Rate limiting and security controls
- [ ] Comprehensive monitoring and metrics

### Non-Functional Requirements
- [ ] Response time < 100ms for cached requests
- [ ] Response time < 5 seconds for uncached requests
- [ ] Support for 1000+ concurrent requests
- [ ] 99.9% uptime for proxy service
- [ ] Automatic failover and recovery

## Risk Assessment

### High Risk
- Service discovery complexity
- Cache consistency issues
- Load balancer performance bottlenecks

### Medium Risk
- Configuration management complexity
- Security vulnerabilities
- Monitoring overhead

### Low Risk
- Documentation completeness
- Developer adoption
- Integration testing coverage

This comprehensive integration plan provides a robust architecture for connecting the A2A Server with the External AI Hub proxy, enabling advanced features like load balancing, caching, and comprehensive monitoring while maintaining high performance and reliability.
