# DEV_STATE — 2026-04-08

**Rules Q&A:** [`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md) · Normative: [`AGENTS.md`](AGENTS.md)

**Project status (elevated bar):** treat the repo as an **autonomous AI operator workstation** — async sessions until terminal completion, not ad-hoc invokes. **Production acceptance** = explicit criteria in `tasks/` + monitor-driven runs + offline validators (contracts, **boundary cases**, cross-system checks). Evidence before closure — [`AGENTS.md`](AGENTS.md) *Evidence-first loop*.

---

## Primary goal (north star)

**Execute indexed stack work through the Task Monitor** — **`npm run monitor`** / **`monitor:once`** ([`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)) driving [`prompts-to-agent-mode/`](prompts-to-agent-mode/README.md) via Client API sessions. Success means: automated create → `/next` → poll `/async` until terminal; router beats respected; agent can apply repo changes; evidence in **`merged`**. Manual curl is debug-only for that queue. **Not** raw `invoke` alone. **Operator trap:** a markdown task reads like one step, but runtime is **one session + many turns** — see [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md) (top), [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md), [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md), root [`README.md`](README.md) (*Full-spectrum*), [`AGENTS.md`](AGENTS.md) (*Markdown task ≠ one HTTP call*), [`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md) (*Unified manual path*), [`tasks/README.md`](tasks/README.md) (stack queue row), [`GLOSSARY.md`](GLOSSARY.md) (*Task Monitor*), [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md).

**Last monitor run (2026-04-08T14:11:22+03:00):** Processed 1 task from queue (`doc-adr-0036-master-orchestration-memory-proposed.md`), which timed out after 302s at `status=idle`. Hub had 79 error promises (401 auth errors). 17 tasks skipped as already completed. Evidence: task monitor logs showing timeout and promise queue state.

| Step | Reference |
|------|-----------|
| Live stack (Windows) | Repo root **`start-all.bat`** — [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) |
| Manual Client API (debug / one-off) | [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) — same contour as UI: `POST /api/a2a/sessions` with **`mode: "agent"`**, then `/next` + `GET …/async` |
| Task Monitor (normative for indexed prompts) | [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js) — **default executor** for `prompts-to-agent-mode/`; **`npm run monitor:completed:json`** → **`merged`** · operator: [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) · agent checklist: [`prompts-to-agent-mode/task-monitor-quick-start.md`](prompts-to-agent-mode/task-monitor-quick-start.md) |
| Router two beats | [`AGENTS.md`](AGENTS.md) *Router dialog* |

**Default team habit:** for **`prompts-to-agent-mode/`**, run **`npm run monitor`** or **`monitor:once`** — not file-by-file curl. Web UI uses the same Client API shape. IDE closes the loop on **`tasks/`** + **`DEV_STATE`**, then returns to the monitor for the stack queue.

**Cross-system shapes (wrong returns between layers):** hub [`cross-system-contracts/README.md`](cross-system-contracts/README.md), sequence [`cross-system-contracts/SEQUENCE.md`](cross-system-contracts/SEQUENCE.md), operator notes [`cross-system-contracts/PRACTICE.md`](cross-system-contracts/PRACTICE.md), **`npm run cross-system:validate`**, backlog [`tasks/pending/cross-system-parameter-hunt.md`](tasks/pending/cross-system-parameter-hunt.md). 

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

**Orange alert:** documented as **permanent** async-only policy (“оранжевая тревога навсегда”) — [`GLOSSARY.md`](GLOSSARY.md), [`docs/AGENT-DIALOG-API-STATE.md`](docs/AGENT-DIALOG-API-STATE.md).

---

## Iterativity — conditions for full project normalization

**Normalization** here means: one **contractual** story across **A / B / C** (Client API ↔ server ↔ hub), **async-only** transport, **action-key** shapes, and **canonical docs** that match production paths — without duplicate sources of truth ([`GLOSSARY.md`](GLOSSARY.md) *Purple* / *Brown* / *Amber* alerts).

**Each iteration must:**

1. **Touch state** — Update root + any affected module [`DEV_STATE.md`](a2a-client/DEV_STATE.md) before/after work ([`.cursor/rules/document-hierarchy.mdc`](.cursor/rules/document-hierarchy.mdc) *DEV_STATE Protocol*).
2. **Classify layer** — If something fails, run the [**triangle loop**](docs/TRIANGLE-WORKFLOW.md) (gates **0**, then **1→2→3**) and pick the right **alert** color ([`GLOSSARY.md`](GLOSSARY.md) *Alerts*); do not guess without `GET …/sessions/{id}` + `/async` when sessions are involved.
3. **Verify what changed** — At least one of: module tests, `tests/direct-tests` for shape, or `sim:lint` / `sim:validate` for touched sim surfaces ([`tests/direct-tests/README.md`](tests/direct-tests/README.md)).
4. **Queue honesty** — Remove done items from `DEV_STATE` / `tasks/`; **discover** new gaps; **write** concrete next steps. **Empty queue ≠ done** — run [`AGENTS.md`](AGENTS.md) *Empty queue* (prune → discover → write → drive stack).
5. **Hygiene when stuck** — **Hygiene** section in this file (processes + storage + optional monitor reset); **do not** wipe LLM disk cache unless explicitly requested.
6. **Evidence first** — Each loop must record practical artifacts (test output, `sessionId`/`promiseId`, async terminal status, or concrete diff). If missing, run a minimal experiment first and log it in state (see [`AGENTS.md`](AGENTS.md) *Evidence-first loop* and [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) *Evidence rule*).

**Continue iterating until** (normalization bar for the current scope): no open **P0** for that scope (broken stack, wrong router contract, sync invoke escape hatch, or doc that lies about the Client API path), and the **next** prune/discover pass either adds only **P1+** items or none — then record **as-of date** in `DEV_STATE` instead of declaring “forever done.”

**Legitimate stop:** user acceptance, or a **logged blocker** (evidence + owner + next experiment) — not “I answered once” or “the list looked empty.” Misreads: [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md).

---

## Environment snapshot (this machine)

Probed **2026-04-08**: `5173` (`/api/a2a/projects`), `3000` (/health), `11434` (/health), `11435` (/api/tags) — **HTTP 200**. **`npm run monitor:once`** with **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** → **1 succeeded** (~33s): [`client-api-04-session-rebuild-highest-step.md`](prompts-to-agent-mode/client-api-04-session-rebuild-highest-step.md), session **`sess_1775596533968`** (6 prior prompts skipped). Earlier same day: **`client-api-03`** → **`sess_1775596093325`**. **Regression:** **`npm run test:monitor`** → **37 passed** (2026-04-08 re-verify).

Earlier probe **2026-04-07**: same ports — **HTTP 200**.

If any probe fails: start with **`start-all.bat`**, then re-run the curls in *Health checks* below.

---

## Task Monitor signal

- **Operator + narrative index:** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) (no root `COMPLETION-REPORT.md` — see [`tasks/brown-alert/monitor-docs-duplicate-surfaces.md`](tasks/brown-alert/monitor-docs-duplicate-surfaces.md)).
- **State file:** `task-monitor-state.json` — `currentTask`, `sessionId`, `status`, `processedTasks[]`, **`taskSessions`** (one bound Client API `sessionId` per prompts-to-agent-mode markdown task until completion or **`TASK_MONITOR_NEW_SESSION_PER_TASK=1`**). **Completed → `sessionId` for scripts:** `npm run monitor:completed:json` → **`merged`**. **Regression:** `npm run test:monitor` — **37 passed** (re-verified 2026-04-08; run locally to refresh).
- **Timeouts:** **`TASK_MONITOR_POLL_TIMEOUT_MS`** wall cap is authoritative (~**600000ms** default); poll iteration ceiling scales with timeout ÷ interval so **`TASK_MONITOR_MAX_POLL_ATTEMPTS`** cannot shorten a run below that wall clock. Async `/async` **`pending`** is treated as busy (same as `processing`). **`TASK_MONITOR_AGENT_TOOL_STALL_MS`** (default **180000**) fails fast if `action=agent` stays in any **`tool_*`** step that long; **`TASK_MONITOR_STALL_POLLS`** uses an **`agent_tool_phase`** key so rotating tool steps still counts toward stall. Vitest: `npx vitest run tests/infrastructure/monitor-and-process-tasks.test.js`. Still inspect `GET /api/a2a/sessions/{id}` + `/async` when stuck ([`AGENTS.md`](AGENTS.md) *Stack / promise pending*).
- **Agent tool chain (2026-04-07):** Client API **`execute['run-script']`** with **`command`** (LLM one-liner) is now chained like **`scriptId`** — previously `getValidatedToolKey` rejected it and sessions stuck on **`tool_run_script`** with no `context.result` ([`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md)). **Evidence:** `npx vitest run tests/direct-tests/chain-guards-message-plus-tool.test.mjs tests/infrastructure/monitor-and-process-tasks.test.js` → **29 passed** (2026-04-07).
- **Orange alert (async driver) — 2026-04-08:** **`npm run test:monitor`** → **25 passed**; **`npm run monitor:once`** → [`client-api-03-async-resolves-pending.md`](prompts-to-agent-mode/client-api-03-async-resolves-pending.md) completed (**`sess_1775596093325`**, `/next` → `/async` → hydrate). Prior **`TASK_MONITOR_ASSISTANT_LOOSE`** env was inverted (`1` did not enable loose mode) — fixed in `tests/monitor-tasks/task-monitor-processing.js`.
- **Resume kick (2026-04-08):** Resuming from **`task-monitor-state.json`** without sending **`/next`** left sessions with **no assistant** in the timeline idling until poll timeout. **Fix:** after resume, if **`sessionTimelineEntries`** has **no** assistant line, send the same **`/next` (task)** as a fresh run. **`client-api-04-session-rebuild-highest-step.md`** re-ran clean (**`sess_1775596833372`**, ~34s) after state cleared; tests still **23 passed**.
- **Monitor queue (2026-04-08):** **`client-api-05-red-room-artifacts.md`** completed (**`sess_1775596882819`**, ~43s).
- **`sessionTimelineEntries` (2026-04-08):** When **`context.history`** was longer than **`messages`**, the monitor used history only and **dropped assistant lines present only on `messages`** → false 600s timeouts (`dev-state-client-test-failures.md`). **Fix:** if **`messages`** has more (or any) assistant rows than the mapped history, prefer **`messages`**. **`dev-state-client-test-failures.md`** then completed (**`sess_1775597582712`**, ~43s).
- **Monitor queue (2026-04-08):** **`dev-state-orchestrator-metrics.md`** completed (**`sess_1775597640359`**, ~32s).
- **Monitor queue (2026-04-08):** **`dev-state-router-drift-optional.md`** completed (**`sess_1775598309788`**, ~44s).
- **START-FULL-SPECTRUM / monitor:once (2026-04-08):** [`doc-adr-0021-cross-browser-matrix.md`](prompts-to-agent-mode/doc-adr-0021-cross-browser-matrix.md) → **`sess_1775603431242`**; [`doc-adr-0025-promise-ui-decouple.md`](prompts-to-agent-mode/doc-adr-0025-promise-ui-decouple.md) → **`sess_1775603572213`**. **`hooks/task_monitor_issue.json`** reset (empty **`errors[]`**). **Hub proxy probe:** `tests/monitor-tasks/promise-queue-probe.mjs` now **`normalizeClientHubProbeOrigin`** (`localhost` / IPv6 loopback → **`127.0.0.1`**) before **`/api/a2a/hub/promises/*`** fetches — avoids spurious **404** when Vite is IPv4-only. Tests: **`npx vitest run tests/unit/promise-queue-probe-normalize.test.js`**.
- **START-FULL-SPECTRUM (2026-04-08, IDE):** `npm run monitor:once` → [`doc-adr-0027-planning-readme-missing.md`](prompts-to-agent-mode/doc-adr-0027-planning-readme-missing.md) completed, **`sess_1775603823624`** (~29s), **1 succeeded / 0 failed / 15 skipped**. Hub **0 pending**, **65** in `/promises/errors` (stale 401). **WARN:** `http://127.0.0.1:5173/api/a2a/hub/promises/{pending,errors}` → **404** (run still succeeded).
- **doc-adr-0035 (2026-04-08):** Earlier fail **`sess_1775604739617`** (strict **`/next`** timeout + pending hub ticket). **Pass after defaults change:** **`npm run monitor:once`** with **`TASK_MONITOR_STRICT_AGENT_COMPLETION=0`** (default) → [`doc-adr-0035-open-followups.md`](prompts-to-agent-mode/doc-adr-0035-open-followups.md) **completed**, **`sess_1775605500906`** (~33s). **WARN:** monitor **artifact-scan** — `context.history` assistant rows look like raw **`choices[]`** envelope (steps 3–4); inspect server unwrap / history merge.
- **Task Monitor / agent completion (2026-04-08):** **`TASK_MONITOR_STRICT_AGENT_COMPLETION`** defaults to **`0`** in [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js) if unset — **no** auto continuation **`/next`**; poll-only until terminal session shape (Red Room / client tool cycle unchanged). **Opt in strict nudges:** **`TASK_MONITOR_STRICT_AGENT_COMPLETION=1`** + **`TASK_MONITOR_AGENT_CONTINUE_MAX`**. Doc: [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md). Tests: **`npx vitest run tests/infrastructure/monitor-and-process-tasks.test.js`**.
- **Session artifact scan (2026-04-08):** On task success, monitor warns if **`a2a-client/storage/sessions/<id>/*/server-response.json`** has **`context.history`** assistant **`message`** starting with raw **`{"choices":[`** (wire completion). Opt out: **`TASK_MONITOR_SESSION_ARTIFACT_SCAN=0`**. **`doc-adr-0012-session-store-enhancements.md`** completed (**`sess_1775598589644`**, ~29s); **`npm run test:monitor`** → **25 passed**.
- **Task Monitor sequential `processTask` (2026-04-07):** Router-stuck cap **5** was shared with **successful** monitor-gate advances — after **5** agent/router steps, **`tryAdvanceMonitorGate`** stopped entirely → timeout at `idle` + `agent`/`step=request`. **Fixed:** `routerIdleStuckCount` only when **choices** exist and no auto-advance; gate advances uncapped. **Also:** `tryAdvanceMonitorGate` no longer re-sends task text when **`action=agent` + `step=request`** (duplicate `POST /next` spam). **Idle + `step=request` + no `context.result`:** complete when **`messages`** show **post-router** assistant text — assistant **after** user line **`agent`** / **`dialog`** / **`task-decomposition`**, or **2+** assistants (≥20 chars), or **one** assistant ≥**80** chars, or (fallback) assistant after user line matching task stub. **`TASK_MONITOR_ASSISTANT_LOOSE=1`** restores the old “any assistant ≥20 chars” rule. **2026-04-08:** completion **`GET …/sessions`** uses **`includeContext=1`**; timeline prefers **`context.history`** when longer than **`messages`**; user router choice also accepts JSON **`{"choice":"agent"}`** bodies. **Evidence:** `npm run test:monitor` green; **`npm run monitor:once`** with **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** → **1 succeeded** (~37s, `sess_1775594181259`); repeat run → next prompt **`ai-integration-promise-queue-plan.md`** (~33s, `sess_1775594257680`); **`ai-integration-ui-improvements-plan.md`** (~35s, `sess_1775594339460`); **`client-api-01-sessions-create-load.md`** (~43s, `sess_1775595095247`).
- **Practical monitor run (2026-04-08, doc-adr-0036):** Applied two shape fixes to keep agent path simulation-aligned during fallback states: **`a2a-server/src/services/core/request-processor/dialog-request-processor.ts`** now synthesizes **agent `execute.form`** when execute is missing/empty; **`a2a-server/prompts/transforms/agent-request.json`** now emits **`execute.form`** instead of message-only *"Pending LLM..."*. **Evidence:** repeated `npm run monitor:once` moved failure mode from idle/message-only to active agent start, but run still timed out due to runtime transport issues (intermittent `:5173` during dev auto-restart, `AggregateError` on `sendNext/getSession`, and increasing hub `/promises/errors` with `hub_promise_empty` + historical 401 auth failures). Practical takeaway: shape regressions were fixed; remaining blocker is stack/runtime stability and hub auth queue hygiene, not Client API execute contract.
- **Monitor validation / completion (2026-04-07):** `validateActionKeyShape` wrongly failed on **`execute: { message }` only** (agent completion with no tool key) and on **`form`/`llmMessage`** not counted as aux. **`processTask`** now treats **`action=agent` + `step=completed` + `execute.message`** as success when **`context.result`** is absent. Tests: `tests/infrastructure/task-monitor-validation-shape.test.js` + `npm run test:monitor`.
- **Async poll + execution (2026-04-07):** Task Monitor **`pollAsync`** uses **`GET …/async?includeContext=1`**; plugin attaches **`context.execution`** when the server result has `context` — fixes missing **`tool_*`** step in the poll body (stall / `TASK_MONITOR_AGENT_TOOL_STALL_MS` relied on it). Evidence: `npm run test:monitor` green.
- **Promise queue:** with **`PROMISE_DAEMON_ONLY`** (hub default), LLM `?promise=1` tickets must be drained — **`start-all.bat`** starts the **promise-queue-daemon**; hub **`http://localhost:11434`** (or **`GET /api/a2a/hub/...`** via Client API). **`GET /promises/pending`** is **pending-only**; failed tickets: **`GET /promises/errors`**, **`POST /promise/<id>/retry`** + **`/execute`**, or **`DELETE /promise/<id>`** — [`ai-integration/docs/api-reference/PROXY_API.md`](ai-integration/docs/api-reference/PROXY_API.md); Web **Hub queue** (header). **2026-04-08:** a2a-server **`fetchAiHubChatJson`** (sync hub calls, e.g. LlmService / Gray internal debate) now **POSTs `/execute`** after **202** init so work is not left pending-only. **`hub_promise_empty`** if it still appears: upstream busy (**503** on execute) or empty LLM body — see hub logs.

