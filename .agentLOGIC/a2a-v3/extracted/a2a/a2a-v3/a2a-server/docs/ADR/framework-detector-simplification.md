# ADR: Framework Detector Service Simplification

## Status
Accepted

## Context

The current `framework-extractor.service.ts` file has grown to approximately 9000 lines of code, making it extremely difficult to maintain, test, and understand. The file contains:

- Complex framework detection logic mixed with file scanning
- Multiple responsibilities in a single class
- Difficult to test individual components
- Hard to extend with new frameworks
- Performance issues due to monolithic structure

## Decision

Replace the monolithic `framework-extractor.service.ts` with a simplified `FrameworkDetectorService` that:

1. **Modular Architecture**: Split detection logic into separate detector classes
2. **Single Responsibility**: Each detector handles one framework type
3. **Clean Interfaces**: Well-defined interfaces for extensibility
4. **Performance Optimized**: Efficient scanning and detection
5. **Backward Compatible**: Maintain existing API for smooth migration

## Alternatives Considered

### Alternative 1: Refactor in-place
- **Pros**: No breaking changes, gradual migration
- **Cons**: Still complex, hard to test, maintains technical debt

### Alternative 2: Complete rewrite with new API
- **Pros**: Clean slate, modern architecture
- **Cons**: Breaking changes, requires updating all consumers

### Alternative 3: Extract to separate package
- **Pros**: Reusable across projects
- **Cons**: Overkill for current needs, adds complexity

## Implementation Plan

### Phase 1: Create New Service (Current)
- [x] Create `FrameworkDetectorService` with modular architecture
- [x] Implement individual detector classes (Vue, React, Laravel, TypeScript)
- [x] Create key file scanner for efficient file detection
- [x] Add comprehensive tests and performance benchmarks

### Phase 2: Migration
- [ ] Add `@deprecated` annotation to `FrameworkExtractorService`
- [ ] Update all consumers to use new service
- [ ] Maintain backward compatibility during transition
- [ ] Monitor performance and fix any regressions

### Phase 3: Cleanup
- [ ] Remove old service after migration complete
- [ ] Update documentation and examples
- [ ] Add new framework detectors as needed

## Benefits

### Maintainability
- **Reduced Complexity**: 9000 lines → ~500 lines (95% reduction)
- **Modular Design**: Easy to understand and modify individual components
- **Test Coverage**: Each detector can be tested independently

### Performance
- **Efficient Scanning**: Only scan necessary files
- **Parallel Detection**: Detectors can run concurrently
- **Memory Usage**: Reduced memory footprint

### Extensibility
- **New Frameworks**: Easy to add new framework detectors
- **Custom Detectors**: Can implement custom detection logic
- **Configuration**: Flexible configuration options

### Developer Experience
- **Clear API**: Simple and intuitive interface
- **Type Safety**: Strong TypeScript support
- **Documentation**: Well-documented interfaces and examples

## Risks and Mitigations

### Risk: Performance Regression
- **Mitigation**: Comprehensive performance testing and benchmarks
- **Monitoring**: Monitor real-world performance after deployment

### Risk: Missing Framework Detection
- **Mitigation**: Maintain comprehensive test coverage
- **Validation**: Compare results between old and new implementations

### Risk: Migration Complexity
- **Mitigation**: Maintain backward compatibility during transition
- **Documentation**: Clear migration guide and examples

## Success Criteria

1. **Code Reduction**: Reduce from 9000 to ~500 lines (95% reduction)
2. **Performance**: Maintain or improve detection speed
3. **Test Coverage**: Achieve >90% test coverage
4. **Migration**: Smooth transition with no breaking changes
5. **Maintainability**: New code is easily understandable and modifiable

## Follow-up Actions

1. Complete migration to new service
2. Monitor performance in production
3. Add additional framework detectors as needed
4. Document best practices for extending the system