# Full Packaging Plan for A2A Server

## Commands

mv

## Current State Assessment

The codebase has been restructured with:

- Core engine in `src/core/`
- Services in `src/services/`
- Protocol types in `src/protocol/types/`
- Utilities in `src/lib/`
- Extracted config in `packages/config/`
- Documentation moved appropriately

## Packaging Goals

1. Convert the monolithic `src/` structure into properly scoped packages
2. Establish clear dependency boundaries
3. Enable independent versioning and publishing
4. Improve build times through parallelization
5. Facilitate code reuse across the monorepo (a2a-client, a2a-agents, etc.)
6. **Add feature flag configuration for enabling/disabling system mechanisms** (except core systems)

## Proposed Package Structure

### 1. Core Packages (Versioned Together)

```
@a2a/server-core           # Core orchestration engine
@a2a/server-transform      # Transform pipeline operations
@a2a/server-protocol       # Type definitions and protocols
@a2a/server-utils          # Shared utilities (moved from src/lib/)
```

### 2. Service Packages (Can be versioned independently)

```
@a2a/server-llm            # LLM integration services
@a2a/server-p2p            # P2P networking layer
@a2a/server-daemon         # Background daemon processes
@a2a/server-actions        # Action handling system
```

### 3. Infrastructure Packages

```
@a2a/server-config         # Already created as packages/config/
@a2a/server-logger         # Logging utility (if extracted)
@a2a/server-metrics        # Metrics collection (if extracted)
```

## Implementation Plan

### Phase 1: Package Definition

For each package, create:

1. A dedicated directory under `packages/`
2. A `package.json` with proper name, version, and dependencies
3. A `tsconfig.json` extending the base configuration
4. Move relevant source files
5. Update internal imports

### Phase 2: Monorepo Setup

Choose between:

- **npm workspaces** (simplest, already partially used)
- **turborepo** (for advanced caching and task orchestration)
- **lerna** (more features but heavier)

Recommendation: Use npm workspaces since they're already configured in root package.json.

### Phase 3: Dependency Management

Establish clear dependency flow:

```
@a2a/server-config
      ↓
@a2a/server-utils ↔ @a2a/server-protocol
      ↓
@a2a/server-core → @a2a/server-transform
      ↓
@a2a/server-llm, @a2a/server-p2p, @a2a/server-daemon, @a2a/server-actions
      ↓
@a2a/server (main application that orchestrates everything)
```

### Phase 4: Build System Updates

1. Update root `tsconfig.json` to use package references
2. Create build scripts that respect package boundaries
3. Set up `prebuild`/`postbuild` hooks where needed
4. Configure test running per package

### Phase 5: Documentation and Automation

1. Update README with package structure documentation
2. Create scripts for common package operations
3. Add CI/CD pipeline updates for multi-package builds
4. Create changelog generation process

## Detailed Package Specifications

### @a2a/server-core

- Location: `packages/core/`
- Contents:
  - Core orchestration (GrayRoomOrchestrator, ActionRequestProcessor, etc.)
  - Request processing pipeline
  - Base processor classes
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-protocol
  - @a2a/server-transform

### @a2a/server-transform

- Location: `packages/transform/`
- Contents:
  - Transform pipeline operations
  - Prompt processing
  - Materialization logic
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-protocol

### @a2a/server-protocol

- Location: `packages/protocol/`
- Contents:
  - TypeScript type definitions
  - Protocol interfaces
  - Message schemas
- Dependencies: None (foundational)

### @a2a/server-utils

- Location: `packages/utils/`
- Contents:
  - Logger implementation
  - Retry/backoff utilities
  - Deep clone, crypto helpers
  - Markdown processing
- Dependencies: None (except standard library)

### @a2a/server-llm

- Location: `packages/llm/`
- Contents:
  - LLM service integrations
  - Prompt orchestration
  - Model resolution
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-protocol

### @a2a/server-p2p

- Location: `packages/p2p/`
- Contents:
  - P2P networking nodes
  - CRDT implementations
  - Peer discovery
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-protocol

### @a2a/server-daemon

- Location: `packages/daemon/`
- Contents:
  - Background polling services
  - LLM hub integration
  - Request processor daemons
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-core
  - @a2a/server-llm (optional)

