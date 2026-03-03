# Task: Action Schema Unification and Type Generation

## Task Details

**ID**: architecture-02
**Type**: architecture
**Priority**: high
**Status**: completed
**Created**: 2026-03-03
**Estimated Time**: 3-4 hours

## Description

Unify action definitions in a single source (YAML or MD) and generate types/validators to eliminate duplication between server/client/proxy schemas.

## Requirements

### Current State Analysis
- Actions defined in multiple locations:
  - `docs/new-request-flow/PROTOCOL.md` - Protocol documentation
  - `a2a-server/src/types/` - Server-side TypeScript types
  - `a2a-client/packages/types/` - Client-side TypeScript types
  - `ai-integration/proxy/` - Python proxy types
- Manual synchronization required between different implementations
- Risk of schema drift and inconsistencies

### Target State
- Single source of truth for action definitions
- Automated type generation for all platforms
- Consistent validation across server/client/proxy
- Reduced maintenance overhead

## Implementation Plan

### Phase 1: Schema Analysis and Design
1. **Analyze existing action definitions**
   - Review current action types in server/client/proxy
   - Identify common patterns and differences
   - Document validation requirements

2. **Design unified schema format**
   - Choose YAML or JSON Schema format
   - Define action structure with metadata
   - Include validation rules and constraints

### Phase 2: Schema Implementation
1. **Create unified action schema**
   - Define base action structure
   - Specify action-specific fields and validation
   - Include examples and documentation

2. **Implement type generation**
   - TypeScript generator for server/client
   - Python dataclass generator for proxy
   - Validation schema generation

### Phase 3: Integration and Migration
1. **Replace existing type definitions**
   - Update server-side TypeScript types
   - Update client-side TypeScript types
   - Update Python proxy types

2. **Add build automation**
   - Integrate schema generation into build process
   - Add validation to CI/CD pipeline
   - Ensure schema changes trigger type regeneration

## Dependencies

- **High Priority**: Protocol formalization (architecture-03)
- **Medium Priority**: Configuration management (infrastructure-02)
- **Low Priority**: Observability implementation (observability-01)

## Files to Create/Modify

### New Files
- `schemas/actions/` - Unified action schema directory
- `schemas/actions/schema.yml` - Main action schema definition
- `schemas/actions/generator/` - Type generation utilities
- `schemas/actions/generator/typescript.js` - TypeScript generator
- `schemas/actions/generator/python.py` - Python generator
- `schemas/actions/validators/` - Validation schemas

### Modified Files
- `a2a-server/src/types/actions.ts` - Replace with generated types
- `a2a-client/packages/types/src/actions.ts` - Replace with generated types
- `ai-integration/proxy/ai_hub_config.py` - Update with generated types
- `package.json` - Add schema generation scripts

## Success Criteria

### Functional Requirements
- [ ] Single schema file defines all actions
- [ ] TypeScript types generated for server and client
- [ ] Python dataclasses generated for proxy
- [ ] Validation schemas generated for all platforms
- [ ] Build process automatically regenerates types
- [ ] Schema changes trigger type regeneration

### Non-Functional Requirements
- [ ] Type generation completes in under 30 seconds
- [ ] Generated types maintain existing API compatibility
- [ ] Validation performance under 10ms per action
- [ ] Schema format is human-readable and maintainable
- [ ] Generator supports extensibility for new platforms

## Validation

### Testing Strategy
1. **Schema Validation**: Validate schema against JSON Schema standard
2. **Type Generation**: Verify generated types match expected structure
3. **Integration Tests**: Test generated types in actual code
4. **Performance Tests**: Measure generation and validation performance

### Acceptance Criteria
- [ ] All existing action types can be generated from schema
- [ ] Generated types pass existing unit tests
- [ ] Validation catches schema violations
- [ ] Build process includes schema generation
- [ ] No manual type maintenance required

## Risk Mitigation

### High Risk
- **Breaking changes**: Maintain backward compatibility during migration
- **Performance impact**: Optimize generation and validation performance
- **Tooling complexity**: Keep generator simple and maintainable

### Medium Risk
- **Schema complexity**: Design schema for readability and maintainability
- **Platform differences**: Handle platform-specific type requirements

### Low Risk
- **Migration effort**: Plan phased migration to minimize disruption