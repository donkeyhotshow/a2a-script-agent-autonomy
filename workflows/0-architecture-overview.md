# Architecture Overview

> **Goal:** Understand system boundaries before editing code.

## System Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT SIDE                                  │
│                         (a2a-client/)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Web UI (web/)        │  CLI (cli/)      │  Tester (tester/)          │
│  - index.html         │  - local storage  │  - remote control            │
│  - Components         │  - offline        │  - testing framework         │
│  - TransportManager   │                   │                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Packages (packages/)                                                   │
│  - sdk/          - types/        - storage/                              │
│  - rag/          - execution/    - history/                               │
│  - embedding/    - json/                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                           SERVER SIDE                                  │
│                         (a2a-server/)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  API Layer                                                            │
│  - Routes (index.ts, requests.routes.ts, actions.routes.ts)             │
│  - Services (invoke.service.ts, request.service.ts)                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Core Processing                                                       │
│  - Request Processor (request-processor.service.ts)                    │
│  - Phase Machine (phase-machine.service.ts)                            │
│  - Context Manager (context-manager.service.ts)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Actions System                                                       │
│  - Action Registry (action-registry.ts)                                │
│  - Action Executor (action-executor.ts)                                │
│  - Action Processor (action-processor.ts)                              │
│  - Action Service (action-service.ts)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Protocol Layer                                                       │
│  - Message Builders (message-builders/)                                │
│  - Context Parsers (context-parsers/)                                │
│  - Converters (legacy-to-canonical.converter.ts)                       │
│  - Transforms (versioning/)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  External                                                             │
│  - LLM Adapter (llm-adapter.ts, ollama-adapter.ts)                    │
│  - Database (Prisma + PostgreSQL)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User → Web UI → TransportManager → API Server → Request Processor
                                          ↓
                                    [Phase Machine]
                                          ↓
                              [Action Service | LLM Adapter]
                                          ↓
                                    Database/Response
```

## Key Boundaries

| Boundary | Files | Rule |
|----------|-------|------|
| **Transport** | `transport/*.js`, `transport-manager.js` | Never call directly, use TransportManager |
| **Storage** | `storage.js`, `session-store*.js` | Always use adapters, never raw localStorage |
| **Protocol** | `protocol/*.ts`, `validators/` | Always validate, use canonical format |
| **State** | `session-sync*.js`, `state/` | Use sync v2, not direct mutation |

## Canonical Patterns

### 1. AI-Action Transform Pattern (AGENTS.md)

All AI-driven flows use this pattern:

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": { "<action_type>": { ...params } },
  "completed": false
}
```

### 2. Action-Key Shape

**Correct:**
```typescript
{ result: { "read-file": { path: "...", content: "..." } } }
{ execute: { "script": { input: {}, output: "...", code: "..." } } }
```

**Wrong:**
```typescript
{ result: { content: "..." } }  // flat content
{ execute: { action: "read-file", file: "..." } }  // generic action field
```

### 3. Import Paths (NodeNext)

**Correct:**
```typescript
import x from '@/services/x.js'  // .js extension required
```

**Wrong:**
```typescript
import x from '@/services/x'     // missing .js
```

## Entry Points for Editing

| Task | Entry Point | Documentation |
|------|-------------|---------------|
| Add storage adapter | `session-store-adapters.js` | [1-low-level/storage.md](1-low-level/storage.md) |
| Add transport type | `transport/` + `transport-manager.js` | [1-low-level/transport.md](1-low-level/transport.md) |
| Modify AI action | `components/ai-actions/` | [2-mid-level/ai-actions.md](2-mid-level/ai-actions.md) |
| Add panel | `panel-manager.js` + `components/` | [2-mid-level/panels.md](2-mid-level/panels.md) |
| Change protocol | `protocol/` (server) | [1-low-level/protocol.md](1-low-level/protocol.md) |
| Add server action | `actions/definitions/` + registry | [3-high-level/task-execution.md](3-high-level/task-execution.md) |

## Critical Files (Read Before Editing)

1. **AGENTS.md** - rules and patterns
2. **simulations/SCHEMA.md** - canonical message format
3. **workflows/4-editing-guide.md** - safe editing patterns
