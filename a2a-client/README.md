# a2a-client

Client-side monorepo containing web UI, Vite plugin, and SDK packages.

## Structure

```
a2a-client/
├── packages/         # Client SDK packages
│   ├── core/         # Core client functionality
│   ├── embedding/    # Embedding services
│   ├── execution/    # Script execution
│   ├── history/      # History management
│   ├── json/         # JSON utilities
│   ├── protocol/     # Protocol definitions
│   ├── rag/          # RAG functionality
│   ├── sdk/          # Main SDK package
│   ├── shared/       # Shared utilities
│   ├── storage/      # Storage services
│   ├── types/        # Type definitions
│   ├── vite-plugin/  # Vite plugin for client API routes
│   └── web/          # Web UI components
├── src/              # Client application source
│   ├── config.ts     # Configuration schema and loading
│   └── index.ts      # Main application entry point
├── package.json      # Client workspace root
└── vitest.config.ts  # Test configuration
```

## Application Structure

The client application is located in the `src/` directory and follows a modular architecture:

- **Configuration System**: The application reads configuration from JSON files or environment variables to determine which features to activate
- **Feature Activation**: Based on configuration, specific features (RAG, embedding, execution, web, storage) are dynamically loaded and initialized
- **Lifecycle Management**: The application provides start/stop methods for all enabled features

### Configuration

The application uses a schema-based configuration system (via Zod) that validates:
- Feature flags (rag, embedding, execution, web, storage)
- API settings (timeout, retries, delays)
- Polling intervals
- Logger configuration

Features are activated based on boolean flags in the configuration. The main application class (`A2AClientApplication`) loads the configuration, initializes the enabled features, and manages their lifecycle.

**Live stack:** Start or restart the full coordinated system from the **repository root** with `.\start-all.bat` (Windows) or `./start-all.sh` (Linux/macOS). Do not use `npm run dev` under `web/`, `packages/*`, or elsewhere in this tree as the primary way to restart the whole stack — that duplicates processes and breaks PID tracking.

**Session disk cleanup:** `npm run cleanup:sessions` runs [`scripts/cleanup-sessions.js`](scripts/cleanup-sessions.js) and deletes **every** folder under `storage/sessions/` (no retention by age). For the same tree from the repo root, use `npm run cleanup:sessions-only`. After a wipe, Task Monitor re-binds **one** Client API session per prompt (`taskSessions`). See [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md).
