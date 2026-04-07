# DEV_STATE — 2026-04-07

**Rules Q&A:** [`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md) · Normative: [`AGENTS.md`](AGENTS.md)

---

## Primary goal (north star)

**Run a dialog through the Client API so the agent executes work the Task Monitor proposes** (prompts under [`prompts-to-agent-mode/`](prompts-to-agent-mode/README.md)). Success means: session create → `/next` → poll `/async` until terminal; router beats respected (`message` vs `choice`); agent can apply repo changes. **Not** raw `invoke` alone.

| Step | Reference |
|------|-----------|
| Live stack (Windows) | Repo root **`start-all.bat`** — [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) |
| Manual same path as UI | [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) — `POST /api/a2a/sessions` with **`mode: "agent"`**, then `/next` + `GET …/async` |
| Task Monitor automation | [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js) · state: **`task-monitor-state.json`** · quick ref: [`prompts-to-agent-mode/task-monitor-quick-start.md`](prompts-to-agent-mode/task-monitor-quick-start.md) |
| Router two beats | [`AGENTS.md`](AGENTS.md) *Router dialog* |

---

## Triangle workflow + colored alerts (whole-stack lens)

**Normative loop:** [`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md) — gates **C1 / A1 / B1**, then per turn **observe session (1)** → **poll `/async` (2)** → **optional `/next` (3)** → compare to goldens **(4)**.

| Vertex | Layer | Typical triage alert (see [`GLOSSARY.md`](GLOSSARY.md) *Alerts*) | Note |
|--------|--------|------------------------------------------------------------------|------|
| **A** | Client API + `a2a-client/storage/sessions/` | **Blue** (router / `message` vs `choice`, step storage), **Purple** (async / promise polling), **Teal** (Client ↔ server DTO) | Not the same as **Red Room** (client tool phase after server decision) |
| **B** | `a2a-server` (`/api/v1/invoke`, transforms) | **Gray alert** = *assume server bug first* | **Gray Room** = server LLM chain (runtime); different from Gray **alert** |
| **C** | `ai-integration` hub (`11434`) + upstream (`11435` if used) | **Black alert (proxy)** | Hub health = gate **C1** |

**Full monitor / queue burn:** **Red alert** = run Task Monitor through Client API ([`GLOSSARY.md`](GLOSSARY.md) *Red alert*).

**Rooms (runtime phases)** — Gray Room / Red Room / Black Room — vs **alerts (labels)** — spelled out in [`GLOSSARY.md`](GLOSSARY.md) *Rooms vs alerts*.

---

## Iterativity — conditions for full project normalization

**Normalization** here means: one **contractual** story across **A / B / C** (Client API ↔ server ↔ hub), **async-only** transport, **action-key** shapes, and **canonical docs** that match production paths — without duplicate sources of truth ([`GLOSSARY.md`](GLOSSARY.md) *Orange* / *Brown* / *Amber* alerts).

**Each iteration must:**

1. **Touch state** — Update root + any affected module [`DEV_STATE.md`](a2a-client/DEV_STATE.md) before/after work ([`.cursor/rules/document-hierarchy.mdc`](.cursor/rules/document-hierarchy.mdc) *DEV_STATE Protocol*).
2. **Classify layer** — If something fails, run the [**triangle loop**](docs/TRIANGLE-WORKFLOW.md) (gates **0**, then **1→2→3**) and pick the right **alert** color ([`GLOSSARY.md`](GLOSSARY.md) *Alerts*); do not guess without `GET …/sessions/{id}` + `/async` when sessions are involved.
3. **Verify what changed** — At least one of: module tests, `tests/direct-tests` for shape, or `sim:lint` / `sim:validate` for touched sim surfaces ([`tests/direct-tests/README.md`](tests/direct-tests/README.md)).
4. **Queue honesty** — Remove done items from `DEV_STATE` / `tasks/`; **discover** new gaps; **write** concrete next steps. **Empty queue ≠ done** — run [`AGENTS.md`](AGENTS.md) *Empty queue* (prune → discover → write → drive stack).
5. **Hygiene when stuck** — **Hygiene** section in this file (processes + storage + optional monitor reset); **do not** wipe LLM disk cache unless explicitly requested.

**Continue iterating until** (normalization bar for the current scope): no open **P0** for that scope (broken stack, wrong router contract, sync invoke escape hatch, or doc that lies about the Client API path), and the **next** prune/discover pass either adds only **P1+** items or none — then record **as-of date** in `DEV_STATE` instead of declaring “forever done.”

**Legitimate stop:** user acceptance, or a **logged blocker** (evidence + owner + next experiment) — not “I answered once” or “the list looked empty.” Misreads: [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md).

---

## Environment snapshot (this machine)

Probed **2026-04-07**: `5173` (Client API projects), `3000` (/health), `11434` (/health), `11435` (/api/tags) — **HTTP 200**. Full stack appears up.

If any probe fails: start with **`start-all.bat`**, then re-run the curls in *Health checks* below.

---

## Task Monitor signal

- **State file:** `task-monitor-state.json` — `currentTask`, `sessionId`, `status`, `processedTasks[]`.
- **Recent observation:** earlier runs showed **~301s timeouts** when the monitor hit **60 × 5s** poll attempts (same order as `TASK_MONITOR_POLL_TIMEOUT_MS` default was 300s). Defaults are now **120 attempts / 600000ms** (~10m); override via env if needed. Still inspect `GET /api/a2a/sessions/{id}` + `/async` when status stays `pending`/`processing` ([`AGENTS.md`](AGENTS.md) *Stack / promise pending*).

**Authoritative human queue (if used):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач*.

---

## Cross-module DEV_STATE

| Module | File |
|--------|------|
| Client + sessions | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md) |
| Invoke + processors | [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md) |
| AI hub + promises | [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) |

---

## Ports

| Port | Role |
|------|------|
| 11435 | Local LLM upstream |
| 11434 | AI Integration (hub) |
| 3000 | a2a-server |
| 5173 | Vite + Client API |

---

## Health checks

```bash
curl http://localhost:3000/health
curl http://localhost:11434/health
curl http://localhost:11435/api/tags
curl http://localhost:5173/api/a2a/projects
```

---

## Hygiene (stuck monitor / zombie stack)

1. **Processes:** [`kill-all.bat`](kill-all.bat) (repo root) or [`kill-all.ps1`](kill-all.ps1) / [`kill-all.sh`](kill-all.sh) — frees ports 5173 / 3000 / 11434 (and related).
2. **Session + async storage (no cache):** [`cleanup-session-state.js`](cleanup-session-state.js) — `npm run cleanup:state` or `node cleanup-session-state.js`. Wipes `a2a-client/storage/sessions`, hub `proxy_logs`, `ai-integration/storage/promises`, `a2a-server/storage/requests`. **Does not** touch `ai-integration/storage/cache` (LLM disk cache) or npm/vite caches.
3. **Task Monitor pointer reset (optional):** `npm run monitor:reset` removes `task-monitor-state.json` if the daemon left a bad cursor.

Then `start-all.bat` and retry.

---

## Secondary / backlog (not blocking the north star)

- Roadmap: [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md)
- Schema debug entry: [`tests/direct-tests/README.md`](tests/direct-tests/README.md)
- Gray room offline check: `npm run verify:gray-room -- <snapshot.json>`
- Sims: `npm run sim:lint -- --all` · `npm run sim:validate -- --all`

Historical change log was pruned in favor of this goal-centric view; use `git log` and module DEV_STATE history for archaeology.
