# Agent reference (extended)

Operator and stack detail split from [`AGENTS.md`](../AGENTS.md) so the always-loaded file stays short. **Glossary:** [GLOSSARY.md](../GLOSSARY.md) (root master). **Normative must-follow rules** live in **AGENTS.md** (Critical Rules, empty queue, evidence).
Production closure gate and manual QA acceptance criteria are canonical in [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](OPERATOR-MONITOR-MANUAL-QA.md).
Operator test command map is canonical in [`docs/OPERATOR-TESTING-MATRIX.md`](OPERATOR-TESTING-MATRIX.md).

---

## Unified manual path (Client API)

See the [AGENTS.md](../AGENTS.md) *Unified manual path* section for the complete Client API integration details.

### Why iteration stops (misreads and mitigations)

Two surfaces: **IDE / Cursor agent** (edits repo, runs tools) vs **Client API session driver** (curl or script hitting `/api/a2a/*`). Same repo traps; mitigations differ by who owns the loop.

| Trap | IDE / Cursor agent | Client API driver |
|------|--------------------|------------------|
| Empty queue = “finished” | **Do not** exit. Prune → discover → write tasks (`DEV_STATE`, `tasks/pending/`), then continue. | If you only drive HTTP, still **do not** treat “no local tickets” as done when the assignment is stack verification—follow project idle protocol or explicit checklist. |
| Vague / one-line user prompt | **Not** one-shot permission. Iterate until criteria met or log a **blocker** with evidence. | Same: complete **`/next` + poll `/async`** (and re-hydrate session), not a single POST. |
| Wrong router beat | Read `GET …/sessions/{id}`; send **`message`** / `task` as text when there are **no** `form.choices`; send **`choice`** / `task` as **choice `id`** when choices exist. | Scripted rule: after each response, **inspect** `execute.form`; branch body shape before next `/next`. |
| Stopped after `/next` ack | N/A | Poll **`GET …/async`** until final; **`GET …/sessions/{id}`** if unsure. |
| Raw `invoke` only | Prefer Client API for session persistence; use server direct only as **documented** workaround. | Default path: **`POST /sessions`** → `/next` → `/async`, not `POST /api/v1/invoke` alone. |
| Stack / promise pending | Diagnose ports ([Debugging](#debugging)), retry with backoff; log env (Local LLM upstream, AI hub). If Local LLM upstream is **actively generating**, do **not** restart the stack — [`OPERATOR-CURL.md`](OPERATOR-CURL.md) → *Local LLM upstream is generating — pause other work*. If Local LLM upstream is **idle** but status stays `processing`, treat as **stuck**. | Same; do not declare failure on first `pending`. After you confirm the model is working on the request, avoid parallel load / restarts until `async` settles. If Local LLM upstream is **idle** but status stays `processing`, treat as **stuck** — same section. |
| 401 / 400 (auth, `ENCRYPTION_KEY`) | Fix `.env` (32-char key, `JWT_SECRET`); retry. | Same. |
| “Need more context” loop-killer | State assumptions, proceed, verify; don’t halt on questions unless the user must decide. | Seed **`mode: "agent"`** + concrete **`task`** on create when allowed. |
| No definition of done | Use canonical acceptance criteria from [`OPERATOR-MONITOR-MANUAL-QA.md`](OPERATOR-MONITOR-MANUAL-QA.md) before declaring complete. | Use [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) for manual Client API depth. |
| `DEV_STATE` stale | Update before/after work so the next pass sees real queue state. | When fixing stack behavior, record in `DEV_STATE` / tasks for follow-up agents. |
| Golden sim / action-key failures | Fix shape (one action key per `execute`/`result`); re-run `sim:lint` / `sim:validate`. | N/A unless authoring sims. |

Driver-oriented step list: [`OPERATOR-CURL.md`](OPERATOR-CURL.md) → *Driver checklist (anti-stop)*.

---

## A2A Protocol

See [`docs/new-request-flow/PROTOCOL.md`](new-request-flow/PROTOCOL.md) for the complete A2A protocol specification, including promise polling, action-key shapes, and request flows.

### Context Fields (System-Managed)

- `context.history` — execution records
- `context.execution` — current state (action, step, progress)
- `context.workbench` — structured state (`sections`, optional `batch`, optional `slots`)
- `context.session_id` — server-assigned session identifier (`srv_sess_*`); the client never forwards its own storage `sessionId`
- `context.operationHistory[]` — lightweight operation tracking (llm_call, transform, interrupt, etc.) for debug/audit

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
| A2A_GRAY_ROOM_ENABLED | unset or `1` = on; `0`/`false` = off | No |
| A2A_BLACK_ROOM_ENABLED | Enable Black Room (Algorithm Mode) | No |
| A2A_BLACK_ROOM_COMPAT_LLM_URL | Local LLM upstream URL for Black Room (default: http://localhost:11435) | No |
| A2A_BLACK_ROOM_DEFAULT_MODEL | Default Local LLM upstream model for algorithms (default: llama3.1:8b) | No |
| A2A_BLACK_ROOM_TIMEOUT_MS | Timeout for algorithm execution (default: 30000ms) | No |
| A2A_ALGORITHM_REGISTRY_PATH | Path to algorithm templates (default: ./prompts/algorithms/) | No |
| REQUEST_RETRY_DELAY_MS | Dialog deferral: ms before a re-queued request is eligible (default 15000) | No |
| REQUEST_MAX_RETRIES | Dialog deferral: max re-queues per `promiseId` (default 15) | No |

---

## System Architecture

```
Web UI (5173) → Client API (5173/api/a2a) → A2A Server (3000) → AI Hub (11434)
      ↓ Session Storage ↓                           → Local LLM upstream (11435)
```

### Invoke payload privacy

- The Client API keeps the human-facing `sessionId`/`projectId` confined to `a2a-client/storage/…` and **strips them** before proxying to `/api/v1/invoke`. Project metadata (`projectId`/`projectRoot`) and any camelCase `sessionId` are removed before the server ever sees the payload.
- The stateless A2A Server always assigns its own `context.session_id` (currently `srv_sess_<uuid>`), returns it inside the response context, and the Client API reuses that server-issued token for follow-up invokes. That lets multi-step actions stay bound to a server session without leaking project or storage identifiers.
- Server responses must be sanitized: internal processing like gray room (server-side LLM chains) must not be included, as they are internal server operations that could expose secrets if leaked.

### Ports

See [System Startup Documentation](SYSTEM_STARTUP.md#портовая-схема) for complete port mapping.

### Live stack restart (Windows)

Use **`start-all.bat`** at the repository root for any full or partial “turn it off and on again” need. It performs `kill-all`, port checks, and ordered startup. **Do not** run `npm run dev` (or `npm start`) inside individual packages to restart one service—those processes are not tracked the same way and commonly cause duplicate listeners and broken PID files. Linux/macOS: use **`start-all.sh`** the same way.

### Sessions, tests, and agent mode (where to send HTTP)

The **operator sequence** is spelled out above: [Unified manual path (Client API)](#unified-manual-path-client-api). This subsection is the technical backing.

1. **Session lifecycle** (create session, `next`, poll `async`, disk step folders) is owned by the **Client API**, not by calling **`POST /api/v1/invoke`** on the A2A Server alone. In the default dev stack, that is **same origin as the web app**: `http://localhost:5173/api/a2a/*`. The UI, curl-based operators, and methodology that drive **sessions** all hit this surface.
2. **Standalone SDK** (`a2a-client/packages/sdk`) can expose the **same route contract** on its own HTTP port (often `3001` or `PORT`). That is an alternate deployment, not a different protocol. Normative split: [ADR-0028](adr/ADR-0028-client-api-deployment-modes.md). **GET session / messages** query flags (`unwrap`, `includeContext`, `afterSeq`): [`OPERATOR-CURL.md`](OPERATOR-CURL.md) § *GET session JSON shape*.
3. **A2A Server (`:3000`)** is **stateless** `invoke` + request IDs. The Client API proxies to it and persists steps under `a2a-client/storage/sessions/`.
4. **Agent mode** is **not** a separate HTTP route. You **select it at session creation** via `mode` / `execution` in the `POST /sessions` body (or it appears later in `context` after server turns). Ongoing checks: `context.execution.action === 'agent'` and/or workbench; see [ADR-0030](adr/ADR-0030-unified-agent-mode.md) and [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md).

Operator curl walkthrough: [`OPERATOR-CURL.md`](OPERATOR-CURL.md).

---



---

## Session Storage Format

See [`docs/SESSION-READ-MODEL.md`](SESSION-READ-MODEL.md) for complete session storage format and reconstruction guidelines.

---

## Debugging

See [System Startup Documentation](SYSTEM_STARTUP.md#health-checks) for health check procedures and [Operator CURL Guide](OPERATOR-CURL.md) for detailed debugging workflows.

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
| 401 Unauthorized | Set JWT_SECRET (32+ chars); use SKIP_AUTH=1 (dev) |
| Promise stays pending | Check Local LLM upstream status; confirm active generation |
| Session not found | Verify session ID format |
| LLM not responding | Check Local LLM upstream: `curl http://localhost:11435/api/tags` |

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Action-Key Shape** | Single action type per execute/result object |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Promise** | Async request ID for polling long-running work |
| **Gray Room** | Server-side LLM processing chain; internal only, not exposed to client |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Web DTO** | Client-sanitized execute (only form, not tool calls) |

See [docs/adr/README.md](adr/README.md) for architecture decisions.
| **operationHistory** | Легковесный трек операций (llm_call, transform, interrupt) для debug/audit |

---

## DEV_STATE Protocol

See [`.cursor/rules/document-hierarchy.mdc`](.cursor/rules/document-hierarchy.mdc#dev_state-protocol) for the complete DEV_STATE protocol definition. Also see [DEV_STATE.md](../DEV_STATE.md) for current system state.

---

## Operational Checklist

See the [AGENTS.md](../AGENTS.md) for the complete operational checklist and agent safety rules.

---

## References

| Document | Purpose |
|----------|---------|
| [DEV_STATE.md](../DEV_STATE.md) | Current system state |
| [GLOSSARY.md](../GLOSSARY.md) | Terminology |
| [DOCUMENTATION-MACHINE-READABLE.md](DOCUMENTATION-MACHINE-READABLE.md) | Doc standards |
| [simulations/SCHEMA.md](../simulations/SCHEMA.md) | Simulation contract |
| [ENV-MATRIX.md](ENV-MATRIX.md) | Environment matrix |
| [agent-iteration-traps.md](agent-iteration-traps.md) | Why iteration stops (low-context); mitigations (Cursor vs Client API driver) |
| [prompts-to-agent-mode/README.md](../prompts-to-agent-mode/README.md) | Indexed task prompts; live stack = Client API + `mode: "agent"` |
| Module state files | [a2a-client/DEV_STATE.md](../a2a-client/DEV_STATE.md), [a2a-server/DEV_STATE.md](../a2a-server/DEV_STATE.md), [ai-integration/DEV_STATE.md](../ai-integration/DEV_STATE.md) |
