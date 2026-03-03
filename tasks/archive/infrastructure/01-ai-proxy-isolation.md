# Task: AI-Proxy Isolation and Service Separation

## Task Details

**ID**: infrastructure-01
**Type**: infrastructure
**Priority**: high
**Status**: pending
**Created**: 2026-03-03
**Estimated Time**: 5-6 hours

## Description

Isolate AI-proxy as a separate service with clear API contract, health/metrics endpoints, and Ollama process management (graceful shutdown, watchdog).

## Requirements

### Current State Analysis
- AI-proxy integrated within main application
- No clear service boundaries
- Manual Ollama process management
- Limited health checking and monitoring
- No graceful shutdown handling

### Target State
- Standalone AI-proxy service with REST/gRPC API
- Clear contract definition and documentation
- Health checks and metrics endpoints
- Ollama process management with watchdog
- Graceful shutdown and restart capabilities

## Implementation Plan

### Phase 1: Service Design and API Contract
1. **Define AI-proxy service boundaries**
   - Identify core AI-proxy functionality
   - Design API endpoints and contracts
   - Define error handling and retry logic
   - Specify authentication and authorization

2. **Create API contract documentation**
   - OpenAPI/Swagger specification
   - Request/response schemas
   - Error codes and messages
   - Usage examples and guidelines

### Phase 2: Service Implementation
1. **Extract AI-proxy functionality**
   - Move proxy logic to separate service
   - Implement API endpoints
   - Add request/response validation
   - Implement error handling

2. **Ollama process management**
   - Process lifecycle management
   - Watchdog for Ollama health
   - Graceful startup and shutdown
   - Resource monitoring and limits

### Phase 3: Observability and Integration
1. **Add health checks and metrics**
   - Health check endpoints
   - Performance metrics
   - Error rate monitoring
   - Resource usage tracking

2. **Integration with main services**
   - Update server to use AI-proxy API
   - Implement retry logic and circuit breaker
   - Add timeout handling
   - Update configuration management

## Dependencies

- **High Priority**: Configuration management (infrastructure-02)
- **Medium Priority**: Observability implementation (observability-01)
- **Low Priority**: Port management (infrastructure-04)

## Files to Create/Modify

### New Files
- `ai-proxy/` - Standalone AI-proxy service directory
- `ai-proxy/package.json` - Service package configuration
- `ai-proxy/src/` - Service implementation
- `ai-proxy/src/index.ts` - Main service entry point
- `ai-proxy/src/api/` - API endpoints
- `ai-proxy/src/ollama/` - Ollama process management
- `ai-proxy/src/health/` - Health checks and metrics
- `ai-proxy/src/config/` - Service configuration
- `ai-proxy/openapi.yaml` - API contract specification
- `ai-proxy/Dockerfile` - Container configuration

### Modified Files
- `ai-integration/proxy/` - Move functionality to new service
- `a2a-server/src/services/` - Update to use AI-proxy API
- `package.json` - Add AI-proxy service scripts
- `docker-compose.yml` - Add AI-proxy service

## Success Criteria

### Functional Requirements
- [ ] Standalone AI-proxy service with REST API
- [ ] Clear API contract with OpenAPI specification
- [ ] Ollama process management with watchdog
- [ ] Health check endpoints for monitoring
- [ ] Graceful shutdown and restart capabilities
- [ ] Error handling and retry logic

### Non-Functional Requirements
- [ ] Service startup time under 10 seconds
- [ ] Memory usage under 200MB for proxy service
- [ ] API response time under 100ms for health checks
- [ ] 99.9% uptime for Ollama process management
- [ ] Zero data loss during graceful shutdown

## Validation

### Testing Strategy
1. **Unit Tests**: Individual service components
2. **Integration Tests**: API contract validation
3. **Load Tests**: Service performance under load
4. **Chaos Tests**: Ollama process failure scenarios
5. **End-to-End Tests**: Full workflow with isolated proxy

### Acceptance Criteria
- [ ] AI-proxy service runs independently
- [ ] API contract matches OpenAPI specification
- [ ] Ollama process management handles failures
- [ ] Health checks accurately reflect service status
- [ ] Graceful shutdown prevents data loss
- [ ] Main services integrate seamlessly

## Risk Mitigation

### High Risk
- **Service availability**: Implement redundancy and failover
- **Data consistency**: Ensure transactional integrity during shutdown
- **Performance impact**: Monitor and optimize API response times

### Medium Risk
- **Configuration complexity**: Simplify configuration management
- **Network reliability**: Implement retry logic and circuit breaker

### Low Risk
- **Migration complexity**: Plan phased migration with rollback capability