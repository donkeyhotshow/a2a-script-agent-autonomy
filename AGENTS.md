# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Table of Contents

1. [Critical Rules (Non-Obvious Only)](#critical-rules-non-obvious-only)
2. [A2A Protocol (Critical)](#a2a-protocol-critical)
3. [Environment Variables](#environment-variables)
4. [System Architecture](#system-architecture)
5. [API Endpoints](#api-endpoints)
6. [Session Storage Format](#session-storage-format)
7. [Debugging Tips](#debugging-tips)
8. [Running Tests](#running-tests)
9. [Common Issues and Solutions](#common-issues-and-solutions)
10. [Architecture decision records (ADRs)](#architecture-decision-records-adrs)
11. [Server interrupt loop](#server-interrupt-loop)
12. [Extending LLM actions](#extending-llm-actions)

---

## Critical Rules (Non-Obvious Only)

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

### Legacy golden simulations
- When you touch legacy snapshots/steps under `simulations/…`, treat `context.docVirtual` as retired: every golden request/response should store documented sections inside `context.workbench.sections` (the server still normalizes `docVirtual`, but our golden files must already match the fresh schema).
- Replace either string or object `docVirtual` values with `"workbench": { "sections": { … } }` and point any transformation paths at `context.workbench.sections`.
- Update `request.md`, prompt JSON, or other generator inputs so they already emit `workbench` instead of `docVirtual`; this keeps the golden fixture consistent even before any runtime normalization.
- Single action per **`response.json`** – Under `simulations/…`, each step’s **`response.json`** `execute` must have exactly **one** protocol action key (`form`, `read-file`, `rag-search`, …). Never batch multiple protocol actions in one server response.
- **`received.json` (Web execute DTO)** – Must **not** repeat raw client-only `execute` keys (`rag-search`, `read-file`, `write-file`, `script`, `execute-command`). Goldens use the shape produced by `buildWebExecute` (`message`, optional `llmMessage`, `attachments`, optional `form`). See [`simulations/SCHEMA.md`](simulations/SCHEMA.md) and [`a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js`](a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js).
- Execute values must match `sim-lint` – only the action types listed in [`a2a-server/scripts/sim-lint.ts`](a2a-server/scripts/sim-lint.ts)'s `VALID_EXECUTE_TYPES` are allowed; drop deprecated entries such as `execute.error-recovery` or any other removed types when normalizing a simulation.
- Result must follow action-key shape – `result` payloads also require exactly one action key so that they follow the same `{ "read-file": {...} }`, `{ "rag-search": {...} }`, etc. pattern. Avoid bare blobs (`result: { "results": … }`, `result: { "content": "…" }`, etc.) in golden responses.
- Router forms need choice metadata – when a step uses `execute.form.choices` for routing, populate each choice with a descriptive `description` and keep the `id` tied to the stable `ROUTER_CHOICES` values (see `simulations/CLIENT-SDK-IDEAL.md`). This makes the router prompts readable and consistent with the server’s dual form/choice expectations.
- Form metadata belongs in title/description – keep any long user-facing explanation in `form.title`/`form.description` instead of stuffing it into individual `input` entries. Use the `input[]` array for field definitions (labels, types, placeholders) only and reserve the descriptive text for the form-level fields.
- Prune `server-response.json` artifacts – normalized simulations should only ship `response.json` + `received.json` (and optional `server-transforms-*.json`). Remove stray `server-response.json` files in step folders when you rewrite the golden fixtures so nothing lingers from the older sync contract.
- Request.json should follow invoke schema – the first step’s `request.json` needs to mirror the real invocation contract described in `SCHEMA.md`, including a `context.execution` object (router/invoke expectations, action/step info) rather than just `{ "task": "…" }`. This keeps the golden starting point consistent with how the backend builds requests.
- Optional **`interrupt.md`** in a numbered step folder — documents [server interrupt loop](a2a-server/docs/SERVER-INTERRUPT-LOOP.md) scenarios only; **not** part of the eight-file sync pipeline; `sim-lint` does not read it. See [`simulations/SCHEMA.md`](simulations/SCHEMA.md#supplementary-server-interrupt-loop-optional).
- Optional **`N-sub-M/`** folders (next to step `N/`, `M` sequential) — same artifacts as steps (`request.*`, `response.*`, transforms); `interruptTrace` in **`response.json`**. Pattern `^\d+-sub-\d+$`. Example: `simulations/auto-ai-v2/6-sub-1/` … `6-sub-4/`.

### Quick grep helpers (when upgrading a sim)
- `rg -n "docVirtual" -g '*.json' simulations` – verify legacy docVirtual references are gone.
- `rg -n '"execute":\\s*\\{[^}]*"(form|script|read-file|rag-search)"' -g '**/response.json' simulations` – confirm **server** `response.json` uses a single canonical action key under `execute`.
- `rg -n '"rag-search"\s*:|"read-file"\s*:|"write-file"\s*:|"execute-command"\s*:|"script"\s*:\s*\{|"list-directory"\s*:|"grep-search"\s*:|"file-exists"\s*:|"edit-patch"\s*:|"run-script"\s*:' -g '**/received.json' simulations` – hits should be **only** under top-level **`result`**, not under **`execute`** (Web DTO allows `result` action-key payloads; `execute` must stay sanitized).
- `rg -n 'result"\\s*:\\s*{\\s*"content"' -g '*.json' simulations` – find bare result blobs that need action-key shaping.
- `rg -n 'server-response\\.json' simulations` – locate stray server-response snapshots to delete.
- `rg -n 'error-recovery' -g '*.json' simulations` – catch deprecated execute types before they slip in.

### Verification
- `npm run sim:lint -- --all --json` (from repo root; forwards to [`a2a-server/package.json`](a2a-server/package.json)) or `cd a2a-server && npm run sim:lint -- --all --json`
- `npm run sim:validate -- --sim <name> --json` (same; replace `<name>` with the simulation you touched) or `cd a2a-server && npm run sim:validate -- --sim <name> --json`
- Markdown fixtures must match transforms – when regenerating `request.md`/`response.md` (or other markdown fixtures), keep their embedded JSON aligned with the actual `request.json`/`response.json` outputs: switch to `context.workbench`, keep the single-action `execute` and action-key shaped `result`, and sort/object-serialize fields so the examples stay deterministic after running transforms.

---

## A2A Protocol (Critical)

### Overview

The A2A (Agent-to-Agent) protocol defines how the client, server, and AI components communicate. The protocol uses a request-response pattern with support for both synchronous and asynchronous operations.

### Action-Key Shape (Mandatory)

All result and execute objects MUST use action-type keys:

```typescript
// ✅ Correct:
{ result: { "read-file": { path: "...", content: "..." } } }
{ execute: { "script": { input: {}, output: "...", code: "..." } } }

// ❌ Incorrect:
{ result: { content: "..." } }
{ execute: { action: "read-file", file: "..." } }
```

### AI-Action Transform Pattern

LLM controls `context.execution.step`, server persists via transforms. Prompt format:

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": { "<one_action>": { ...params } },
  "completed": false
}
```

### Request Flow Types (Critical)

#### Sync Flow (For Testing/Simulations)

- **When:** Simple operations, form interactions, choice selections
- **Response:** Immediate `execute` object with form/input data
- **Use Case:** UI interactions, simple actions, automated testing
- **Example:**
  - `task: "dialog"` → `execute.form.input` (прямой диалог)
  - `task: "analyze code"` → `execute.form.choices` (роутер)
- **Enable:** Set `DEFAULT_SYNC_MODE=1` in environment

#### Async Flow (PromiseId - Default)

- **When:** Complex AI processing, LLM calls, long-running operations
- **Response:** `promiseId` for polling status/result
- **Use Case:** AI generation, complex analysis, external API calls
- **Example:** LLM dialog processing → `promiseId` → poll for completion

#### Flow Detection

- **Client Request:** Include `sync: true` for sync responses
- **Server Response:** `sync: true` + `execute` = sync, `promiseId` = async

### Context Fields (System-Managed - Do Not Modify Manually)

- `context.history` - Array of execution records
- `context.execution` - Current state: `{ action, step, progress }`
- `context.workbench` - Structured working state (`sections`, optional `batch`, optional `slots`). LLM can update **`workbench.sections`** (merge) and **`workbench_ops`** (short set/append/remove commands); see [`a2a-server/prompts/auto-ai-request.md`](a2a-server/prompts/auto-ai-request.md) and [`a2a-server/docs/LLM-REQUEST-PREP.md`](a2a-server/docs/LLM-REQUEST-PREP.md) §2c.
- `context.session_id` - Session identifier for tracking

### Simulation Pipeline

```
request.json → server-transforms → request.md → [LLM] → response.md → server-transforms → response.json
```

**Server-side LLM request prep** (before `request.md` is built): `result` is folded into `context.history`; `flowControlHint` is chosen from `context.execution.action` + `step`; `workbench` is normalized (see LLM-REQUEST-PREP). **After** the model turn, response transforms may merge **`workbench.sections`** and apply **`workbench_ops`** into `context.workbench`. See [`a2a-server/docs/LLM-REQUEST-PREP.md`](a2a-server/docs/LLM-REQUEST-PREP.md).

### Dialog mode and repository tools

[`a2a-server/prompts/dialog-request.md`](a2a-server/prompts/dialog-request.md) — default is chat (`message` + `form`); the model may emit **one** tool key per turn (`rag-search`, `read-file`, `write-file`, etc.) when the user needs codebase facts. Response pipeline: [`dialog-llm-response.json`](a2a-server/prompts/transforms/dialog-llm-response.json). The processor passes tool `execute` payloads through to the client (not folded into `message`+`form`).

### Server interrupt loop

After the response transform, if transform output includes **`interrupt`**, the dialog processor may run **extra** LLM work (compress history, `thinking` slot, another full request→LLM→response cycle) before responding. The client only receives the **final** `execute` / context. Full spec: [`a2a-server/docs/SERVER-INTERRUPT-LOOP.md`](a2a-server/docs/SERVER-INTERRUPT-LOOP.md). ADR: [`docs/adr/ADR-0029-server-interrupt-loop.md`](docs/adr/ADR-0029-server-interrupt-loop.md). Example sim notes: [`simulations/auto-ai-v2/6/interrupt.md`](simulations/auto-ai-v2/6/interrupt.md).

### Extending LLM actions

Playbook for new tools, RAG variants, transforms, simulations, and when to write an ADR: [`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](a2a-server/docs/EXTENDING-LLM-ACTIONS.md).

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | A2A Server port (default: 3000) | No |
| `SKIP_AUTH` | Bypass authentication in development | No |
| `ENCRYPTION_KEY` | Must be exactly 32 characters | Yes |
| `JWT_SECRET` | Minimum 32 characters | Yes |
| `CLIENT_API_URL` | Client API endpoint | No |
| `DEFAULT_SYNC_MODE` | Enable sync mode (set to 1) | No |
| `A2A_SERVER_URL` | A2A Server URL (default: http://localhost:3000) | No |
| `A2A_MAX_INTERRUPT_TURNS` | Server interrupt loop budget per invoke (default: 10) | No |
| `A2A_COMPRESS_HISTORY_MIN_ENTRIES` | If `> 0`, skip `compress_history` sidecar when history length ≤ this (default: 0 = only skip empty) | No |

### Default Ports

| Service | Port | Description |
|---------|------|-------------|
| A2A Server | 3000 | Main backend server |
| Client API | 3001 | Client API endpoint |
| Web UI | 5173 | Vite dev server |
| Ollama | 11434 | LLM API |
| AI Hub | 11435 | AI proxy service |

---

## System Architecture

Cross-cutting decisions (LLM request prep, documentation canonical map, Client API deployment modes, etc.): [`docs/adr/README.md`](docs/adr/README.md).

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web UI (5173)                           │
│   a2a-client/web - User interface with session management       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client API / Vite Plugin                     │
│   a2a-client - Serves API, manages sessions, stores data        │
│   - vite-plugin-a2a.js - Handles /api/a2a/* endpoints          │
│   - packages/sdk also implements Client API (see a2a-client/docs/CLIENT_API_WEB_SDK.md) │
│   - session-store.js - Client-side session management           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       A2A Server (3000)                         │
│   a2a-server - Processes requests, executes actions            │
│   - /api/v1/invoke - Main invoke endpoint                     │
│   - /api/v1/requests/* - Request management                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI Hub Proxy (11435)                        │
│   ai-integration - Routes to LLM providers                     │
│   - promise_routes.py - Async promise handling                 │
│   - ollama_manager.py - Ollama lifecycle management            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ollama (11434)                             │
│   Local LLM service (qwen3:8b, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** - Web UI sends request to Client API
2. **Session Creation** - Client API creates/updates session in storage
3. **Server Request** - Client API forwards to A2A Server
4. **AI Processing** - A2A Server calls AI Hub proxy
5. **LLM Processing** - AI Hub calls Ollama for LLM response
6. **Response** - Data flows back through the chain to UI

---

## API Endpoints

### Client API (Vite Plugin) - Port 5173

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/a2a/projects` | List all projects |
| GET | `/api/a2a/sessions` | List all sessions |
| POST | `/api/a2a/sessions` | Create new session |
| GET | `/api/a2a/sessions/{id}` | Get session by ID |
| PUT | `/api/a2a/sessions/{id}` | Update session |
| POST | `/api/a2a/sessions/{id}/next` | Send next message |
| POST | `/api/a2a/sessions/{id}/steps` | Save step data |
| GET | `/api/a2a/sessions/{id}/async` | Poll in-flight async work for session (no `promiseId` in URL — preferred for web UI) |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Poll promise status (legacy / tooling) |

**Contract:** `POST .../next` returns an **ack only** (`success`, `accepted`, `step`, `asyncPending`, optional legacy `promiseId`). Load UI state with **`GET .../sessions/{id}`** and, while async, poll **`GET .../async`** (web UI) or **`GET .../promise/{promiseId}`** (legacy). See [`a2a-client/docs/WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md). **`@a2a/sdk` Express** may not expose `/async` yet—use promise URL or align the SDK. **`a2a-server`** also exposes `POST /api/a2a/sessions/:id/next` for a different flow—not the file-backed Client API above.

### A2A Server - Port 3000

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/invoke` | Invoke a request |
| GET | `/api/v1/requests/{id}` | Get request status |
| GET | `/api/v1/requests/{id}/result` | Get request result |
| POST | `/api/v1/requests/{id}/subscribe` | Subscribe to updates |

### Common Endpoint Mistakes

**❌ Wrong:**
```bash
curl -X POST http://localhost:3000/invoke -d '{"task":"test"}'
# Returns: 404 Not Found
```

**✅ Correct:**
```bash
curl -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" -d '{"task":"test"}'
# Returns: {"success":true,"data":{"promiseId":"..."}}
```

---

## Session Storage Format

### File Structure

`
a2a-client/storage/sessions/{sessionId}/
├── {stepNumber}/
│   ├── client-result.json      # User input or choice captured before step
│   ├── request-to-server.json  # Payload that was sent to /api/v1/invoke
│   ├── server-response.json    # Completed execute/context/result for the step
│   ├── server-promise.json     # Optional: pending promise metadata
│   └── server-response.json    # Completed execute/context/result for the step (includes assistant messages)
└── ...
`

We no longer rely on a root session.json; all metadata (current step, last execute, messages, status) is derived from the highest-numbered step that already has a server-response.json. This keeps the filesystem focused on actionable step artifacts, which already contain every request/response needed to rebuild the dialogue.

### Step File Roles

| File | Description |
|------|-------------|
| client-result.json | Stores the user input (typed message or choice) recorded for that step. |
| 
equest-to-server.json | Mirrors the request that was forwarded to the A2A Server (context, 
esult, etc.). |
| server-response.json | Finalized execute/context bundle from A2A Server once the step completes. The client uses this file to reconstruct xecute + context. |
| server-promise.json | Temporary state for async responses (promiseId, status, submittedAt). The following step waits for completion before writing its server-response.json. |
| messages.json | Step-scoped slice of the conversation; the client merges these slices when showing the full history. |

The highest-numbered step folder with server-response.json anchors the session state. When the server returns a promiseId, the client stores server-promise.json in the upcoming step directory (e.g., step N+1) until polling reports completed, at which point the same folder receives server-response.json and messages.json.

### Rebuilding the Session

To answer questions like “what is the current step?” or “what execute/context should be shown?”, the Client API:

1. Reads the step directories in order and finds the largest stepNumber that already has server-response.json.
2. Uses the contents of that server-response.json to populate xecute, context, and status.
3. Concatenates messages.json from step 1 through the current step to rebuild the full conversation.

This approach ensures that even if session.json is missing or stale, the step folders are sufficient for full dialogue recovery.

---
---

## Debugging Tips

### 1. Check A2A Server is running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-03-12T10:00:00.000Z","version":"1.0.0"}
```

### 2. Test invoke endpoint

```bash
curl -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{"task":"test"}'
```

Expected response:
```json
{"success":true,"data":{"promiseId":"prom_..."}}
```

### 3. Check session storage

```bash
ls -la a2a-client/storage/sessions/
```

### 4. View web UI logs

```bash
tail -f a2a-client/logs/web-ui.log
```

### 5. Check AI Hub status

```bash
curl http://localhost:11435/health
```

### 6. Check Ollama availability

```bash
curl http://localhost:11434/api/tags
```

### 7. Debug promise status

```bash
curl http://localhost:3000/api/v1/requests/{promiseId}/result
```

### 8. LLM Timeout Workflow (2 minutes)

LLM requests can take 2+ minutes to complete. When debugging promise status:

1. **Check if promise is pending** - Status will be `"processing"` or `"pending"`
2. **Wait up to 2 minutes** - Do NOT assume it's hung
3. **Poll again** - Use a 2-minute timeout before checking again

```bash
# Example workflow:
# 1. Send request - get promiseId
curl -X POST http://localhost:3000/api/v1/invoke -d '{"task":"analyze"}'
# Returns: {"success":true,"data":{"promiseId":"prom_123..."}}

# 2. Check immediately - likely still processing
curl http://localhost:3000/api/v1/requests/prom_123.../result
# Returns: {"success":true,"data":{"status":"processing",...}}

# 3. Wait 2 minutes, then check again
# (use terminal sleep or do other work)
sleep 120
curl http://localhost:3000/api/v1/requests/prom_123.../result
# Returns: {"success":true,"data":{"status":"completed","result":{...}}}
```

**Important**: The client automatically polls with a timeout, so this is mainly for manual debugging.

---

## Loader Behavior (Critical)

### Overview

Loader (spinner/loading indicator) is mandatory UI element that shows when the system is processing a request. It is controlled by two levels:

1. **Client (JS)** - Shows loader immediately after user action
2. **Server (Client API)** - Controls when to hide loader after receiving response

> **Key Principle**: Minimal logic on frontend. Server tells client when to hide loader.

### Dialog Steps

#### Step 1: New Session Panel

- User enters session type and presses Enter
- **Client** immediately shows loader (replaces input field)
- **Minimum display time**: 5000ms (always enforced)
- If server returns `execute` (not `promiseId`) → hide loader after min time
- If server returns `promiseId` → keep showing until resolved

#### Step 2: Choice Form (Routing)

- User selects option from choices
- **Client** immediately shows loader with selected option
- **Minimum display time**: 5000ms
- Hide after server response + min time elapsed

#### Step 3: Message Sending (LLM Processing)

- User sends message, goes to LLM (long-running)
- **Client** immediately shows loader (mandatory)
- If `promiseId` returned → show loader until promise resolves
- **Page Reload**: If promise still pending, show loader on page load until resolved

### API Response Format

```typescript
interface ServerResponse {
    execute?: Execute;
    context?: Context;
    promiseId?: string;
    
    // Loader control
    loader?: {
        show: boolean;
        message?: string;
        minTime?: number;  // default: 5000ms
    };
}
```

### Key Files

| File | Purpose |
|------|---------|
| `a2a-client/docs/LOADER-BEHAVIOR.md` | Full loader behavior specification |
| `a2a-client/web/js/task-flow/core.js` | UI coordination, loader logic in run/sendChoice/sendMessageResult |
| `a2a-client/web/js/session-store.js` | State management, loader flags |
| `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` | Server API, loader control fields |

---

## Running Tests

### Single test file
```bash
npx vitest run tests/unit/auth.controller.test.ts
```

### Single test by name
```bash
npx vitest run -t "test name"
```

### All simulations
```bash
npm run test:sim:all
```

### Using curl for integration testing

```bash
# Create session
SESSION=$(curl -s -X POST http://localhost:5173/api/a2a/sessions | jq -r '.id')
echo "Session: $SESSION"

# Get session
curl http://localhost:5173/api/a2a/sessions/$SESSION

# Send message
curl -X POST http://localhost:5173/api/a2a/sessions/$SESSION/next \
  -H "Content-Type: application/json" \
  -d '{"task":"hello"}'
```

---

## Common Issues and Solutions

### Issue: 404 on /invoke

**Problem:** Calling `/invoke` returns 404.

**Solution:** Use `/api/v1/invoke` instead.

```bash
# ❌ Wrong
curl -X POST http://localhost:3000/invoke -d '{}'

# ✅ Correct
curl -X POST http://localhost:3000/api/v1/invoke -d '{}'
```

### Issue: 400 Bad Request on /steps

**Problem:** Saving step returns 400 error.

**Solution:** Check that step data includes valid `execute`, `messages`, and `context` fields. Also verify the client isn't double-saving steps (server should manage steps).

### Issue: 401 Unauthorized

**Problem:** API returns 401 Unauthorized.

**Solution:** 
- Check JWT_SECRET is set (minimum 32 characters)
- For development, set `SKIP_AUTH=1`

### Issue: Promise stays in "pending"

**Problem:** Async request never completes.

**Solution:**
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Check AI Hub proxy: `curl http://localhost:11435/health`
3. Manually execute promise: `POST /promise/{promiseId}/execute`

### Issue: Session not found

**Problem:** GET /sessions/{id} returns 404.

**Solution:** 
- Verify session ID format: `sess_{timestamp}_{random}`
- Check storage directory exists: `ls a2a-client/storage/sessions/`

### Issue: LLM not responding

**Problem:** Dialog mode doesn't get LLM response.

**Solution:**
1. Check Ollama has models: `curl http://localhost:11434/api/tags`
2. Check model is loaded: `qwen3:8b` or similar
3. Check AI Hub logs: `tail -f ai-integration/logs/ai.log`

### Issue: Messages not showing in UI

**Problem:** Session has messages but UI doesn't display them.

**Solution:**
1. Verify messages are stored in step folders - check `{stepNum}/messages.json` files exist
2. Check each message has `role`, `content`, `step` fields
3. The client API merges messages from all step folders when loading the session
3. Verify API returns messages in `/sessions/{id}` response

---

## Architecture decision records (ADRs)

Indexed in [`docs/adr/README.md`](docs/adr/README.md). Recent examples: **ADR-0026** (server LLM request prep: `result` → `history`, `flowControlHint`), **ADR-0027** (canonical docs map), **ADR-0028** (Vite `/api/a2a` vs standalone SDK Client API), **ADR-0029** (server interrupt loop after response transform).

---

## Key Files Reference

### Client Side

| File | Purpose |
|------|---------|
| [`a2a-client/vite-plugin-a2a.js`](a2a-client/vite-plugin-a2a.js) | Main API handler, session management |
| [`a2a-client/web/js/session-store.js`](a2a-client/web/js/session-store.js) | Client-side session storage |
| [`a2a-client/web/js/api-integration.js`](a2a-client/web/js/api-integration.js) | API client utilities |
| [`a2a-client/web/js/app/app-task.js`](a2a-client/web/js/app/app-task.js) | Main app initialization |

### Server Side

| File | Purpose |
|------|---------|
| [`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](a2a-server/docs/EXTENDING-LLM-ACTIONS.md) | How to add or evolve LLM actions, tools, RAG modes, goldens |
| [`a2a-server/src/app.ts`](a2a-server/src/app.ts) | Express app setup, routes |
| [`a2a-server/src/services/invoke.service.ts`](a2a-server/src/services/invoke.service.ts) | Request invocation logic |
| [`a2a-server/src/routes/sessions.ts`](a2a-server/src/routes/sessions.ts) | Session management routes |

### AI Integration

| File | Purpose |
|------|---------|
| [`ai-integration/proxy/promise_routes.py`](ai-integration/proxy/promise_routes.py) | Promise handling, Ollama calls |
| [`ai-integration/proxy/ollama_manager.py`](ai-integration/proxy/ollama_manager.py) | Ollama lifecycle management |

---

## Quick Reference

### Starting the system

```bash
# Start all services
./start-all.bat

# Or manually:
cd a2a-server && npm start  # Port 3000
cd a2a-client && npx vite   # Port 5173
python -m ai-integration    # Port 11435
```

### Environment for development

```bash
SKIP_AUTH=1
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=12345678901234567890123456789012
DEFAULT_SYNC_MODE=1
```

### API Base URLs

- **A2A Server:** http://localhost:3000
- **Client API:** http://localhost:5173/api/a2a
- **AI Hub:** http://localhost:11435
- **Ollama:** http://localhost:11434
