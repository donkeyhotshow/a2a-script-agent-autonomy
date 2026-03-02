# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Only

### Imports with Path Aliases

Use `.js` extension for imports with path aliases due to NodeNext module resolution:

```typescript
// Wrong: import x from '@/services/x'
// Correct:
import x from '@/services/x.js'
```

([`tsconfig.json`](a2a-server/tsconfig.json:4-5))

### Testing Requirements

- **ENCRYPTION_KEY** - Must be exactly 32 characters in tests ([`tests/setup.ts`](a2a-server/tests/setup.ts:16))
- **Test database** - Uses `a2a_test`, not `a2a_server` ([`tests/setup.ts`](a2a-server/tests/setup.ts:13))

### Architecture

- **Ports**: HTTP server on 3000, client API on 3001, web UI on 5173
- **Request processor**: Timer-based polling every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **Client workspaces**: Separate npm packages under `a2a-client/packages/`: agent, api-client, fs-utils, rag,
  script-runner, terminal, types
- **Actions**: Support batch processing via context-based state machine

### Environment Variables

- `SKIP_AUTH=1` - Bypass authentication in development
- `ENCRYPTION_KEY` - Must be exactly 32 characters
- `JWT_SECRET` - Minimum 32 characters

---

## A2A Protocol Conventions

> For detailed documentation, see [`new-request-flow/`](new-request-flow/) directory.
> 
> **Important:** Legacy format (`actions[]`, `proposedActions`, `subActions`, `executingAction`, `dslScript`) is deprecated.
> Use `execute.form.choices` for first response and action-key shape for execute/result.
> 
> See:
> - [`new-request-flow/PROTOCOL.md`](new-request-flow/PROTOCOL.md) - Main protocol documentation
> - [`simulations/SCHEMA.md`](simulations/SCHEMA.md) - Simulation schema
> - [`simulations/REFERENCE.md`](simulations/REFERENCE.md) - Action reference
> - [`new-request-flow/SIMULATION-LLM-PROXY.md`](new-request-flow/SIMULATION-LLM-PROXY.md) - Async flow with promiseId

### Action-Key Shape (Critical)

> **⚠️ CRITICAL:** This is the canonical format - all result and execute objects MUST use action-type keys.
> See [`new-request-flow/PROTOCOL.md`](new-request-flow/PROTOCOL.md#action-key-shape-обязательно) for details.

Action results and execute requests **MUST** use action-type keys, not generic `content` or `action` fields.

**Correct:**
```typescript
// Result with action-type key
{ result: { "read-file": { path: "...", content: "..." } } }

// Execute with action-type key
{ execute: { "script": { input: {}, output: "...", code: "..." } } }
```

**Incorrect:**
```typescript
// Wrong: flat content structure
{ result: { content: "..." } }

// Wrong: generic action field
{ execute: { action: "read-file", file: "..." } }
```

### Action Types

The system distinguishes between two types of actions:

| Type | Description | Control |
|------|-------------|---------|
| **Actions** | Server-driven, hardcoded steps | Server controls execution flow |
| **AI-Actions** | Dynamic steps where LLM chooses next action | LLM decides execution flow |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Simulation directories | `kebab-case` | `user-onboarding`, `data-migration` |
| Step names | `<domain>-<operation>` | `file-read`, `db-query`, `api-call` |
| Form choice IDs | `snake_case` | `confirm_action`, `skip_step` |

### Execute Types

Execute actions are categorized by their target executor:

**UI-Only Types:**
- `form` - Interactive forms with `choices` and/or `input` fields
- `message` - Display-only messages to the user

**Client Types (executed on client):**
- `script` - Execute JavaScript code in sandbox
- `rag-search` - Perform RAG (Retrieval-Augmented Generation) search
- `read-file` - Read file contents
- `write-file` - Write data to file
- `execute-command` - Execute shell commands

### Simulation Pipeline

> See [`simulations/SCHEMA.md`](simulations/SCHEMA.md) for canonical simulation format.

Simulations follow a strict transformation pipeline:

```
request.json
    ↓
server-transforms-request.json  (server preprocessing)
    ↓
request.md  (ready for LLM)
    ↓
[LLM Processing]
    ↓
response.md  (LLM output)
    ↓
server-transforms-response.json  (server postprocessing)
    ↓
response.json
```

### Context Fields (System-Managed)

The following context fields are automatically maintained by the system:

- `context.history` - Array of execution records, tracking all steps taken
- `context.execution` - Current execution state: `{ action, step, progress }`
- `context.docVirtual` - Virtual document state for accumulating content across steps

Do not manually modify these fields unless implementing custom state management.
