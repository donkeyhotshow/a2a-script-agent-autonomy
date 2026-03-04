# Task: Split Long Files into Smaller, Manageable Modules

## Overview

Several files in the codebase exceed 500 lines, making them difficult to maintain, test, and understand. This task involves refactoring these large files into smaller, focused modules following best practices for code organization.

## Files to Split

### High Priority (800+ lines)
1. **`a2a-client/packages/api-server/src/index.ts`** (2070 lines) - Main API server entry point
2. **`a2a-client/packages/rag/test-data/generator.ts`** (1156 lines) - RAG test data generation
3. **`a2a-client/packages/rag/tests/reporter.ts`** (1340 lines) - Test reporting system
4. **`a2a-client/packages/rag/tests/runner.ts`** (616 lines) - Test execution runner
5. **`a2a-client/packages/rag/tests/visualizer.ts`** (667 lines) - Test result visualization

### Medium Priority (600-800 lines)
6. **`a2a-server/src/services/core/context/context-manager.service.ts`** (823 lines) - Context management
7. **`a2a-server/src/services/ai/task-decomposition/task-decomposition.service.ts`** (698 lines) - Task decomposition
8. **`a2a-server/src/services/actions/document-writer/document-writer.service.ts`** (599 lines) - Document writing
9. **`a2a-server/src/services/core/state/request-state-manager.ts`** (606 lines) - Request state management
10. **`a2a-client/packages/api-client/src/async-client.ts`** (829 lines) - Async client implementation
11. **`a2a-client/packages/api-client/src/action-handler.ts`** (714 lines) - Action handling
12. **`a2a-server/src/services/utils/metrics.service.ts`** (732 lines) - Metrics collection
13. **`a2a-server/src/services/utils/polling-optimizer.service.ts`** (629 lines) - Polling optimization

### Lower Priority (500-600 lines)
14. **`a2a-server/src/services/rag.service.ts`** (534 lines) - RAG service
15. **`a2a-server/src/services/proxy/proxy-client.ts`** (740 lines) - Proxy client
16. **`a2a-server/src/services/proxy/proxy-monitor.service.ts`** (533 lines) - Proxy monitoring
17. **`a2a-server/src/services/utils/webhook.service.ts`** (507 lines) - Webhook handling
18. **`a2a-server/src/protocol/file-block-handler.ts`** (567 lines) - File block handling
19. **`a2a-server/src/utils/backoff.ts`** (551 lines) - Backoff utilities
20. **`a2a-client/packages/history/src/session-storage.ts`** (535 lines) - Session storage
21. **`a2a-client/packages/types/src/index.ts`** (558 lines) - Type definitions

## Refactoring Strategy

### 1. Identify Logical Boundaries
- **Extract classes and functions** into separate files
- **Group related functionality** into modules
- **Separate concerns** (e.g., configuration, business logic, utilities)
- **Create clear interfaces** between modules

### 2. Apply SOLID Principles
- **Single Responsibility**: Each module should have one reason to change
- **Open/Closed**: Extend functionality without modifying existing code
- **Dependency Inversion**: Depend on abstractions, not concretions

### 3. Maintain Backward Compatibility
- **Preserve public APIs** and interfaces
- **Update imports** throughout the codebase
- **Ensure tests continue to pass**
- **Update documentation** as needed

## Implementation Plan

### Phase 1: High Priority Files (Week 1-2)

#### 1.1 Split `a2a-client/packages/api-server/src/index.ts` (2070 lines)
**Current Issues:**
- Monolithic server setup
- Mixed concerns (routes, middleware, configuration)
- Difficult to test individual components

**Proposed Structure:**
```
a2a-client/packages/api-server/src/
├── index.ts                    # Main entry point (reduced to ~50 lines)
├── server/
│   ├── app.ts                  # Express app setup
│   ├── middleware/             # Custom middleware
│   ├── routes/                 # Route handlers
│   ├── config/                 # Configuration management
│   └── utils/                  # Server utilities
├── services/                   # Business logic services
└── types/                      # Server-specific types
```

**Steps:**
1. Extract route handlers into separate modules
2. Move middleware to dedicated directory
3. Separate configuration management
4. Extract server utilities
5. Update imports and exports

#### 1.2 Split `a2a-client/packages/rag/test-data/generator.ts` (1156 lines)
**Current Issues:**
- Large test data generation logic
- Mixed data types and generation strategies
- Difficult to maintain and extend

**Proposed Structure:**
```
a2a-client/packages/rag/test-data/
├── generator.ts                # Main generator (reduced)
├── strategies/                 # Generation strategies
│   ├── document-strategy.ts
│   ├── query-strategy.ts
│   └── embedding-strategy.ts
├── factories/                  # Data factories
│   ├── document-factory.ts
│   ├── query-factory.ts
│   └── result-factory.ts
└── utils/                      # Generation utilities
```

**Steps:**
1. Extract generation strategies
2. Create data factories
3. Separate utility functions
4. Maintain backward compatibility

