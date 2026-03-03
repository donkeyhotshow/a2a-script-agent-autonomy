# ADR-0002: Package Structure and Monorepo Organization

Status: accepted
Date: 2026-03-03

## Context

The A2A Client consists of multiple interconnected components that need to be organized in a way that:

- Enables independent development and testing of components
- Facilitates code reuse across different client applications
- Manages dependencies and versioning effectively
- Supports different deployment targets (web, desktop, etc.)
- Maintains clear boundaries between different concerns
- Allows for gradual refactoring and evolution of the codebase

The current structure has packages like `api-client`, `types`, `fs-utils`, `terminal`, `script-runner`, `rag`, `embedding`, `history`, `json`, and `web`, but lacks clear organizational principles.

## Decision

Adopt a monorepo structure with npm workspaces and organize packages by functional domains:

### 1. Package Categories

#### Core Infrastructure Packages
- **`@a2a/types`**: Shared TypeScript definitions and interfaces
- **`@a2a/api-client`**: HTTP client for server communication
- **`@a2a/json`**: JSON utilities and serialization helpers

#### Action Execution Packages
- **`@a2a/script-runner`**: Client-side script execution and sandboxing
- **`@a2a/fs-utils`**: File system operations and utilities
- **`@a2a/terminal`**: Terminal/command execution capabilities
- **`@a2a/rag`**: Retrieval-Augmented Generation functionality
- **`@a2a/embedding`**: Vector embedding and similarity search

#### State and Data Packages
- **`@a2a/history`**: Command history and session management
- **`@a2a/storage`**: Local storage and persistence utilities

#### Application Packages
- **`@a2a/web`**: Web UI application using Vue.js
- **`@a2a/api-server`**: Client-side API server for local operations

### 2. Dependency Management

#### Internal Dependencies
- **Strict dependency hierarchy**: Lower-level packages cannot depend on higher-level packages
- **Shared utilities**: Common functionality in `@a2a/types` and `@a2a/json`
- **Optional dependencies**: Packages can have optional dependencies on other packages
- **Peer dependencies**: Shared runtime dependencies declared as peer dependencies

#### External Dependencies
- **Version pinning**: Critical dependencies pinned to specific versions
- **Security updates**: Regular security updates for all dependencies
- **Bundle size optimization**: Minimize bundle size by using tree-shakable dependencies

### 3. Build and Development

#### Build System
- **Vite** for development and build processes
- **TypeScript** compilation with strict type checking
- **ESLint** and **Prettier** for code quality
- **Jest** or **Vitest** for testing

#### Development Workflow
- **Workspace commands**: Common commands available at root level
- **Package-specific commands**: Each package can have its own build/test commands
- **Cross-package testing**: Integration tests that span multiple packages
- **Type checking**: Cross-package type checking to catch breaking changes

### 4. Versioning and Publishing

#### Version Management
- **Independent versioning**: Each package can have its own version
- **Semantic versioning**: Follow semantic versioning for all packages
- **Breaking change detection**: Automated detection of breaking changes
- **Release coordination**: Coordinated releases when multiple packages are affected

#### Publishing Strategy
- **NPM registry**: Publish packages to NPM registry
- **Access control**: Private packages for internal use, public for reusable components
- **Documentation**: Auto-generated documentation for each package

## Consequences

### Positive

- **Modularity**: Clear package boundaries enable independent development
- **Reusability**: Well-defined packages can be reused across projects
- **Maintainability**: Changes are localized to specific packages
- **Testing**: Each package can be tested independently
- **Performance**: Tree-shaking and selective bundling reduce bundle sizes
- **Developer Experience**: Clear structure makes it easier to understand and contribute

### Trade-offs

- **Complexity**: Monorepo adds complexity to build and dependency management
- **Learning Curve**: Developers need to understand the package structure
- **Tooling Requirements**: Requires sophisticated tooling for effective management
- **Coordination Overhead**: Changes affecting multiple packages require coordination

### Implementation Requirements

- **Workspace Configuration**: Proper npm workspace configuration in root package.json
- **Build Scripts**: Shared build scripts and configurations
- **Testing Strategy**: Comprehensive testing strategy covering unit, integration, and e2e tests
- **Documentation**: Clear documentation for package structure and development guidelines

## Notes / Follow-ups

- Establish clear guidelines for when to create new packages vs. adding to existing ones
- Implement automated dependency graph analysis to detect circular dependencies
- Set up automated testing and CI/CD for the monorepo
- Consider implementing a package template for consistent package creation
- Plan migration strategy for existing code into the new structure
- Establish code review guidelines for cross-package changes