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

### AI-Action Transform Pattern (Canonical)

> **Important:** For all AI-actions (LLM-driven flows), use the canonical pattern from `auto-ai`.

**Core principle:** The LLM controls `context.execution.step` and the server just persists it via transforms.

#### Prompt Format

All AI-action prompts must require the LLM to respond with:

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": {
    "<one_action>": { ...params }
  },
  "completed": false
}
```

- `step` — semantic phase name (e.g., `plan`, `clarify`, `research`, `execute`, `completed`)
- `execute` — **action-key shape** with exactly ONE key
- `completed` — `true` only when task is fully done

#### Transform Templates

Reusable templates are in [`templates/ai-action-transforms/`](templates/ai-action-transforms/):

- `server-transforms-request.json` — copy, append-to-history, render-markdown
- `server-transforms-response.json` — parse JSON, update step, append history, set execute

#### Examples

| Simulation | Prompt | Status |
|------------|--------|--------|
| `auto-ai` | `a2a-server/prompts/auto-ai-request.md` | ✅ Canonical |
| `coder-smart` | `a2a-server/prompts/coder-request.md` | ✅ Updated to canonical |
| `analyze` | `a2a-server/prompts/analyze-request.md` | ✅ Updated to canonical |

See [`plans/ai-action-transform-template.md`](plans/ai-action-transform-template.md) for detailed migration guide.

### Testing Requirements

- **ENCRYPTION_KEY** - Must be exactly 32 characters in tests ([`tests/setup.ts`](a2a-server/tests/setup.ts:16))
- **Test database** - Uses `a2a_test`, not `a2a_server` ([`tests/setup.ts`](a2a-server/tests/setup.ts:13))

### Testing

> For detailed documentation, see [`a2a-server/docs/TESTING-MOCKING-GUIDE.md`](a2a-server/docs/TESTING-MOCKING-GUIDE.md).

#### Test Types

| Type | Location | Speed | Description |
|------|----------|-------|-------------|
| **Unit** | [`tests/unit/`](a2a-server/tests/unit/) | ⚡ Fast | Testing individual functions and services |
| **Integration** | [`tests/integration/`](a2a-server/tests/integration/) | 🟡 Medium | Testing component interactions |
| **E2E** | [`tests/e2e/`](a2a-server/tests/e2e/) | 🔴 Slow | Full end-to-end scenarios |
| **Simulation** | [`tests/simulation/`](a2a-server/tests/simulation/) | ⚡ Fast | Golden standard testing via simulations |

#### Mock Utilities

The project provides comprehensive mocking utilities:

- **LLM Mocks** ([`tests/mocks/llm/`](a2a-server/tests/mocks/llm/)) - Mock LLM responses with preset or replay mode
- **HTTP Mocks** ([`tests/mocks/http/`](a2a-server/tests/mocks/http/)) - Mock fetch with wildcard URL support
- **Filesystem Mocks** ([`tests/mocks/filesystem/`](a2a-server/tests/mocks/filesystem/)) - In-memory filesystem for testing
- **Mock Server** ([`tests/helpers/mock-server.ts`](a2a-server/tests/helpers/mock-server.ts)) - Express server for API testing
- **Mock Client** ([`tests/helpers/mock-client.ts`](a2a-server/tests/helpers/mock-client.ts)) - A2A client SDK mock

#### Environment Variables for Tests

| Variable | Description | Example |
|----------|-------------|---------|
| `SKIP_AUTH=1` | Skip authentication | `SKIP_AUTH=1 npm test` |
| `TEST_LLM_PROVIDER=mock` | Use mock LLM | `TEST_LLM_PROVIDER=mock npm test` |
| `RECORD_HTTP=1` | Record HTTP responses | `RECORD_HTTP=1 npm run test:integration` |
| `LLM_REPLAY_DIR` | Replay directory | `LLM_REPLAY_DIR=./tests/fixtures/llm` |

#### Running Tests

```bash
# Unit tests with mocks (default)
npm run test

# Integration tests (requires DB)
SKIP_AUTH=1 npm run test:integration

# Simulation tests
npm run test:sim
npm run test:sim:all

# Update snapshots
npm test -- --update
```

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

### DEV_STATE File Hierarchy

> **Important:** As the project grows, keep DEV_STATE files organized to avoid duplication and maintain clarity.

#### Hierarchy Rules

| Scenario | Action |
|----------|--------|
| Root `DEV_STATE.md` becomes too large | Create component-specific `DEV_STATE.md` in subfolders |
| Subfolder already has `DEV_STATE.md` | Continue maintaining it, avoid duplicates |
| New component section is added | Create corresponding subfile |

#### File Structure

```
DEV_STATE.md                    # Root - contains links to subfiles
├── a2a-client/DEV_STATE.md     # Full documentation for client component
├── a2a-server/DEV_STATE.md     # Full documentation for server component
└── ai-integration/DEV_STATE.md # Full documentation for AI integration
```

#### Guidelines

1. **Root `DEV_STATE.md`** - Contains only:
   - Table of contents with links to subfiles
   - High-level overview of project state
   - References to component-specific files

2. **Subfiles** (`a2a-client/DEV_STATE.md`, etc.) - Contain:
   - Full documentation for that specific component
   - Detailed status, logs, and notes
   - No duplicate content from root file

3. **Avoid Duplicates**:
   - Don't repeat the same information in root and subfiles
   - Root file should only reference, not duplicate content
   - Each subfile should be self-contained for its component

4. **Maintenance**:
   - Update the relevant subfile when working on a component
   - Keep root file in sync with existing subfiles
   - Delete empty/unused DEV_STATE files

---

## A2A Protocol Conventions

> For detailed documentation, see [`docs/new-request-flow/`](docs/new-request-flow/) directory.
> 
> **Important:** Legacy format (`actions[]`, `proposedActions`, `subActions`, `executingAction`, `dslScript`) is deprecated.
> Use `execute.form.choices` for first response and action-key shape for execute/result.
> 
> See:
> - [`docs/new-request-flow/PROTOCOL.md`](docs/new-request-flow/PROTOCOL.md) - Main protocol documentation
> - [`simulations/SCHEMA.md`](simulations/SCHEMA.md) - Simulation schema
> - [`simulations/REFERENCE.md`](simulations/REFERENCE.md) - Action reference
> - [`docs/new-request-flow/SIMULATION-LLM-PROXY.md`](docs/new-request-flow/SIMULATION-LLM-PROXY.md) - Async flow with promiseId

### Action-Key Shape (Critical)

> **⚠️ CRITICAL:** This is the canonical format - all result and execute objects MUST use action-type keys.
> See [`docs/new-request-flow/PROTOCOL.md`](docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно) for details.

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
