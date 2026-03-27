# DEV_STATE - a2a-server (2026-03-27)

Current state of the `a2a-server` subsystem.

---

## Current Model

- Stateless server processing (no server-side session persistence)
- Request-driven context (`context` is provided by caller each turn)
- Keyword-based routing (no LLM router transform)
- Single-action protocol shape in `execute` / `result`

---

## Active Runtime Path

```text
Client -> POST /api/v1/invoke -> a2a-server -> (sync execute | async promiseId)
                                      |
                                      +-> transform pipeline
                                      +-> AI Hub proxy (when async LLM work is needed)
```

---

## Current Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Basic liveness |
| GET | `/api/v1/health` | API health from v1 router |
| POST | `/api/v1/invoke` | Main invoke entrypoint |
| GET | `/api/v1/requests/status?ids=...` | Batch promise status |
| GET | `/api/v1/requests/:promiseId/status` | Single promise status |
| GET | `/api/v1/requests/:promiseId/result` | Single promise result |
| POST | `/api/a2a/sessions/:sessionId/next` | Session bridge for client API flow |

---

## Request Processing Components

| Component | Role |
|---|---|
| `request-processor.service` | Selects processor based on action/task context |
| `dialog-request-processor` | Dialog flow with LLM prompts |
| `action-request-processor` | Tool/action flow |
| `form-request-processor` | Form/choice handling |
| `simulation-request-processor` | Simulation/golden flow |

---

## Protocol Contract (Mandatory)

### Execute uses action-key shape

```json
{
  "execute": {
    "read-file": { "path": "README.md" }
  }
}
```

### Result uses action-key shape

```json
{
  "result": {
    "read-file": { "path": "README.md", "content": "..." }
  }
}
```

---

## Context Fields Used Now

- `context.execution`
- `context.history`
- `context.workbench`
- `context.files` (when needed)
- `context.scratchpad` and `context.scratchpad_ops` (when used by flow)

---

## Removed / Deprecated in This Server

- Server-side session storage
- `neurons` subsystem
- LLM-based router transform
- Legacy docs that described Redis/BullMQ queue orchestration
- Legacy docs that described Prisma/PostgreSQL/pgvector persistence as required server runtime

---

## Validation Commands

```bash
# Liveness
curl -s http://localhost:3000/health

# Sync invoke
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" -d "{\"task\":\"hello\",\"sync\":true}"

# Async invoke
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" -d "{\"task\":\"analyze code\"}"
```

---

Updated: 2026-03-27
