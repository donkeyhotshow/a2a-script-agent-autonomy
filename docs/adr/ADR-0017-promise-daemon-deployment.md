# ADR-0017: Promise Daemon Deployment

Status: accepted
Date: 2026-03-06

## Context

Promise daemons are critical background processes that handle asynchronous AI task processing. The deployment strategy needed to ensure high availability, proper resource management, and operational visibility. Without proper deployment:

- Single points of failure could block all async processing
- Resource contention between daemons and web services
- Difficult monitoring and debugging of background processes
- Inconsistent behavior across different environments
- No graceful shutdown or startup procedures

The project needed a standardized deployment approach for promise daemons across development, staging, and production environments.

## Decision

Deploy promise daemons as managed background processes with proper lifecycle management, monitoring, and resource controls.

### Deployment Models

**Development Environment:**
- CLI command for manual daemon startup
- Direct process execution with logging
- Auto-restart on code changes
- Resource monitoring and alerts

**Production Environment:**
- Containerized deployment (Docker)
- Orchestration with health checks
- Multiple daemon instances for redundancy
- Centralized logging and monitoring

### Daemon Configuration

**Core Parameters:**
```javascript
{
  proxyUrl: 'http://localhost:11434',  // AI integration endpoint
  interval: 4.0,                       // Poll interval (seconds)
  timeout: 15.0,                       // HTTP timeout (seconds)
  logLevel: 'INFO',                    // Logging verbosity
  maxConcurrent: 5,                    // Max concurrent promises
  healthCheckInterval: 30,             // Health check frequency
}
```

**Operational Parameters:**
```javascript
{
  maxEmptyCycles: 100,                 // Stop after N empty polls
  responseAttempts: 5,                 // Retry attempts for responses
  responseDelay: 0.6,                  // Delay between retries
  memoryLimit: '512MB',               // Memory usage limit
  cpuLimit: '50%',                    // CPU usage limit
}
```

### Lifecycle Management

**Startup Process:**
1. Configuration validation
2. Dependency checks (AI integration availability)
3. Queue connection verification
4. Health check endpoint registration
5. Graceful startup with backoff

**Shutdown Process:**
1. Stop accepting new promises
2. Complete current processing
3. Save state for recovery
4. Clean shutdown with timeout

## Consequences

### Positive
- **High Availability**: Multiple daemon instances prevent single points of failure
- **Resource Control**: Configurable limits prevent resource exhaustion
- **Operational Visibility**: Comprehensive logging and monitoring
- **Consistent Behavior**: Standardized deployment across environments
- **Fault Tolerance**: Graceful handling of daemon failures

### Negative
- **Operational Complexity**: Additional processes to manage and monitor
- **Resource Overhead**: Daemon processes consume system resources
- **Deployment Complexity**: Container orchestration adds complexity
- **Debugging Difficulty**: Distributed processes complicate issue diagnosis

### Trade-offs
- **Availability vs Complexity**: Redundant daemons ensure availability at cost of complexity
- **Performance vs Safety**: Resource limits ensure stability but may reduce throughput
- **Automation vs Control**: Automated deployment reduces manual errors but limits customization

## Notes / Follow-ups

### Completed
- ✅ CLI daemon command implementation
- ✅ Docker containerization
- ✅ Health check endpoints
- ✅ Resource limit configuration
- ✅ Graceful startup/shutdown procedures
- ✅ Multi-environment deployment support

### Future Enhancements
- Kubernetes deployment manifests
- Auto-scaling based on queue depth
- Distributed tracing integration
- Daemon metrics dashboard
- Configuration hot-reloading