**Authoritative human queue (if used):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач*.

---

## Cross-module DEV_STATE

| Module | File |
|--------|------|
| Client + sessions | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md) |
| Invoke + processors | [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md) |
| AI hub + promises | [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) |

**Security (as-of 2026-04-07):** Harmful-pattern pass + follow-up fixes in [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](docs/PURPLE-ALERT-HARMFUL-HUNT.md) (*Last run log*): `skillLite` stub (no exec), `template-loader` escaped `{{key}}`, `cross-system-validate` argv `npm run`, `run-human-review` via `vitest.mjs`, `@a2a/execution` `vm2` dep, `render-layout`/`runbook-cli` hardening. **Magenta:** production `npm audit --omit=dev` **0** for root, `a2a-server`, `a2a-client` (2026-04-07). Summary: [`tasks/completed/magenta-npm-audit-2026-04.md`](tasks/completed/magenta-npm-audit-2026-04.md). **`POST /api/tools/evolve`:** TS + vm2 validation in [`a2a-server/src/api/tools-evolve-sandbox.ts`](a2a-server/src/api/tools-evolve-sandbox.ts) — [`tasks/completed/improve-tools-evolve-sandboxing.md`](tasks/completed/improve-tools-evolve-sandboxing.md).

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
2. **Session + async storage (no cache):** [`cleanup-session-state.js`](cleanup-session-state.js) — `npm run cleanup:state` or `node cleanup-session-state.js`. Wipes **all** of `a2a-client/storage/sessions/*`, hub `proxy_logs`, `ai-integration/storage/promises`, `a2a-server/storage/requests`. **No** age-based pruning for client sessions — only explicit cleanup; after that Task Monitor uses **one** Client API session per prompt (`taskSessions`) until done. **Does not** touch `ai-integration/storage/cache` (LLM disk cache) or npm/vite caches.
3. **Task Monitor pointer reset (optional):** `npm run monitor:reset` removes `task-monitor-state.json` if the daemon left a bad cursor.
4. **Session storage “engine check” (optional):** `npm run audit:session-storage` — writes deterministic `tasks/pending/session-storage-*.md` from `a2a-client/storage/sessions/`, MD5-skip unchanged, deletes tasks when defects clear; manifest `tasks/pending/session-storage-audit-manifest.json`.

