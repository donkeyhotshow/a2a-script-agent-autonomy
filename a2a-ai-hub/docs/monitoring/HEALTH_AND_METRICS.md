# Health and Metrics Endpoints Documentation

## Overview

The AI Integration proxy provides comprehensive health checking and monitoring capabilities through dedicated HTTP endpoints. These endpoints support container orchestration (Kubernetes readiness/liveness probes), monitoring systems (Prometheus), and operational visibility.

## Health Endpoints

### GET /

**Purpose**: Root endpoint with intelligent response based on client type

**Browser Requests:**
- Detects via `Accept: text/html` header or User-Agent
- Serves the queue management web interface (`web/index.html`)
- Provides visual dashboard for promise queue monitoring

**API Requests:**
- Returns simple 200 OK response
- Used for basic connectivity checks

**Response Codes:**
- `200`: Success (API) or HTML page served (browser)

### GET /health

**Purpose**: Liveness probe - basic health check for proxy availability

**Response Format:**
```json
{
  "status": "running",
  "proxy_port": 11434,
  "local_llm_upstream_host": "http://localhost:11435",
  "local_llm_upstream_port": 11435,
  "local_llm_upstream_available": true,
  "storage_dir": "proxy_logs",
  "ai_hub_config": "/path/to/config.json",
  "ai_hub_rules": 5,
  "simulation_enabled": false,
  "promise_daemon_only": false,
  "cache": {
    "status": "enabled",
    "entries": 42,
    "hits": 1234,
    "misses": 567
  }
}
```

**Key Metrics:**
- **status**: Always "running" if proxy is responding
- **local_llm_upstream_available**: Port connectivity to Local LLM upstream
- **ai_hub_rules**: Number of loaded AI Hub configuration rules
- **cache**: Cache status and statistics

**Use Cases:**
- Kubernetes liveness probe
- Load balancer health checks
- Basic service monitoring

### GET /health/local-llm-upstream

**Purpose**: Deep health check for Local LLM upstream connectivity

**Response Format (Healthy):**
```json
{
  "status": "healthy",
  "local_llm_upstream_available": true,
  "local_llm_upstream_url": "http://localhost:11435",
  "local_llm_upstream_pid": 12345,
  "idle_seconds": 30
}
```

**Response Format (Unhealthy):**
```json
{
  "status": "unhealthy",
  "local_llm_upstream_available": false,
  "local_llm_upstream_host": "localhost",
  "local_llm_upstream_port": 11435,
  "error": "Local LLM upstream is not responding on the configured host/port"
}
```

**Status Codes:**
- `200`: Local LLM upstream is healthy
- `503`: Local LLM upstream unavailable

**Key Metrics:**
- **idle_seconds**: How long since last request (concurrency control)
- **pid**: Process ID of Local LLM upstream
- **url**: Full upstream URL

### GET /health/ready

**Purpose**: Readiness probe - checks if proxy is ready to accept traffic

**Response Format (Ready):**
```json
{
  "status": "ready",
  "default_provider": "z_ai",
  "local_llm_upstream_available": true,
  "cache_status": "enabled"
}
```

**Response Format (Not Ready):**
```json
{
  "status": "not_ready",
  "reason": "local_llm_upstream_not_available",
  "default_provider": "compat_llm",
  "local_llm_upstream_host": "localhost",
  "local_llm_upstream_port": 11435
}
```

**Status Codes:**
- `200`: Proxy is ready to serve requests
- `503`: Proxy is not ready

**Readiness Logic:**
1. Check if router configuration is loaded
2. If default provider is `compat_llm`, verify Local LLM upstream availability
3. Validate cache system status

**Use Cases:**
- Kubernetes readiness probe
- Rolling deployment coordination
- Service dependency validation

## Metrics Endpoint

### GET /metrics

**Purpose**: Prometheus-compatible metrics export

**Response Format:** Prometheus text-based format

**Content-Type:** `text/plain; version=0.0.4; charset=utf-8`

### Collected Metrics

#### Counters

**ai_proxy_requests_total**
- Type: Counter
- Description: Total number of HTTP requests processed
- Labels: None

**ai_proxy_errors_total**
- Type: Counter
- Description: Total number of HTTP errors (4xx/5xx responses)
- Labels: `type` (client/server)

#### Histograms

