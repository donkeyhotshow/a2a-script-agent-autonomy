# DEV_STATE — 2026-04-07

**Rules Q&A:** [`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md) · Normative: [`AGENTS.md`](AGENTS.md)

---

## Primary goal (north star)

**Run a dialog through the Client API so the agent executes work the Task Monitor proposes** (prompts under [`prompts-to-agent-mode/`](prompts-to-agent-mode/README.md)). Success means: session create → `/next` → poll `/async` until terminal; router beats respected (`message` vs `choice`); agent can apply repo changes. **Not** raw `invoke` alone.

| Step | Reference |
|------|-----------|
| Live stack (Windows) | Repo root **`start-all.bat`** — [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) |
| Manual same path as UI | [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) — `POST /api/a2a/sessions` with **`mode: "agent"`**, then `/next` + `GET …/async` |
| Task Monitor automation | [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js) · **`task-monitor-state.json`** · operator: [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) · prompt stub: [`prompts-to-agent-mode/task-monitor-quick-start.md`](prompts-to-agent-mode/task-monitor-quick-start.md) |
| Router two beats | [`AGENTS.md`](AGENTS.md) *Router dialog* |

**Default team habit:** treat **agent-mode dialog** as the main ongoing activity — web UI or the same Client API flow (`mode: "agent"`, `/next`, poll `/async`, correct `message` vs `choice`). **[`npm run monitor:once`](MONITOR-QUICK-START.md)** (one prompt per run by default) is the batched automation for that same path; IDE work closes the loop on what sessions expose.

---

## Triangle workflow + colored alerts (whole-stack lens)

**Normative loop:** [`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md) — gates **C1 / A1 / B1**, then per turn **observe session (1)** → **poll `/async` (2)** → **optional `/next` (3)** → compare to goldens **(4)**.

| Vertex | Layer | Typical triage alert (see [`GLOSSARY.md`](GLOSSARY.md) *Alerts*) | Note |
|--------|--------|------------------------------------------------------------------|------|
| **A** | Client API + `a2a-client/storage/sessions/` | **Blue** (router / `message` vs `choice`, step storage), **Orange** (async / promise polling), **Teal** (Client ↔ server DTO) | Not the same as **Red Room** (client tool phase after server decision) |
| **B** | `a2a-server` (`/api/v1/invoke`, transforms) | **Gray alert** = *assume server bug first* | **Gray Room** = server LLM chain (runtime); different from Gray **alert** |
| **C** | `ai-integration` hub (`11434`) + upstream (`11435` if used) | **Black alert (proxy)** | Hub health = gate **C1** |

**Full monitor / queue burn:** **Red alert** = run Task Monitor through Client API ([`GLOSSARY.md`](GLOSSARY.md) *Red alert*).

**Rooms (runtime phases)** — Gray Room / Red Room / Black Room — vs **alerts (labels)** — spelled out in [`GLOSSARY.md`](GLOSSARY.md) *Rooms vs alerts*.

---

## Iterativity — conditions for full project normalization

**Normalization** here means: one **contractual** story across **A / B / C** (Client API ↔ server ↔ hub), **async-only** transport, **action-key** shapes, and **canonical docs** that match production paths — without duplicate sources of truth ([`GLOSSARY.md`](GLOSSARY.md) *Purple* / *Brown* / *Amber* alerts).

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

- **Operator + narrative index:** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) · [`COMPLETION-REPORT.md`](COMPLETION-REPORT.md).
- **State file:** `task-monitor-state.json` — `currentTask`, `sessionId`, `status`, `processedTasks[]`. **Regression tests:** `npm run test:monitor` (repo root).
- **Timeouts:** defaults **120 × 5s** attempts + **600000ms** wall cap (~10m); `monitorActiveTasks` timeout aligned with `pollTimeoutMs`. Vitest: `npx vitest run tests/infrastructure/monitor-and-process-tasks.test.js` (reads `tests/monitor-tasks/*.js` + entry). Override via `TASK_MONITOR_*` env. Still inspect `GET /api/a2a/sessions/{id}` + `/async` when stuck ([`AGENTS.md`](AGENTS.md) *Stack / promise pending*).
- **Promise queue:** with **`PROMISE_DAEMON_ONLY`** (hub default), LLM `?promise=1` tickets must be drained — **`start-all.bat`** now starts the **promise-queue-daemon** window; manual: `scripts/start-promise-queue-daemon.bat` or `cd ai-integration && python scripts/promise_queue_daemon.py` (hub **`http://localhost:11434`**). **`hub_promise_empty`** / stuck `pending` usually means the daemon was not hitting the hub.

**Authoritative human queue (if used):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач*.

---

## Cross-module DEV_STATE

| Module | File |
|--------|------|
| Client + sessions | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md) |
| Invoke + processors | [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md) |
| AI hub + promises | [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) |

**Security (as-of 2026-04-07):** Harmful-pattern pass logged in [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](docs/PURPLE-ALERT-HARMFUL-HUNT.md) (*Last run log*). **Fix applied:** `a2a-server` `bug-fixer` `getGitDiff` uses `spawnSync('git', […])` instead of shell-interpolated `execSync`. **Magenta:** root `npm audit --omit=dev` clean; `a2a-server` / `a2a-client` still have findings — [`tasks/pending/magenta-npm-audit-2026-04.md`](tasks/pending/magenta-npm-audit-2026-04.md).

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

## Next (ordered)

1. **Broader offline:** `npm run test:direct-tests` (Vitest under `tests/direct-tests/`) · `npm run test:gang` (Papa–Mama orchestrator) if you change session/proxy contracts.
2. **Sims:** `npm run sim:lint -- --all` · `npm run sim:validate -- --all` (from root; runs via `a2a-server`).
3. **Live stack / north star:** `start-all.bat` → `npm run monitor:once` (or one manual Client API session per [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)); set **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** when hub reports `promise_daemon_only` and the queue is drained.
4. **Test-architecture debt (fixtures / gray paths):** [`tasks/pending/test-architecture-proposals.md`](tasks/pending/test-architecture-proposals.md).

## Secondary / backlog (not blocking the north star)

- Offline gate (repo root): **`npm run test:before-start`** — indirect + a2a-server Vitest (PowerShell driver) + **`test:monitor`** (verified green **2026-04-07** after import/test alignment fixes).
- Roadmap: [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md)
- Schema debug entry: [`tests/direct-tests/README.md`](tests/direct-tests/README.md)
- Gray room offline check: `npm run verify:gray-room -- <snapshot.json>`
- Sims: `npm run sim:lint -- --all` · `npm run sim:validate -- --all`

Historical change log was pruned in favor of this goal-centric view; use `git log` and module DEV_STATE history for archaeology.
