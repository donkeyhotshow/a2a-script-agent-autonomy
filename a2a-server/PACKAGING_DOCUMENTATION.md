# A2A Server Packaging Documentation

## Overview

This document describes the current packaging structure of the A2A Server and how the application reads configuration to activate/deactivate functionality based on feature flags.

## Package Structure

The server has been migrated from a monolithic `src/` structure to a scoped package architecture:

```
a2a-server/
├── packages/                 # Independent packages
│   ├── config/               # @a2a/server-config - Configuration management
│   ├── utils/                # @a2a/server-utils - Pure utilities
│   ├── protocol/             # @a2a/server-protocol - Type definitions
│   ├── core/                 # @a2a/server-core - Core orchestration
│   ├── transform/            # @a2a/server-transform - Transform pipeline
│   ├── llm/                  # @a2a/server-llm - LLM integration
│   ├── p2p/                  # @a2a/server-p2p - P2P networking
│   ├── daemon/               # @a2a/server-daemon - Background services
│   ├── actions/              # @a2a/server-actions - Action handlers
│   └── server/               # @a2a/server - Main application
├── package.json              # Root workspace configuration
└── tsconfig.json             # Root TypeScript configuration
```

## Configuration System

The `@a2a/server-config` package provides centralized configuration management with comprehensive feature flag support.

### Key Features

1. **Environment Variable Loading**: Loads configuration from `.env` files and process environment
2. **Feature Flags**: Granular control over system mechanisms
3. **Schema Validation**: Validates configuration against JSON schemas
4. **Computed Values**: Derives configuration values from base settings
5. **Feature Management**: Utilities for checking feature enablement and conditional loading

### Core Systems (Always Enabled)

These systems cannot be disabled as they form the foundation of the server:

- Request processing pipeline
- Base orchestration engine
- Fundamental security mechanisms

### Configurable Systems

The following systems can be enabled/disabled via feature flags:

- LLM Services (cognition injection, hierarchical reasoning, etc.)
- P2P Networking (CRDT, relay services)
- Daemon Processes (polling, request processing)
- Action Handlers (file ops, git ops, script execution, MCP calls)
- AI Features (embeddings, RAG, agent swing, episodic memory)
- Infrastructure (monitoring, security, storage, API interfaces)
- Experimental features

## Main Application Entry Point

The main application resides in `packages/server/src/index.ts` and follows this initialization pattern:

```typescript
import http from "node:http";
import app from "./app.js";
import { config } from "../packages/config/index.js"; // Loads configuration
import { logger } from "./utils/logger.js";
import {
  startRequestProcessor,
  stopRequestProcessor,
} from "./daemon/request-processor-daemon.js";
// ... other imports

// Create HTTP server
const server = http.createServer(app);

async function bootstrap(): Promise<void> {
  // Load registries (actions, algorithms, etc.)
  await actionRegistry.loadFromDirectory();
  await algorithmRegistry.loadFromDirectory();

  // Configure prompts/transforms
  const envPromptsPath = process.env.PROMPTS_TRANSFORMS_PATH;
  const resolvedPromptsPath = getPromptsTransformsPath();

  // Start core services
  startRequestProcessor(config.requestProcessorIntervalMs);

  // Initialize distributed services conditionally based on feature flags
  void llmService
    .chat({
      messages: [{ role: "user", content: "warm-up: reply with OK only." }],
    })
    .catch((err: unknown) => {
      logger.warn("[Bootstrap] LLM warm-up failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

  peerRelay.joinRoom("main", "server-01");

  server.listen(config.port, () => {
    logger.info(`A2A Server started`, {
      port: config.port,
      environment: config.nodeEnv,
      pid: process.pid,
    });
  });
}

void bootstrap();
```

## Feature Flag Implementation

Feature flags are implemented in `packages/config/features.ts` and provide:

### Feature Manager Class

```typescript
export class FeatureManager {
  private config: FeaturesConfig;

  constructor(config: FeaturesConfig) {
    this.config = config;
  }

  isEnabled(featurePath: string): boolean {
    // Checks nested feature configuration (e.g., "llm.cognitionInjection")
    const path = featurePath.split(".");
    let current: any = this.config;

    for (const segment of path) {
      if (current && typeof current === "object" && segment in current) {
        current = current[segment];
      } else {
        return false;
      }
    }

    return Boolean(current);
  }
}
```

### Feature Groups

The feature manager provides grouped accessors for related features:

- `featureManager.aiHub` - AI Hub services
- `featureManager.p2p` - P2P networking
- `featureManager.daemon` - Background processes
- `featureManager.actions` - Action handlers
- `featureManager.transform` - Transform pipeline
- `featureManager.ai` - AI features
- `featureManager.monitoring` - Monitoring & observability
- `featureManager.security` - Security features
- `featureManager.storage` - Storage systems
- `featureManager.api` - API interfaces

### Conditional Service Loading

Utility functions enable conditional loading of services/middleware:

```typescript
export async function loadServiceIfEnabled<T>(
  featurePath: string,
  featureManager: FeatureManager,
  serviceLoader: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  if (featureManager.isEnabled(featurePath)) {
    return await serviceLoader();
  }
  return fallback;
}
```

## Configuration Usage Examples

### In Application Bootstrap

```typescript
import { config } from "@a2a/server-config";
import { createFeatureManager } from "@a2a/server-config/features";

// Create feature manager
const featureManager = createFeatureManager(config.features);

// Conditionally initialize LLM service
if (featureManager.isEnabled("llm.enabled")) {
  // Initialize LLM connections, warm up models, etc.
}

// Conditionally start P2P relay
if (featureManager.isEnabled("p2p.enabled")) {
  peerRelay.joinRoom("main", "server-01");
}
```

### In Service Implementation

```typescript
import { createFeatureManager } from "@a2a/server-config/features";
import { config } from "@a2a/server-config";

// In LLM service
const featureManager = createFeatureManager(config.features);

if (featureManager.isEnabled("llm.cognitionInjection")) {
  // Enable cognition injection logic
}

if (featureManager.isEnabled("llm.hierarchicalReasoning")) {
  // Enable hierarchical reasoning
}
```

### In Middleware

```typescript
import { loadMiddlewareIfEnabled } from "@a2a/server-config/features";
import { config } from "@a2a/server-config";
import { createFeatureManager } from "@a2a/server-config/features";

const featureManager = createFeatureManager(config.features);

// Conditionally add monitoring middleware
const monitoringMiddleware = loadMiddlewareIfEnabled(
  "monitoring.enabled",
  featureManager,
  () => require("./monitoring-middleware").default,
);

if (monitoringMiddleware) {
  app.use(monitoringMiddleware);
}
```

## Environment Variables

Configuration is loaded from environment variables with sensible defaults. Key variables include:

### Server Configuration

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level

### Feature Flags

- `FEATURE_LLM_ENABLED` - Master switch for LLM features
- `FEATURE_P2P_ENABLED` - Master switch for P2P features
- `FEATURE_DAEMON_ENABLED` - Master switch for daemon processes
- `FEATURE_ACTIONS_ENABLED` - Master switch for action handlers
- `FEATURE_TRANSFORM_ENABLED` - Master switch for transform pipeline
- `FEATURE_AI_ENABLED` - Master switch for AI features
- `FEATURE_MONITORING_ENABLED` - Master switch for monitoring
- `FEATURE_SECURITY_ENABLED` - Master switch for security
- `FEATURE_STORAGE_ENABLED` - Master switch for storage
- `FEATURE_API_ENABLED` - Master switch for API interfaces

### Sub-feature Flags

- `FEATURE_LLM_COGNITION_INJECTION_ENABLED` - Enable cognition injection
- `FEATURE_LLM_HIERARCHICAL_REASONING_ENABLED` - Enable hierarchical reasoning
- `FEATURE_P2P_CRDT_ENABLED` - Enable CRDT synchronization
- `FEATURE_ACTIONS_FILE_OPERATIONS_ENABLED` - Enable file operation actions
- `FEATURE_TRANSFORM_GRAY_ROOM_ENABLED` - Enable Gray Room transformations
- `FEATURE_AI_EMBEDDINGS_ENABLED` - Enable embeddings generation
- `FEATURE_MONITORING_METRICS_ENABLED` - Enable metrics collection
- `FEATURE_SECURITY_AUTH_ENABLED` - Enable authentication
- `FEATURE_STORAGE_DATABASE_ENABLED` - Enable database storage
- `FEATURE_API_REST_ENABLED` - Enable REST API

## Build and Deployment

### Build Process

The monorepo uses npm workspaces for package management:

```bash
# Build all packages in dependency order
npm run build

# Build only core dependencies
npm run build:deps

# Build services
npm run build:services

# Build main application
npm run build:app
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Start development server with auth disabled
npm run dev:no-auth

# Start development server locally
npm run dev:local
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Dependency Flow

Packages follow a strict dependency hierarchy:

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

This ensures:

- No circular dependencies
- Clear separation of concerns
- Independent versioning where appropriate
- Optimal rebuild caching

## Extending the System

To add new functionality:

1. **Create a new package** (if needed) under `packages/`
2. **Add feature flags** to `packages/config/schema.ts`
3. **Provide default values** in `packages/config/database.ts`
4. **Implement feature-checking logic** in your package using `@a2a/server-config/features`
5. **Update the main application** to conditionally initialize your functionality
6. **Add appropriate dependencies** to your package's `package.json`

## Conclusion

The A2A Server now follows a properly packaged architecture where:

- The main application resides in `packages/server/src/`
- Configuration is centralized in `@a2a/server-config`
- Feature flags enable granular control over system mechanisms
- Core systems remain always enabled for stability
- Services are conditionally loaded based on configuration
- The dependency flow is clear and acyclic

This structure enables:

- Flexible deployment (enable only needed features)
- Performance optimization (disable unused features)
- Gradual rollout of experimental features
- Operational control over system behavior
- Independent development and versioning of packages