Then `start-all.bat` and retry.

---

## Next (ordered)

1. **Broader offline:** `npm run test:direct-tests` — **33 passed** · `npm run cross-system:validate` — exit **0** (may print `EXECUTE_MESSAGE_ONLY` on stored hub/session files — informational) · **`npm run test:before-start`** — **2026-04-08:** indirect **7/7**, a2a-server Vitest **733 passed** (3 skipped), **`test:monitor` 37 passed** (re-run `npm run test:monitor` to confirm; Vitest file count drifts with tests) · `npm run test:gang` only when changing session/proxy contracts — **last stage** `validate:proba-servera` needs **ai-integration `:11434`** unless **`PROBA_SERVERA_SKIP_STACK_CHECK=1`**. **Proba `agent-tool-rag-search`:** gray-room merges include **`workbench.sections`** ([`interrupt-trace-contract.ts`](a2a-server/src/transform/interrupt-trace-contract.ts)); `ensureWorkbenchSectionsShape` coerces bad **`workbench` / `sections`** ([`dialog-request-processor.ts`](a2a-server/src/services/core/request-processor/dialog-request-processor.ts)).
2. **Sims:** `npm run sim:lint -- --all` · `npm run sim:validate -- --all` (from root) — **2026-04-08:** exit **0** — `sim:lint` / `sim:validate` JSON: all sims **`valid: true`**, **`warningCount: 0`** (same bar as **2026-04-07** run).
3. **Live stack / north star:** `start-all.bat` → `npm run monitor:once` (or one manual Client API session per [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)); set **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** when hub reports `promise_daemon_only` and the queue is drained.
4. **Test-architecture debt (fixtures / gray paths):** [`tasks/pending/test-architecture-proposals.md`](tasks/pending/test-architecture-proposals.md).

