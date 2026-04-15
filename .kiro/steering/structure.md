# Repository Structure

## Layout

```
a2a-script-agent/
├── a2a-server/              # A2A Server (Express, TypeScript, stateless invoke)
│   ├── packages/
│   │   ├── server/          # Main server feature (173 files) — routes, processors, gray-room
│   │   ├── actions/         # Action handlers (43 files)
│   │   ├── gray-room/       # Gray Room LLM chain (45 files)
│   │   ├── lib/             # Shared server lib (46 files)
│   │   ├── llm/             # LLM integration (7 files)
│   │   ├── services/        # Feature services (9 files)
│   │   ├── transform/       # Transform pipeline (17 files)
│   │   ├── server-utils/    # @a2a/server-utils — logger, validation, deep-clone
│   │   ├── server-protocol/ # @a2a/server-protocol — shared protocol types
│   │   ├── server-config/   # @a2a/config — config loading
│   │   ├── request/         # @a2a/server-request — request handling
│   │   ├── features/        # @a2a/server-features — feature flags
│   │   └── daemon/          # @a2a/server-daemon — background daemon
│   └── src/index.ts         # Server entry point
├── a2a-client/              # Client API + Web UI (Vue 3 + Vite)
│   ├── packages/
│   │   ├── sdk/             # @a2a/sdk — Client API server (port 3001)
│   │   ├── storage/         # @a2a-client/storage — session/KV storage
│   │   ├── execution/       # @a2a-client/execution — script runner, fs-utils
│   │   ├── core/            # @a2a-client/core — invoke builders
│   │   ├── protocol/        # @a2a-client/protocol — router submit, next pipeline
│   │   ├── history/         # @a2a-client/history — session history manager
│   │   ├── vite-plugin/     # @a2a-client/vite-plugin — Vite integration
│   │   ├── types/           # @a2a-client/types — shared types
│   │   ├── json/            # @a2a-client/json — JSON utilities
│   │   ├── rag/             # @a2a-client/rag — RAG/search
│   │   └── shared/          # @a2a-client/shared — shared utilities
│   └── storage/             # Runtime session storage (sessions/, kv/)
├── a2a-ai-hub/              # AI Hub proxy (Python/FastAPI, port 11434)
│   └── proxy/               # Promise queue, provider routing, caching
├── a2a-orchestrator/        # Orchestrator scripts
├── scripts/                 # Runbook CLI, port manager, fix-imports
│   ├── runbook-cli.js       # Service lifecycle manager
│   └── monitor-tasks/       # Task Monitor implementation
├── docs/                    # Documentation (ADRs, protocols, DEV_STATE)
├── simulations/             # Golden-standard test scenarios
├── tests/                   # Integration + indirect tests
├── tasks/                   # Active task queue (agent work items)
├── prompts-to-agent-mode/   # Prompt queue for Task Monitor
├── tools/monitor/           # Monitor tools + session-flow-viewer
└── arch-map.json            # Machine-readable architecture map
```

## Package responsibilities

| Package | Role |
|---------|------|
| `a2a-server` | Stateless invoke server — receives context, returns promiseId or result |
| `a2a-server/packages/server` | Main request processor, router, gray-room orchestration |
| `a2a-server/packages/gray-room` | LLM interrupt loop, thinking handlers |
| `a2a-server/packages/actions` | execute/result action handlers |
| `a2a-server/packages/server-utils` | Logger (winston), validation, deep-clone |
| `a2a-server/packages/server-protocol` | Shared protocol types and validators |
| `a2a-client/packages/sdk` | Client API server (port 3001) — session management, /next, /async |
| `a2a-client/packages/storage` | File-based session + KV storage |
| `a2a-client/packages/execution` | vm2-based script runner, path sandbox |
| `a2a-ai-hub` | AI proxy — provider routing, promise queue, caching |

## Dependency rules

- `a2a-server` packages may import from `@a2a/server-*` workspace packages
- `a2a-client` packages may import from `@a2a-client/*` workspace packages
- `a2a-server` must NOT import from `a2a-client` packages
- `a2a-client` must NOT import from `a2a-server` packages directly
- `@a2a/sdk` (client-side) must NOT use `@a2a/server-*` names (namespace collision risk — see arch-map.json violations)
- Scripts in `scripts/` may import from both sides (orchestration only)

## Entry points

| Service | Entry file | Start command | Port |
|---------|-----------|---------------|------|
| A2A Server | `a2a-server/packages/server/src/index.ts` | `tsx watch packages/server/src/index.ts` | 3000 |
| Client API | `a2a-client/packages/sdk/src/server/index.ts` | `scripts/start-client-api.bat` | 3001 |
| Web UI | `a2a-client` (vite) | `vite` | 5173 |
| AI Hub | `a2a-ai-hub/proxy/asgi.py` | `uvicorn proxy.asgi:app` | 11434 |
| Ollama | docker | `docker run ollama/ollama` | 11435 |
| PostgreSQL | docker | `docker compose up postgres` | 5432 |
| Redis | docker | `docker compose up redis` | 6379 |

**Always start from repo root:** `npm run dev` (uses `scripts/runbook-cli.js start`)

## Data flow

```
User/Agent
    │
    ▼
Client API (3001)  ──── session storage (a2a-client/storage/)
    │  POST /api/a2a/sessions
    │  POST /api/a2a/sessions/:id/next
    │  GET  /api/a2a/sessions/:id/async
    │
    ▼
A2A Server (3000)  ──── request storage (a2a-server/storage/requests/)
    │  POST /api/v1/invoke
    │  GET  /api/v1/requests/:id/result
    │
    ▼
AI Hub (11434)     ──── promise queue (bullmq/redis) + disk cache
    │  POST /api/chat?promise=1  → returns promiseId (202)
    │  POST /promise/:id/execute → triggers daemon execution
    │  GET  /promise/:id/status  → poll until terminal
    │
    ▼
LLM Provider (Ollama/OpenAI/etc.)
```