**ai_proxy_request_duration_seconds**
- Type: Histogram
- Description: HTTP request duration in seconds
- Buckets: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, +Inf]`
- Measures: Request latency distribution

#### Gauges

**local_llm_model_loaded**
- Type: Gauge
- Description: Local LLM upstream model availability (0=unloaded, 1=loaded)
- Updated automatically before metrics export

#### Additional Metadata

**ai_proxy_info**
- Type: Info metric
- Description: Proxy version and configuration info
- Labels: `version`, `start_time`, `uptime_seconds`

### Detailed Breakdown Metrics

The metrics system also collects:

- **Requests by path**: `ai_proxy_requests_by_path_total{path="/api/v1/generate"}`
- **Requests by method**: `ai_proxy_requests_by_method_total{method="POST"}`
- **Requests by status**: `ai_proxy_requests_by_status_total{status="200"}`

### Prometheus Configuration Example

```yaml
scrape_configs:
  - job_name: 'ai-proxy'
    static_configs:
      - targets: ['localhost:11434']
    scrape_interval: 30s
    metrics_path: '/metrics'
```

### Grafana Dashboard Ideas

**Request Rate:**
```
rate(ai_proxy_requests_total[5m])
```

**Error Rate:**
```
rate(ai_proxy_errors_total[5m]) / rate(ai_proxy_requests_total[5m]) * 100
```

**95th Percentile Latency:**
```
histogram_quantile(0.95, rate(ai_proxy_request_duration_seconds_bucket[5m]))
```

**Local LLM Availability:**
```
local_llm_model_loaded
```

## Integration Examples

### Kubernetes Health Checks

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-proxy
spec:
  template:
    spec:
      containers:
      - name: proxy
        image: ai-integration:latest
        ports:
        - containerPort: 11434
        livenessProbe:
          httpGet:
            path: /health
            port: 11434
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 11434
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Docker Health Checks

**Dockerfile:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:11434/health || exit 1
```

### Monitoring Integration

**Prometheus Alert Rules:**
```yaml
groups:
  - name: ai_proxy
    rules:
      - alert: AIProxyDown
        expr: up{job="ai-proxy"} == 0
        for: 5m
        labels:
          severity: critical

      - alert: AIProxyHighErrorRate
        expr: rate(ai_proxy_errors_total[5m]) / rate(ai_proxy_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning

      - alert: AIProxyHighLatency
        expr: histogram_quantile(0.95, rate(ai_proxy_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning

      - alert: LocalLLMDown
        expr: local_llm_model_loaded == 0
        for: 10m
        labels:
          severity: info
```

## Troubleshooting

### Common Health Check Issues

**Health endpoint returns 5xx:**
- Check proxy logs for startup errors
- Verify configuration file validity
- Ensure required directories exist

**Readiness fails with "router_unavailable":**
- Check `config/providers.json` exists and is valid
- Verify provider configurations are correct
- Ensure API keys are properly configured

**Local LLM upstream shows unavailable:**
- Check if Local LLM upstream is running on correct port
- Verify network connectivity
- Check Local LLM upstream logs

### Metrics Debugging

**Missing metrics:**
- Ensure `/metrics` endpoint is accessible
- Check proxy logs for metrics collection errors
- Verify Prometheus format generation

**Incorrect metric values:**
- Review request logging in proxy logs
- Check for metric collection race conditions
- Validate histogram bucket calculations

### Performance Monitoring

**High latency alerts:**
- Check Local LLM upstream performance
- Monitor provider API response times
- Review network connectivity

**High error rates:**
- Examine error logs for patterns
- Check provider API key validity
- Monitor rate limiting

## Best Practices

### Health Checks

1. **Use readiness for load balancing**: Prevents routing traffic to unready instances
2. **Use liveness for restarts**: Detects hung processes requiring restart
3. **Monitor all endpoints**: Regular checks prevent silent failures

### Metrics

1. **Set appropriate scrape intervals**: Balance monitoring overhead with timeliness
2. **Use histograms for latency**: Percentiles provide better insight than averages
3. **Monitor error rates**: Early detection of service degradation
4. **Alert on Local LLM availability**: Critical for `compat_llm` configurations

### Operational Visibility

1. **Dashboard creation**: Build Grafana dashboards for key metrics
2. **Alert configuration**: Set up meaningful alerts for service health
3. **Log correlation**: Use request IDs to correlate metrics with logs
4. **Capacity planning**: Monitor request patterns for scaling decisions