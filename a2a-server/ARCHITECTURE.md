# A2A Server Architecture

## Overview

The A2A Server follows a modular architecture designed for flexibility, maintainability, and scalability. The system is organized into three primary layers:

1. **Core** - Foundation and shared code
2. **Features** - Event listeners and handlers
3. **Packages** - Independent, reusable systems

## Core

The Core layer contains the fundamental building blocks and shared code that connect all parts of the system. It provides essential services, utilities, and infrastructure that are used throughout the application.

### Key Components:

- **Event Bus** (`core/event-bus.ts`): Internal typed event bus for decoupled agent services with session-scoped circular buffers for causal replay
- **Orchestrator Kernel**: Central coordination mechanism for request processing
- **Safety Layer**: Protection mechanisms including loop detection, confidence tracing, and context validation
- **Request Processing**: Base processors, handlers, and validators for different request types
- **Agent Services**: Role management, goal planning, and cognitive engines
- **Utilities**: Shared helper functions for validation, logging, crypto, and file operations

The Core layer is designed to be stateless where possible, with session-specific state managed through the event bus buffering system.

## Features

Features represent event listeners and handlers that respond to specific events in the system. They plug into the core architecture to extend functionality without modifying core code.

### Characteristics:

- **Event-Driven**: Features listen for specific event types (e.g., `post_llm_call`)
- **Pluggable**: Can be enabled/disabled via configuration
- **Prioritized**: Execute in defined order based on priority values
- **Stateless Processing**: Typically process events and return context modifications

### Example: Gray Room Feature

The Gray Room feature (`features/gray-room/index.ts`) demonstrates this pattern:

- Listens for `post_llm_call` events
- Checks if gray room processing should be triggered
- Executes interrupt-based workflows when conditions are met
- Returns context modifications to continue processing

Features are organized in the `features/` directory, with each feature typically containing:

- Main implementation file (`index.ts`)
- Configuration files
- Component implementations
- Tests

## Packages

Packages are the main systems broken down into independent, reusable modules. This represents the ongoing migration from a monolithic structure to a package-based architecture.

### Package Structure:

```
packages/
├── config/         # Configuration management (@a2a/server-config)
├── utils/          # Pure utilities (@a2a/server-utils)
├── protocol/       # Type definitions (@a2a/server-protocol)
├── core/           # Core orchestration (@a2a/server-core)
├── transform/      # Transform pipeline (@a2a/server-transform)
├── llm/            # LLM integration (@a2a/server-llm)
├── p2p/            # P2P networking (@a2a/server-p2p)
├── daemon/         # Background services (@a2a/server-daemon)
├── actions/        # Action handlers (@a2a/server-actions)
└── server/         # Main application (@a2a/server)
```

### Migration Status:

The system is currently migrating from the legacy `src/` structure to the package-based approach:

- Legacy code in `src/` is being moved to appropriate packages
- New development primarily occurs in the packages directory
- The root `package.json` manages the workspace configuration

### Key Packages:

- **utils**: Low-level utilities (validation, logging, crypto, file operations)
- **protocol**: Shared TypeScript interfaces and types
- **core**: Central orchestration logic moved from `src/core/`
- **transform**: Request/response transformation pipeline
- **llm**: LLM provider integrations and prompt management
- **actions**: Concrete action implementations (file operations, script execution, etc.)
- **server**: Express application setup and route definitions

## Data Flow

1. **Request Entry**: `POST /api/v1/invoke` creates a promise ID and queues processing
2. **Event Publishing**: As processing progresses, events are published to the EventBus
3. **Feature Processing**: Registered features listen for relevant events and modify context
4. **Package Execution**: Core logic in packages handles the actual work (LLM calls, tool execution, etc.)
5. **Result Storage**: Processed results are stored and made available via status/result endpoints
6. **Polling**: Clients poll `/api/v1/requests/:promiseId/result` for completion

## Extension Points

### Adding New Features:

1. Create a directory in `features/` (e.g., `features/my-feature`)
2. Implement the `FeatureAction` interface
3. Register the feature in configuration
4. The feature will automatically process matching events

### Adding New Packages:

1. Create a directory in `packages/` (e.g., `packages/my-package`)
2. Implement the package functionality
3. Export through the package's `index.ts`
4. Import and use from other packages or features as needed

### Adding New Actions:

1. Implement action handler in `packages/actions/src/actions/handlers/`
2. Register in action registry
3. Reference in action definitions (YAML/JSON)

## Design Principles

1. **Separation of Concerns**: Core, features, and packages have distinct responsibilities
2. **Event-Dr Architecture**: Loose coupling through event publishing/subscribing
3. **Pluggability**: Features can be added/removed without core modifications
4. **Statelessness**: Minimal server-side session storage, using IDs and external storage
5. **Incremental Migration**: Legacy and new structures coexist during transition
6. **Type Safety**: Extensive use of TypeScript for compile-time safety

## Related Documentation

- [`docs/SYSTEM_STARTUP.md`]: Instructions for starting the full system
- [`docs/GRAY-ROOM.md`]: Detailed information about the Gray Room feature
- [`docs/TRANSFORM-OPS.md`]: Transform pipeline operations
- [`docs/Router.md`]: Request routing mechanisms
- [`docs/EXTENDING-LLM-ACTIONS.md`]: Adding new LLM-capable actions
- [`docs/LLM-REQUEST-PREP.md`]: LLM request preparation flow
