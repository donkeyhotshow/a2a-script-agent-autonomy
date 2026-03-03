# Task: Protocol Formalization with JSON Schema

## Task Details

**ID**: architecture-03
**Type**: architecture
**Priority**: high
**Status**: pending
**Created**: 2026-03-03
**Estimated Time**: 4-5 hours

## Description

Formalize the A2A protocol using JSON Schema and implement automatic client generation (TypeScript types + Python dataclasses) to eliminate format drift between execute/result messages.

## Requirements

### Current State Analysis
- Protocol defined in `docs/new-request-flow/PROTOCOL.md` with examples
- Manual type definitions in server/client/proxy
- No formal schema validation
- Risk of protocol drift between implementations
- Manual synchronization of protocol changes

### Target State
- JSON Schema definitions for all protocol messages
- Automatic client generation for TypeScript and Python
- Schema validation in all protocol implementations
- Single source of truth for protocol definitions
- Automated testing against schema

## Implementation Plan

### Phase 1: Protocol Analysis and Schema Design
1. **Analyze existing protocol structure**
   - Review `docs/new-request-flow/PROTOCOL.md`
   - Identify all message types (execute, result, form, etc.)
   - Document field requirements and constraints
   - Map action-key shape requirements

2. **Design JSON Schema structure**
   - Define base message schemas
   - Create action-specific schemas
   - Specify validation rules and constraints
   - Include examples and documentation

### Phase 2: Schema Implementation
1. **Create comprehensive JSON Schema**
   - Base protocol message schemas
   - Action-specific execute/result schemas
   - Form and UI component schemas
   - Error and validation schemas

2. **Implement client generation**
   - TypeScript type generator from JSON Schema
   - Python dataclass generator
   - Validation function generation
   - Example code generation

### Phase 3: Integration and Validation
1. **Replace manual protocol implementations**
   - Update server-side protocol handling
   - Update client-side protocol handling
   - Update proxy protocol handling

2. **Add schema validation**
   - Runtime validation in all protocol implementations
   - Build-time validation in CI/CD
   - Schema testing with example messages

## Dependencies

- **High Priority**: Action schema unification (architecture-02)
- **Medium Priority**: Configuration management (infrastructure-02)
- **Low Priority**: Observability implementation (observability-01)

## Files to Create/Modify

### New Files
- `schemas/protocol/` - Protocol schema directory
- `schemas/protocol/base.json` - Base message schemas
- `schemas/protocol/actions.json` - Action-specific schemas
- `schemas/protocol/forms.json` - Form and UI schemas
- `schemas/protocol/generator/` - Client generation utilities
- `schemas/protocol/generator/typescript.js` - TypeScript generator
- `schemas/protocol/generator/python.py` - Python generator
- `schemas/protocol/validators/` - Runtime validation functions

### Modified Files
- `docs/new-request-flow/PROTOCOL.md` - Reference schema definitions
- `a2a-server/src/protocol/` - Use generated types and validation
- `a2a-client/packages/types/src/protocol.ts` - Replace with generated types
- `ai-integration/proxy/` - Update with generated Python types
- `package.json` - Add schema generation and validation scripts

## Success Criteria

### Functional Requirements
- [ ] Complete JSON Schema for all protocol messages
- [ ] TypeScript types generated for server and client
- [ ] Python dataclasses generated for proxy
- [ ] Runtime validation in all protocol implementations
- [ ] Build process includes schema validation
- [ ] Schema changes trigger client regeneration

### Non-Functional Requirements
- [ ] Schema validation performance under 5ms per message
- [ ] Generated clients maintain existing API compatibility
- [ ] Schema format is comprehensive and maintainable
- [ ] Generator supports protocol evolution
- [ ] Zero protocol drift between implementations

## Validation

### Testing Strategy
1. **Schema Validation**: Validate all protocol messages against schema
2. **Client Generation**: Verify generated clients match expected structure
3. **Integration Tests**: Test protocol communication with validation
4. **Performance Tests**: Measure validation performance impact
5. **Compatibility Tests**: Ensure generated clients work with existing code

### Acceptance Criteria
- [ ] All existing protocol messages validate against schema
- [ ] Generated clients pass existing unit tests
- [ ] Runtime validation catches protocol violations
- [ ] Build process includes schema validation
- [ ] No protocol drift between server/client/proxy

## Risk Mitigation

### High Risk
- **Breaking changes**: Maintain backward compatibility during migration
- **Performance impact**: Optimize validation performance
- **Schema complexity**: Design schema for maintainability

### Medium Risk
- **Generator reliability**: Ensure generated code is correct and maintainable
- **Platform differences**: Handle platform-specific requirements

### Low Risk
- **Migration complexity**: Plan phased migration to minimize disruption