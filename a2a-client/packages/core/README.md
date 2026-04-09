# Shared Directory

This directory contains cross-module contracts and shared utilities used across the A2A Script Agent project, facilitating communication between different components.

## Where each asset is loaded (code)

| File | Consumed in |
|------|-------------|
| `router-static-choices.json` | [`a2a-server/src/config/router-static.ts`](../a2a-server/src/config/router-static.ts) (`readFileSync` at startup); tests: [`a2a-server/tests/unit/router-static-config.test.ts`](../a2a-server/tests/unit/router-static-config.test.ts) |
| `api-helpers.js` / `api-helpers.d.ts` | SDK: [`a2a-client/packages/sdk/src/session-manager.ts`](../a2a-client/packages/sdk/src/session-manager.ts), [`async-client.ts`](../a2a-client/packages/sdk/src/async-client.ts) (`from '../../../shared/api-helpers.js'`); web loads via [`a2a-client/packages/web/index.html`](../a2a-client/packages/web/index.html) before `api-integration.js`. |
| `internal-client-action-keys.mjs` | Re-export only; canonical definitions live under `a2a-client/shared/` — see file header. |
| `client-api-envelope.mjs` | Re-export only; canonical under `a2a-client/shared/`. |

## Purpose

The shared directory serves as a contract boundary between:
- Client-side packages (`a2a-client/packages/*`)
- Server-side modules (`a2a-server/src/*`)
- AI integration components (`ai-integration/*`)
- Plugin systems (`a2a-client/packages/vite-plugin/*`)

## Files

### `api-helpers.js` and `api-helpers.d.ts`
Utility functions for interacting with the A2A API. The `.js` file contains the implementation, while `.d.ts` provides TypeScript type definitions.

Key functions include:
- `normalizeApiBase`: Normalizes API base URLs
- `buildClientA2aUrl`: Constructs Client API URLs
- `buildFetchHeaders`: Builds headers for API requests
- `normalizeSessionResponse`: Normalizes session data from API responses
- `normalizeSessionsList`: Filters and normalizes session lists
- Polling utilities: `DEFAULT_POLL_INTERVAL`, `DEFAULT_POLL_TIMEOUT` (unbounded for promiseId/session-async wait loops), `isPromiseResolved`, `isPromiseFailed`

### `router-static-choices.json`
Defines static routing choices available in the system's router. Contains predefined options for task execution modes, including:
- `dialog`: Free-form AI dialogue without code tools
- `agent`: Universal agent mode with code tools (search, files, commands)
- `task-decomposition`: Task breakdown and planning
- Specialized scripted actions like `fix-vue-imports` and `fix-laravel-namespaces-and-uses`

Includes localized labels and descriptions (in Ukrainian).

### `internal-client-action-keys.mjs`
Re-exports from `a2a-client/shared/internal-client-action-keys.mjs`. Defines the canonical list of internal client action keys that are stripped from Web DTO `execute` objects to prevent exposing sensitive operations to the frontend.

### `client-api-envelope.mjs`
Re-exports from `a2a-client/shared/client-api-envelope.mjs`. Provides utilities for handling API response envelopes, including:
- `unwrapEnvelope`: Extracts data from `{ success, data }` or `{ success, session }` responses
- `unwrapA2aInvokeBody`: Handles A2A invoke response unwrapping
- `parseA2aInvokeResponse`: Parses invoke responses for SDK/session usage
- `validateClientResultPayload`: Validates client result payloads for `POST /sessions/:id/next`
- `normalizePromisePollStatus`: Normalizes async promise polling status

## Cross-Module Contracts

This directory establishes the interfaces and data structures that enable loose coupling between modules while maintaining type safety and consistent communication patterns.
