# ADR-0019: Multi-Level Testing Pipeline

Status: accepted
Date: 2026-03-06

## Context

The A2A system consists of multiple layers (AI Integration → Server → Client → Web UI) that need coordinated testing to ensure end-to-end functionality. Without a structured testing pipeline:

- Bugs could be caught late in development cycle
- Integration issues between layers not detected
- Manual testing required for each layer combination
- Difficult to isolate issues to specific components
- No automated regression testing for complex interactions

The project needed a comprehensive testing strategy that covers all layers with automated pipelines and proper test isolation.

## Decision

Implement a multi-level testing pipeline with increasing complexity and scope, from unit tests to full end-to-end scenarios.

### Testing Levels

**Level 1: AI Integration Testing**
- **Scope**: LLM proxy, promise queue daemon, simulation support
- **Tools**: Unit tests, integration tests, simulation replay
- **Focus**: AI response handling, promise lifecycle, daemon reliability
- **Environment**: Isolated LLM mocks, local daemon processes

**Level 2: A2A Server Testing**
- **Scope**: API endpoints, neuron processing, database operations
- **Tools**: Integration tests, API tests, database tests
- **Focus**: Request processing, data persistence, authentication
- **Environment**: Test database, mock external services

**Level 3: A2A Client Testing**
- **Scope**: Client API proxy, SDK functionality, WebSocket/SSE
- **Tools**: API tests, component tests, WebSocket tests
- **Focus**: API proxying, real-time communication, session management
- **Environment**: Mock server, test WebSocket connections

**Level 4: Web UI Testing**
- **Scope**: Browser interface, session panels, transport layer
- **Tools**: E2E tests, visual regression, performance tests
- **Focus**: UI interactions, cross-browser compatibility, real-time updates
- **Environment**: Headless browsers, network simulation

### Pipeline Architecture

**Sequential Execution:**
```bash
AI Integration Tests → Server Tests → Client Tests → Web UI Tests
```

**Parallel Execution Where Possible:**
- Unit tests run in parallel within each level
- Integration tests may require sequential setup
- E2E tests run against fully deployed stack

**Test Data Management:**
- Shared fixtures for common test data
- Environment-specific configuration
- Clean state between test runs
- Simulation golden standard for comparison

## Consequences

### Positive
- **Early Bug Detection**: Issues caught at appropriate level
- **Comprehensive Coverage**: All layers and interactions tested
- **Automated Regression**: Prevents breaking changes
- **Isolated Debugging**: Clear separation of concerns
- **Scalable Testing**: Can add levels without affecting others

### Negative
- **Pipeline Complexity**: Multiple levels to maintain and coordinate
- **Execution Time**: Sequential levels increase total test time
- **Resource Requirements**: Each level needs specific environments
- **Maintenance Overhead**: More test code to maintain

### Trade-offs
- **Coverage vs Speed**: Comprehensive testing takes longer to execute
- **Isolation vs Integration**: Level separation may miss integration bugs
- **Maintenance vs Reliability**: More tests provide better coverage but require maintenance

## Notes / Follow-ups

### Completed
- ✅ AI Integration testing level
- ✅ A2A Server testing level
- ✅ A2A Client testing level
- ✅ Web UI testing level
- ✅ Pipeline orchestration scripts
- ✅ Shared test fixtures and utilities

### Future Enhancements
- Add performance testing level
- Implement parallel execution optimization
- Add chaos engineering tests
- Integrate with CI/CD pipeline
- Add automated test result analysis