### @a2a/server-actions

- Location: `packages/actions/`
- Contents:
  - Action registry and processing
  - Handler implementations
  - Action DSL processing
- Dependencies:
  - @a2a/server-config
  - @a2a/server-utils
  - @a2a/server-protocol
  - @a2a/server-core

### Main Application (@a2a/server)

- Location: Root directory (after moving src/ to packages/server/)
- Contents:
  - Application entry point (index.ts)
  - HTTP server setup
  - Route definitions
  - Middleware composition
- Dependencies: All other @a2a/server-\* packages

## Feature Flag Configuration

### Overview

The packaged system includes comprehensive feature flag configuration allowing granular control over system mechanisms while maintaining core functionality.

### Key Features

#### Configurable System Components

- **LLM Services**: cognition injection, hierarchical reasoning, bug fixing
- **P2P Networking**: CRDT, relay services
- **Daemon Processes**: polling, request processing
- **Action Handlers**: file ops, git ops, script execution, MCP calls
- **AI Features**: embeddings, RAG, agent swing, episodic memory
- **Infrastructure**: monitoring, security, storage, API interfaces
- **Experimental**: self-evolving systems, vision processing, external integrations

#### Core Systems (Always Enabled)

- Request processing pipeline
- Base orchestration engine
- Fundamental security (cannot be disabled)

### Configuration Usage

#### Environment Variables

```bash
# Feature toggles
FEATURE_LLM_ENABLED=true
FEATURE_P2P_ENABLED=false
FEATURE_EXPERIMENTAL_ENABLED=false

# Sub-feature control
FEATURE_LLM_COGNITION_INJECTION=true
FEATURE_AI_EMBEDDINGS=false
FEATURE_MONITORING_NOTIFICATIONS=true
```

#### Code Integration

```typescript
import { features } from "@a2a/server-config";

// Check feature availability
if (features.llm.enabled && features.llm.cognitionInjection) {
  // Enable cognition injection
}

// Conditional service loading
const p2pService = features.p2p.enabled
  ? await import("@a2a/server-p2p")
  : null;
```

### Benefits

- **Flexible Deployment**: Enable only needed features per environment
- **Performance Optimization**: Reduce resource usage by disabling unused features
- **Gradual Rollout**: Enable experimental features selectively
- **Operational Control**: Fine-grained control over system behavior

## Migration Steps

### Step 1: Create Package Directories

```bash
mkdir -p packages/{core,transform,protocol,utils,llm,p2p,daemon,actions}
```

### Step 2: Create Base Package Templates

For each package, create:

- package.json
- tsconfig.json
- src/ directory for source files

### Step 3: Migrate Source Files

Move files from src/ to appropriate packages/ directories based on functionality.

### Step 4: Update Import Paths

Replace relative imports with package imports:

- `../../utils/logger.js` → `@a2a/server-utils/logger.js`
- `../core/orchestrator/GrayRoomOrchestrator.js` → `@a2a/server-core/orchestrator/GrayRoomOrchestrator.js`

### Step 5: Configure Monorepo

Update root package.json:

```json
{
  "workspaces": ["packages/*"],
  "private": true
}
```

### Step 6: Update Build Scripts

Modify build process to:

1. Build packages in dependency order
2. Support incremental builds
3. Allow building individual packages

### Step 7: Test and Validate

1. Ensure all tests pass
2. Verify dependency tree is correct
3. Check that publishing works (if applicable)
4. Validate runtime behavior unchanged

## Benefits of This Approach

1. **Clear Boundaries**: Each package has a single responsibility
2. **Independent Development**: Teams can work on different packages simultaneously
3. **Better Caching**: Unchanged packages don't need rebuilding
4. **Easier Testing**: Can test packages in isolation
5. **Reusability**: Packages can be shared across a2a-client, a2a-agents, etc.
6. **Version Control**: Different packages can have different release cycles

## Risks and Mitigations

1. **Circular Dependencies**:
   - Mitigation: Use dependency mapping tools during migration
2. **Performance Overhead**:
   - Mitigation: Bundle commonly used packages together for runtime
3. **Migration Complexity**:
   - Mitigation: Migrate one package at a time, ensuring tests pass after each
