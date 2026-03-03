# Task: Configuration Management with .env and Validation

## Task Details

**ID**: infrastructure-02
**Type**: infrastructure
**Priority**: high
**Status**: pending
**Created**: 2026-03-03
**Estimated Time**: 3-4 hours

## Description

Implement centralized configuration management using .env files with validation (zod/envsafe) and environment profiles (dev/test/prod), eliminating hardcoded paths and improving configuration consistency.

## Requirements

### Current State Analysis
- Configuration scattered across multiple files
- Hardcoded paths (e.g., OLLAMA_MODELS)
- No centralized validation
- Environment-specific settings mixed with code
- No configuration profiles or environments

### Target State
- Centralized configuration management
- .env file support with validation
- Environment profiles (dev/test/prod)
- Type-safe configuration access
- Runtime validation and error reporting

## Implementation Plan

### Phase 1: Configuration Analysis and Schema Design
1. **Audit existing configuration**
   - Identify all configuration sources
   - Document current environment variables
   - Map configuration usage across services
   - Identify hardcoded values to externalize

2. **Design configuration schema**
   - Define configuration structure using zod
   - Create environment-specific overrides
   - Specify validation rules and defaults
   - Design configuration loading strategy

### Phase 2: Configuration Implementation
1. **Create configuration system**
   - Implement config loader with zod validation
   - Create environment-specific configuration
   - Add configuration caching and reloading
   - Implement configuration validation

2. **Create .env templates**
   - Generate .env.example files
   - Document all configuration options
   - Provide default values and examples
   - Include validation rules and constraints

### Phase 3: Integration and Migration
1. **Update services to use centralized config**
   - Replace hardcoded values with config access
   - Update environment variable usage
   - Add configuration validation to startup
   - Implement graceful fallbacks

2. **Add configuration management**
   - Configuration validation in CI/CD
   - Runtime configuration checking
   - Configuration change detection
   - Error reporting for invalid configurations

## Dependencies

- **High Priority**: None
- **Medium Priority**: AI-proxy isolation (infrastructure-01)
- **Low Priority**: Port management (infrastructure-04)

## Files to Create/Modify

### New Files
- `config/` - Centralized configuration directory
- `config/schema.ts` - Configuration schema with zod
- `config/loader.ts` - Configuration loading logic
- `config/environments/` - Environment-specific configs
- `config/environments/dev.ts` - Development configuration
- `config/environments/test.ts` - Test configuration
- `config/environments/prod.ts` - Production configuration
- `.env.example` - Example environment file
- `.env.local` - Local development overrides
- `config/types.ts` - Configuration type definitions

### Modified Files
- `a2a-server/src/config/` - Update to use centralized config
- `ai-integration/proxy/` - Update Python configuration
- `a2a-client/` - Update client configuration
- `package.json` - Add configuration validation scripts
- `docker-compose.yml` - Update environment variable handling

## Success Criteria

### Functional Requirements
- [ ] Centralized configuration schema with zod validation
- [ ] Environment-specific configuration profiles
- [ ] .env file support with validation
- [ ] Type-safe configuration access
- [ ] Runtime configuration validation
- [ ] Graceful fallbacks for missing configuration

### Non-Functional Requirements
- [ ] Configuration loading time under 100ms
- [ ] Validation performance under 50ms
- [ ] Zero configuration-related runtime errors
- [ ] Clear error messages for invalid configuration
- [ ] Support for configuration hot-reloading

## Validation

### Testing Strategy
1. **Schema Validation**: Test configuration schema against all environments
2. **Integration Tests**: Test configuration loading in all services
3. **Error Tests**: Test invalid configuration handling
4. **Performance Tests**: Measure configuration loading performance
5. **Compatibility Tests**: Ensure existing functionality works with new config

### Acceptance Criteria
- [ ] All services use centralized configuration
- [ ] Configuration validation catches invalid settings
- [ ] Environment-specific overrides work correctly
- [ ] Hardcoded paths are eliminated
- [ ] Configuration changes are properly validated
- [ ] Error messages are clear and actionable

## Risk Mitigation

### High Risk
- **Breaking changes**: Maintain backward compatibility during migration
- **Configuration complexity**: Keep configuration simple and well-documented
- **Performance impact**: Optimize configuration loading and validation

### Medium Risk
- **Environment differences**: Test thoroughly across all environments
- **Migration complexity**: Plan phased migration with rollback capability

### Low Risk
- **Tooling complexity**: Keep configuration system simple and maintainable