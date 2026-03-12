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
- `context.docVirtual` - Virtual document state for accumulating content
- `context.session_id` - Session identifier for tracking

### Simulation Pipeline

```
request.json → server-transforms → request.md → [LLM] → response.md → server-transforms → response.json
```

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
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Poll promise status |

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

```
a2a-client/storage/sessions/{sessionId}/
├── session.json                    # Session metadata + messages
├── 1/
│   ├── client-result.json          # User input (result from client)
│   ├── request-to-server.json     # Request sent to A2A server
│   ├── server-response.json        # Response from A2A server
│   └── server-promise.json         # Async promise (if any)
├── 2/
│   ├── client-result.json
│   ├── request-to-server.json
│   ├── server-response.json
│   └── server-promise.json
└── ...
```

### session.json Fields

```json
{
  "id": "sess_1234567890123",
  "currentStep": 2,
  "createdAt": "2026-03-12T10:00:00.000Z",
  "updatedAt": "2026-03-12T10:05:00.000Z",
  "messages": [
    {
      "role": "assistant",
      "content": "What would you like me to do?",
      "step": 1
    },
    {
      "role": "user",
      "content": "напиши hello world на javascript",
      "step": 2
    },
    {
      "role": "assistant",
      "content": "Ось приклад коду:",
      "step": 2
    }
  ],
  "execute": {
    "message": "What would you like me to do?",
    "form": {
      "type": "input",
      "name": "task",
      "label": "What would you like me to do?"
    }
  },
  "context": {
    "execution": {
      "action": "task",
      "step": "new"
    },
    "session_id": "sess_1234567890123"
  }
}
```

### Message Structure

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | "user" or "assistant" |
| `content` | string | Message text |
| `step` | number | Session step number |

### Step Files

#### client-result.json
```json
{
  "step": 2,
  "result": {
    "message": "напиши hello world на javascript"
  }
}
```

#### request-to-server.json
```json
{
  "task": "напиши hello world на javascript",
  "context": {
    "execution": {
      "action": "dialog",
      "step": "dialog"
    },
    "session_id": "sess_1234567890123",
    "history": [...]
  }
}
```

#### server-response.json
```json
{
  "id": "req_1234567890123_abc",
  "promiseId": "prom_1234567890123_xyz",
  "status": "completed",
  "result": {
    "outcome": "success",
    "message": "Ось приклад коду:",
    "execute": {
      "message": "Ось приклад коду:",
      "script": {
        "code": "console.log('Hello, World!');"
      }
    }
  }
}
```

#### server-promise.json (for async operations)
```json
{
  "promiseId": "prom_1234567890123_xyz",
  "status": "pending",
  "submittedAt": "2026-03-12T10:00:00.000Z"
}
```

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
1. Verify `messages` array exists in session.json
2. Check each message has `role`, `content`, `step` fields
3. Verify API returns messages in `/sessions/{id}` response

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
