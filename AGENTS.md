# AGENTS.md

Guidance for agents working in this repository.

## Quick Reference

| Topic | Reference |
|-------|-----------|
| Imports | `.js` suffix with NodeNext resolution |
| Test ENCRYPTION_KEY | Exactly 32 characters |
| Test DB | `a2a_test` (not `a2a_server`) |
| Action-Key Shape | ONE action per execute/result |
| DEV_STATE | Always update before/after tasks |

---

## Critical Rules

### 1. Imports with Path Aliases
Use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution)

### 2. Testing
- ENCRYPTION_KEY: exactly 32 characters
- Database: `a2a_test`

### 3. Action-Key Shape (MANDATORY)
```json
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { ... } } }
```
NOT: `{ "execute": { "action": "...", ... } }` or `{ "result": { "content": "..." } }`

### 4. Golden Simulations
- Single action per `response.json` execute
- `received.json`: client-sanitized (no `rag-search`, `read-file` in execute; only result)
- Workbench in `context.workbench.sections`
- No deprecated execute types (`execute.error-recovery`)
- Router choices need descriptive `description` + stable `id`
- Form metadata: title/description (not input array)

---

## A2A Protocol

### Overview
Request-response pattern with sync (immediate `execute`) and async (polling `promiseId`) flows.

### Action-Key Shape (Mandatory)
All `execute` and `result` objects use single action-type key:
```json
{ "execute": { "script": {...} } }
{ "result": { "read-file": {...} } }
```

### AI-Action Transform
LLM controls `context.execution.step` → server persists via transforms.

### Request Flows

| Flow | When | Response | Example |
|------|------|----------|---------|
| Sync | Simple ops, form interactions | Immediate `execute` | `task: "dialog"` → `execute.form` |
| Async | LLM processing, long-running | `promiseId` for polling | LLM calls → `promiseId` → poll |

Enable sync with `DEFAULT_SYNC_MODE=1` or request `sync: true`.

### Context Fields (System-Managed)
- `context.history` — execution records
- `context.execution` — current state (action, step, progress)
- `context.workbench` — structured state (`sections`, optional `batch`, optional `slots`)
- `context.session_id` — session identifier

### Simulation Pipeline
```
request.json → server-transforms-request.json → request.md → [LLM] → response.md → server-transforms-response.json → response.json
```
Note: Server always applies transforms; `response.md` optional (no LLM).

---

## Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| PORT | 3000 (default) | No |
| SKIP_AUTH | 1 (dev) | No |
| ENCRYPTION_KEY | 32 chars | Yes |
| JWT_SECRET | 32+ chars | Yes |
| DEFAULT_SYNC_MODE | 1 | No |

---

## System Architecture

```
Web UI (5173) → Client API (5173/api/a2a) → A2A Server (3000) → AI Hub (11434)
      ↓ Session Storage ↓                           → Ollama (11435)
```

### Ports
| Port | Service | Role |
|------|---------|------|
| 11435 | Ollama | LLM |
| 11434 | AI Integration | Proxy |
| 3000 | a2a-server | API (stateless) |
| 5173 | Vite | Web UI + Client API |

---

## API Endpoints

### Client API (Vite Plugin) - Port 5173
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/a2a/projects` | List projects |
| GET | `/api/a2a/sessions` | List sessions |
| POST | `/api/a2a/sessions` | Create session |
| GET | `/api/a2a/sessions/{id}` | Get session |
| PUT | `/api/a2a/sessions/{id}` | Update session |
| POST | `/api/a2a/sessions/{id}/next` | Send message (ack only) |
| GET | `/api/a2a/sessions/{id}/async` | Poll async (preferred) |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Poll promise (legacy) |

### A2A Server - Port 3000
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/invoke` | Invoke request |
| GET | `/api/v1/requests/{id}` | Get status |
| GET | `/api/v1/requests/{id}/result` | Get result |

---

## Session Storage Format

```
a2a-client/storage/sessions/{sessionId}/
├── {stepNum}/
│   ├── client-result.json       (user input/choice)
│   ├── request-to-server.json   (payload sent)
│   ├── server-response.json     (execute/context/result)
│   ├── server-promise.json      (optional, async pending)
│   └── messages.json            (conversation slice)
```

**Rebuild from highest step with server-response.json.**

---

## Debugging

```bash
# Health checks
curl http://localhost:3000/health              # A2A Server
curl http://localhost:11434/health             # AI Integration
curl http://localhost:11435/api/tags           # Ollama
curl http://localhost:5173/api/a2a/projects    # Client API

# Test async (2-minute timeout typical)
curl http://localhost:3000/api/v1/requests/{promiseId}/result
# Check status, wait, retry if "processing"
```

---

## Testing

```bash
# Simulations
npm run sim:lint -- --all --json
npm run sim:validate -- --all --json

# Unit tests
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| 404 on `/invoke` | Use `/api/v1/invoke` |
| 400 on `/steps` | Check execute/messages/context fields |
| 401 Unauthorized | Set JWT_SECRET (32+ chars); use SKIP_AUTH=1 (dev) |
| Promise stays "pending" | Check Ollama, AI Hub, LLM response time (2 min) |
| Session not found | Verify ID format `sess_{timestamp}_{random}` |
| LLM not responding | Check Ollama models: `curl http://localhost:11435/api/tags` |

---

## Architecture Decisions (ADRs)

See [docs/adr/README.md](docs/adr/README.md) for full index:
- **ADR-0026** — Server LLM request prep (result → history)
- **ADR-0027** — Canonical docs map
- **ADR-0028** — Vite `/api/a2a` vs SDK Client API
- **ADR-0029** — Server interrupt loop (gray room)

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Action-Key Shape** | Single action type per execute/result object |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Promise** | Async request ID for polling long-running work |
| **Gray Room** | Server-side interrupt loop after response transform |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync Mode** | Immediate execute response (no promiseId) |
| **Web DTO** | Client-sanitized execute (only form, not tool calls) |

---

## DEV_STATE Protocol

**Always update:**
- Before starting a task
- After completing a task
- On any risk/status change

**Rules:**
- Root: cross-module facts only
- Each module: own implementation details
- No abstract statements; all tasks testable
- Remove completed; no dead roadmap items
- Tasks >14 days old → backlog with blocker reason

See [DEV_STATE.md](DEV_STATE.md) and [docs/DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md).

---

## Operational Protocol

### Phases (Simple to Complex)
1. **Environment** — Ports, Ollama, env vars
2. **Component Validation** — Unit tests, linting
3. **Integration (Simulations)** — sim:lint, sim:validate
4. **End-to-End** — Full system startup
5. **Production Readiness** — Logging, error handling, final tests

### Before Each Phase
Confirm previous phase passed and is stable.

### Mandatory Checklist
1. Action-Key Shape used? (JSON must have ONE action type)
2. DEV_STATE updated?
3. Current action "simple" or skipping phases?
4. Imports follow `.js` rule (NodeNext)?

---

## References

| Document | Purpose |
|----------|---------|
| [DEV_STATE.md](DEV_STATE.md) | Current system state |
| [GLOSSARY.md](GLOSSARY.md) | Terminology |
| [docs/DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md) | Doc standards |
| [simulations/SCHEMA.md](simulations/SCHEMA.md) | Simulation contract |
| [docs/ENV-MATRIX.md](docs/ENV-MATRIX.md) | Environment matrix |
| Module state files | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md), [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md), [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) |
