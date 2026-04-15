# A2A Script Agent — System Design (paperdraw.dev)

## Nodes

### Clients
- **User** (external)
- **Web UI** — Vite dev server, port 5173

### Services
- **Client API** — Node.js, port 3001; owns session state, step storage
- **A2A Server** — Node.js, port 3000; stateless request processor
- **AI Hub Proxy** — Python (FastAPI), port 11434 → upstream 11435; async promise queue

### Storage
- **PostgreSQL** — port 5432; session artifacts, request log
- **Redis** — port 6379; cache, promise queue state
- **File Storage** — `sessions/<id>/steps/`; step artifacts on disk

### External
- **Local LLM** — port 11435 (Ollama or compatible)

---

## Connections

| From | To | Protocol | Label |
|------|----|----------|-------|
| User | Web UI | HTTP | browser |
| Web UI | Client API | HTTP `/api/a2a/*` | session ops |
| Client API | A2A Server | HTTP `/api/v1/*` | invoke / next |
| A2A Server | AI Hub Proxy | HTTP POST | LLM request |
| AI Hub Proxy | Local LLM | HTTP | model call |
| AI Hub Proxy | Redis | TCP | promise queue |
| A2A Server | PostgreSQL | TCP | read/write artifacts |
| A2A Server | Redis | TCP | cache |
| Client API | File Storage | FS | step artifacts |

---

## Async Flow (promise queue)

```
Client API
  POST /api/a2a/sessions/:id/next
    → A2A Server POST /api/v1/invoke
        → AI Hub Proxy  (returns promiseId immediately)
            → Redis queue
                → Worker drains → Local LLM
                    → result stored in Redis
    ← A2A Server returns { promiseId }
  GET /api/a2a/sessions/:id/async  (poll)
    → A2A Server GET /api/v1/requests/:promiseId/status
        → Redis lookup
    ← { status: "pending" | "completed", result? }
  (repeat until completed)
```

---

## Ports Summary

| Service | Port |
|---------|------|
| Web UI (Vite) | 5173 |
| Client API | 3001 |
| A2A Server | 3000 |
| AI Hub Proxy | 11434 |
| Local LLM upstream | 11435 |
| PostgreSQL | 5432 |
| Redis | 6379 |

---

## Key Constraints

- **Stateless server** — A2A Server holds no session state; all state lives in Client API + storage
- **Async-only transport** — no sync LLM calls; every LLM request goes through promise queue
- **Client-server separation** — Web UI never talks directly to A2A Server
- **Action-key shape** — server responses use `{ execute: {...} }` or `{ result: {...} }` only
