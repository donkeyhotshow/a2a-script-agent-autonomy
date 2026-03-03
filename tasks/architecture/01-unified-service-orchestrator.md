# Task: Unified Service Orchestrator

## Task Details

**ID**: architecture-01
**Type**: architecture
**Priority**: high
**Status**: pending
**Created**: 2026-03-03
**Estimated Time**: 4-6 hours

## Description

Create a unified process orchestrator to replace scattered npm scripts and manual kill commands for managing all services (3000/3001/5173/5174/11434).

## Requirements

### Current State Analysis
- Multiple npm scripts in `package.json` for different services
- Manual port management and service coordination
- No centralized health checking or graceful shutdown
- Inconsistent startup/shutdown procedures

### Target State
- Single orchestrator managing all services
- Declarative service definitions
- Health checks and graceful shutdown
- Port conflict detection and resolution
- One-command start/stop/restart

## Implementation Plan

### Phase 1: Service Discovery and Definition
1. **Analyze current service configuration**
   - Review existing npm scripts in `package.json`
   - Document current port assignments and dependencies
   - Identify service startup order requirements

2. **Create service definition schema**
   - Define service configuration format (YAML/JSON)
   - Specify port requirements, dependencies, health checks
   - Include environment variable requirements

### Phase 2: Orchestrator Implementation
1. **Choose orchestration approach**
   - PM2 ecosystem for Node.js services
   - Docker Compose for containerized approach
   - Custom Node.js orchestrator for maximum control

2. **Implement core orchestrator**
   - Service startup with dependency resolution
   - Port conflict detection and resolution
   - Health check monitoring
   - Graceful shutdown sequence

### Phase 3: Integration and Testing
1. **Replace existing npm scripts**
   - Update `package.json` scripts to use orchestrator
   - Maintain backward compatibility during transition
   - Add orchestrator-specific commands

2. **Testing and validation**
   - Test service startup/shutdown sequences
   - Validate port conflict handling
   - Verify health check functionality

## Dependencies

- **High Priority**: Port management system (infrastructure-04)
- **Medium Priority**: Health check implementation (infrastructure-05)
- **Low Priority**: Configuration management (infrastructure-02)

## Files to Create/Modify

### New Files
- `services.yml` - Service definitions and configuration
- `orchestrator/` - Orchestrator implementation directory
- `orchestrator/index.js` - Main orchestrator logic
- `orchestrator/services.js` - Service management utilities
- `orchestrator/health.js` - Health check implementation

### Modified Files
- `package.json` - Update npm scripts to use orchestrator
- `scripts/dev-launch.js` - Integrate with orchestrator

## Success Criteria

### Functional Requirements
- [ ] Single command starts all services: `npm run start:all`
- [ ] Single command stops all services: `npm run stop:all`
- [ ] Health checks verify service readiness
- [ ] Port conflicts are automatically resolved
- [ ] Graceful shutdown sequence prevents data loss
- [ ] Service dependencies are respected during startup

### Non-Functional Requirements
- [ ] Startup time under 30 seconds for all services
- [ ] Memory usage under 100MB for orchestrator
- [ ] Zero-downtime restart capability
- [ ] Comprehensive error handling and logging
- [ ] Cross-platform compatibility (Windows/Linux/macOS)

## Validation

### Testing Strategy
1. **Unit Tests**: Individual service management functions
2. **Integration Tests**: Full startup/shutdown sequences
3. **Load Tests**: Concurrent service management
4. **Error Tests**: Network failures, port conflicts, service crashes

### Acceptance Criteria
- [ ] All existing npm scripts work through orchestrator
- [ ] No manual port management required
- [ ] Services start in correct dependency order
- [ ] Health checks accurately reflect service status
- [ ] Graceful shutdown prevents data corruption

## Risk Mitigation

### High Risk
- **Service startup failures**: Implement retry logic and detailed error reporting
- **Port conflicts**: Automatic port assignment with fallback strategies
- **Dependency cycles**: Validate service dependency graph

### Medium Risk
- **Performance impact**: Monitor orchestrator resource usage
- **Compatibility issues**: Maintain backward compatibility during transition

### Low Risk
- **Configuration complexity**: Provide clear documentation and examples