### Phase 2: Medium Priority Files (Week 3-4)

#### 2.1 Split `a2a-server/src/services/core/context/context-manager.service.ts` (823 lines)
**Current Issues:**
- Complex context management logic
- Multiple responsibilities
- Difficult to test and maintain

**Proposed Structure:**
```
a2a-server/src/services/core/context/
├── context-manager.service.ts  # Core manager (reduced)
├── context-store.ts            # Context storage
├── context-validator.ts        # Context validation
├── context-serializer.ts       # Context serialization
└── types/                      # Context-related types
```

#### 2.2 Split `a2a-server/src/services/ai/task-decomposition/task-decomposition.service.ts` (698 lines)
**Current Issues:**
- Complex task decomposition logic
- Multiple algorithms mixed together
- Difficult to extend with new strategies

**Proposed Structure:**
```
a2a-server/src/services/ai/task-decomposition/
├── task-decomposition.service.ts  # Main service (reduced)
├── strategies/                    # Decomposition strategies
│   ├── hierarchical-strategy.ts
│   ├── sequential-strategy.ts
│   └── parallel-strategy.ts
├── validators/                    # Task validation
└── utils/                         # Decomposition utilities
```

### Phase 3: Lower Priority Files (Week 5-6)

#### 3.1 Split `a2a-server/src/services/rag.service.ts` (534 lines)
**Current Issues:**
- Mixed search and indexing logic
- Large utility functions
- Difficult to test individual components

**Proposed Structure:**
```
a2a-server/src/services/
├── rag.service.ts              # Main service (reduced)
├── rag/
│   ├── search-engine.ts        # Search logic
│   ├── indexer.ts              # Indexing logic
│   ├── cache-manager.ts        # Cache management
│   └── utils/                  # RAG utilities
└── types/                      # RAG-related types
```

## Quality Assurance

### Testing Strategy
1. **Unit Tests**: Each extracted module should have comprehensive unit tests
2. **Integration Tests**: Ensure modules work together correctly
3. **Regression Tests**: Verify no functionality is broken
4. **Performance Tests**: Ensure no performance degradation

### Code Quality Checks
1. **Linting**: Ensure all code passes ESLint/TSLint
2. **Type Checking**: Verify TypeScript compilation
3. **Code Coverage**: Maintain or improve test coverage
4. **Documentation**: Update JSDoc comments for new modules

### Validation Steps
1. **Build Verification**: Ensure project builds successfully
2. **Test Execution**: Run full test suite
3. **Manual Testing**: Test critical functionality manually
4. **Performance Benchmarking**: Compare performance metrics

## Success Criteria

### Functional Requirements
- [ ] All extracted modules maintain original functionality
- [ ] No breaking changes to public APIs
- [ ] All tests pass after refactoring
- [ ] Build process completes successfully

### Non-Functional Requirements
- [ ] Individual files under 500 lines (target: 200-300 lines average)
- [ ] Improved code readability and maintainability
- [ ] Better separation of concerns
- [ ] Enhanced testability of individual components

### Quality Metrics
- [ ] Code coverage maintained or improved
- [ ] No performance regression
- [ ] Reduced cyclomatic complexity
- [ ] Improved code organization and structure

## Risk Mitigation

### Potential Risks
1. **Breaking Changes**: Careful API preservation and thorough testing
2. **Performance Impact**: Benchmark before and after changes
3. **Development Velocity**: Phase implementation to minimize disruption
4. **Team Adoption**: Clear documentation and communication

### Mitigation Strategies
1. **Incremental Approach**: Split files one at a time
2. **Comprehensive Testing**: Extensive test coverage before changes
3. **Code Reviews**: Thorough review process for all changes
4. **Rollback Plan**: Ability to revert changes if issues arise

## Timeline

- **Week 1-2**: High priority files (5 files)
- **Week 3-4**: Medium priority files (8 files)  
- **Week 5-6**: Lower priority files (8 files)
- **Week 7**: Testing, validation, and cleanup
- **Week 8**: Documentation and final review

## Resources Required

- **Development Time**: ~8 weeks of focused refactoring
- **Testing Resources**: Comprehensive test suite execution
- **Code Review**: Thorough review of all changes
- **Documentation**: Update of relevant documentation

## Expected Benefits

1. **Improved Maintainability**: Smaller, focused files are easier to understand and modify
2. **Enhanced Testability**: Individual modules can be tested in isolation
3. **Better Code Organization**: Clear separation of concerns and responsibilities
4. **Easier Onboarding**: New developers can understand the codebase more quickly
5. **Reduced Technical Debt**: Addresses code complexity and maintainability issues
6. **Improved Performance**: Better modularity can lead to more efficient code loading

## Notes

- This task should be executed incrementally to minimize risk
- Each file split should be treated as a separate sub-task
- Comprehensive testing is critical throughout the process
- Maintain clear communication with the development team
- Consider using automated refactoring tools where appropriate
- Document all changes and rationale for future reference