## Secondary / backlog (not blocking the north star)

- Offline gate (repo root): **`npm run test:before-start`** — same bundle as *Next* §1; last full pass **2026-04-08** (green).
- Roadmap: [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md)
- Schema debug entry: [`tests/direct-tests/README.md`](tests/direct-tests/README.md)
- Gray room offline check: `npm run verify:gray-room -- <snapshot.json>`
- Sims: `npm run sim:lint -- --all` · `npm run sim:validate -- --all`

**2026-04-08:** Docs tightened — indexed stack workflow normative on Task Monitor (`AGENTS.md`, `ONE-PIPELINE.md`, `tasks/README.md`, `MONITOR-QUICK-START.md`, `STACK-RUN.md`, `GLOSSARY.md`). **`npm run test:monitor`** → **37 passed** (re-verified; + sequential `createCompletionReport` guard). **`START-FULL-SPECTRUM.md`** Agent prompt updated: real **`hooks/task_monitor_issue.json`** (`errors[]`), **`task_completion_report.json`**, optional sample **`CURSOR_AGENT_SIGNAL`** (no in-repo ticker script), monitor-owned `/next` loop, IDE cadence + [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md), evidence before hook cleanup. Dead **`BREAK_STATE.md`** links removed from [`docs/PROMISE-RETRY-DIALOG.md`](docs/PROMISE-RETRY-DIALOG.md) and [`a2a-server/docs/GRAY-ROOM.md`](a2a-server/docs/GRAY-ROOM.md); **`test:before-start`** includes **`test:monitor`** (see *Next* §1 for current count); [`prompts-to-agent-mode/methodology-proposals-folder-missing.md`](prompts-to-agent-mode/methodology-proposals-folder-missing.md) no longer claims missing `tasks.md` is “done.”

Historical change log was pruned in favor of this goal-centric view; use `git log` and module DEV_STATE history for archaeology.
