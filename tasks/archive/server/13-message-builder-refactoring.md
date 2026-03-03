# Task: Refactor message-builder.ts

## File Analysis
- **File**: `a2a-server/src/protocol/message-builder.ts`
- **Current Size**: 497 lines
- **Issue**: Large file with multiple message building responsibilities

## Refactoring Requirements

### 1. Extract Message Type Builders
- **Current**: All message building logic in single class
- **Target**: Separate builders for different message types
- **Files to Create**:
  - `message-builder.service.ts` (main orchestrator)
  - `action-message-builder.ts` (action message building)
  - `simulation-message-builder.ts` (simulation message building)
  - `form-message-builder.ts` (form message building)
  - `error-message-builder.ts` (error message building)

### 2. Extract Message Validation
- **Current**: Validation mixed with building logic
- **Target**: Separate validation concerns
- **Files to Create**:
  - `message-validator.ts` (message validation)
  - `message-schema.ts` (message schemas)

### 3. Extract Message Formatting
- **Current**: Formatting logic scattered throughout
- **Target**: Centralized formatting
- **Files to Create**:
  - `message-formatter.ts` (message formatting)
  - `message-serializer.ts` (message serialization)

### 4. Extract Message Templates
- **Current**: Templates hardcoded in builder
- **Target**: Externalized templates
- **Files to Create**:
  - `message-templates.ts` (message templates)
  - `message-config.ts` (message configuration)

## Implementation Steps

### Phase 1: Extract Core Interfaces
1. Create `message-builder.interfaces.ts` with all interfaces
2. Extract type definitions and constants
3. Define clear contracts between components

### Phase 2: Extract Message Validation
1. Create `message-validator.ts`
2. Move all validation logic
3. Implement schema-based validation
4. Add validation error handling

### Phase 3: Extract Message Builders
1. Create `action-message-builder.ts`
2. Create `simulation-message-builder.ts`
3. Create `form-message-builder.ts`
4. Create `error-message-builder.ts`
5. Move specific building logic to appropriate builders

### Phase 4: Extract Formatting Logic
1. Create `message-formatter.ts`
2. Centralize formatting logic
3. Implement consistent formatting
4. Add formatting validation

### Phase 5: Extract Templates and Configuration
1. Create `message-templates.ts`
2. Externalize hardcoded templates
3. Create `message-config.ts`
4. Externalize configuration

### Phase 6: Update Main Service
1. Refactor main service to orchestrate components
2. Remove duplicated logic
3. Add dependency injection
4. Update tests

## Quality Requirements

### Code Quality
- Each new file should be under 200 lines
- Maintain existing functionality
- Add comprehensive unit tests
- Update integration tests

### Performance
- No performance degradation
- Maintain existing throughput
- Optimize memory usage
- Add performance monitoring

### Maintainability
- Clear separation of concerns
- Comprehensive documentation
- Type safety maintained
- Error handling improved

## Testing Strategy

### Unit Tests
- Test each extracted component independently
- Mock dependencies appropriately
- Cover all edge cases
- Test error scenarios

### Integration Tests
- Test component interactions
- Test message validation
- Test message formatting
- Test template loading

### Performance Tests
- Benchmark before/after performance
- Memory usage comparison
- Message building throughput
- Serialization performance

## Dependencies
- Requires existing test suite to pass
- Requires validation system updates
- Requires formatting system updates
- Requires template system updates

## Success Criteria
- Main service reduced to under 400 lines
- All existing functionality preserved
- All tests pass
- Performance maintained or improved
- Code complexity reduced
- Maintainability improved