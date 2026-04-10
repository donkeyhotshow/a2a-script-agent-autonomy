# DEV_STATE — 2026-04-08

**Rules Q&A:** [`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md) · Normative: [`AGENTS.md`](AGENTS.md)

**Project status (elevated bar):** treat the repo as an **autonomous AI operator workstation** — async sessions until terminal completion, not ad-hoc invokes. **Production acceptance** = explicit criteria in `tasks/` + monitor-driven runs + offline validators (contracts, **boundary cases**, cross-system checks). Evidence before closure — [`AGENTS.md`](AGENTS.md) *Evidence-first loop*.

---

## Primary goal (north star)

**Execute indexed stack work through the Task Monitor** — **`npm run monitor`** / **`monitor:once`** with Client API session flow and evidence in `merged`. Canonical workflow, anti-patterns, and closure gate live in [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md). Manual curl remains debug-only ([`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)).

**Last monitor run (2026-04-08T14:11:22+03:00):** Processed 1 task from queue (`doc-adr-0036-master-orchestration-memory-proposed.md`), which timed out after 302s at `status=idle`. Hub had 79 error promises (401 auth errors). 17 tasks skipped as already completed. Evidence: task monitor logs showing timeout and promise queue state.

**Doc iteration (2026-04-08, operator protocol):** Added [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md) to formalize monitor + manual QA operating loop. Scope includes prior proposal items **1-8, 10-12** and explicitly excludes centralized orchestrator routine (`npm run central`) for this request. Evidence: repo diff adds new protocol with contract block, mandatory workflow, and per-iteration manual QA checklist.
**Doc dedup iteration (2026-04-08, cross-links):** Linked [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md), [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md), and [`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md) to canonical acceptance source [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md). Replaced repeated closure wording with links to reduce drift risk.
**Operator scan iteration (2026-04-08, client/sdk/web/storage + tests):** Added [`docs/OPERATOR-TESTING-MATRIX.md`](docs/OPERATOR-TESTING-MATRIX.md) with deterministic test matrix and operator facts from `a2a-client` protocol docs (`WEB_UI_PROTOCOL.md`, `api-testing-plan.md`) and root script inventory. Linked matrix from [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md), [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md), [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md), and [`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md).
**Operator hardening iteration (2026-04-08, triangle + alerts + UI switch scope):** Added concrete wrong-behavior incident playbook to [`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md), added color-alert reminder to [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md), and created testable implementation task [`tasks/web-ui-client-prototype-toggle.md`](tasks/web-ui-client-prototype-toggle.md) for runtime switch between current client UI and prototype UI.
**UI switch implementation (2026-04-08):** Implemented runtime interface toggle in client web header (`Client UI` / `Prototype UI`) with persisted mode + configurable prototype URL in settings; added return switch inside `a2a-prototype` UI. Verification: `npm --prefix a2a-client run test:web` -> **52 passed**.

**Canonical operator runbook (deduplicated):** use [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md) as the single workflow source for monitor execution, manual QA, anti-patterns, and **100% production-ready** acceptance criteria. Keep `DEV_STATE` entries focused on iteration evidence and deltas.

**Cross-system shapes (wrong returns between layers):** hub [`cross-system-contracts/README.md`](cross-system-contracts/README.md), sequence [`cross-system-contracts/SEQUENCE.md`](cross-system-contracts/SEQUENCE.md), operator notes [`cross-system-contracts/PRACTICE.md`](cross-system-contracts/PRACTICE.md), **`npm run cross-system:validate`**, backlog [`tasks/pending/cross-system-parameter-hunt.md`](tasks/pending/cross-system-parameter-hunt.md). 

---

**Triangle workflow + alerts:** See [`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md) and root [`GLOSSARY.md`](GLOSSARY.md) *Alerts* / *Rooms vs alerts*.

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

Probed **2026-04-08**: `5173` (`/api/a2a/projects`), `3000` (/health), `11434` (/health), `11435` (/api/tags) — **HTTP 200**. **`npm run monitor:once`** with **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** → **1 succeeded** (~33s): [`client-api-04-session-rebuild-highest-step.md`](prompts-to-agent-mode/client-api-04-session-rebuild-highest-step.md), session **`sess_1775596533968`** (6 prior prompts skipped). Earlier same day: **`client-api-03`** → **`sess_1775596093325`**. **Regression:** **`npm run test:monitor`** → **38 passed** (includes central-orchestrator argv contract; re-run locally to confirm).

Earlier probe **2026-04-07**: same ports — **HTTP 200**.

If any probe fails: start with **`start-all.bat`**, then re-run the curls in *Health checks* below.

---

**Task Monitor runbook:** Canonical workflow/QA/closure in [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md). Quick start: [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md). Current status/logs: **`npm run test:monitor`** → **38 passed**; state: `task-monitor-state.json`.
## Task Monitor signal

**Quick start:** See [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) for complete Task Monitor usage guide.

**Current status (2026-04-08):** **`npm run test:monitor`** → **38 passed**. **`npm run monitor:once`** → **1 succeeded** (~33s). State file: `task-monitor-state.json`. Completed sessions: `npm run monitor:completed:json` → **`merged`**.

**Configuration:** Timeouts and polling behavior documented in [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md). For detailed implementation history, see [`AGENTS.md`](AGENTS.md) and module DEV_STATE files.

**Authoritative human queue (if used):** [`work/STATE.md`](work/STATE.md).

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

See [System Startup Documentation](docs/SYSTEM_STARTUP.md#портовая-схема) for complete port mapping.

---

## Health checks

See [System Startup Documentation](docs/SYSTEM_STARTUP.md#health-checks) for complete health check procedures.

---

## Hygiene (stuck monitor / zombie stack)

1. **Processes:** [`kill-all.bat`](kill-all.bat) (repo root) or [`kill-all.ps1`](kill-all.ps1) / [`kill-all.sh`](kill-all.sh) — frees ports 5173 / 3000 / 11434 (and related).
2. **Session + async storage (no cache):** [`cleanup-session-state.js`](cleanup-session-state.js) — `npm run cleanup:state` or `node cleanup-session-state.js`. Wipes **all** of `a2a-client/storage/sessions/*`, hub `proxy_logs`, `ai-integration/storage/promises`, `a2a-server/storage/requests`. **No** age-based pruning for client sessions — only explicit cleanup; after that Task Monitor uses **one** Client API session per prompt (`taskSessions`) until done. **Does not** touch `ai-integration/storage/cache` (LLM disk cache) or npm/vite caches.
3. **Task Monitor pointer reset (optional):** `npm run monitor:reset` removes `task-monitor-state.json` if the daemon left a bad cursor.
4. **Session storage “engine check” (optional):** `npm run audit:session-storage` — writes deterministic `tasks/pending/session-storage-*.md` from `a2a-client/storage/sessions/` (always overwrites; no content-hash tracking); deletes per-session/cluster tasks when defects clear; each generated task includes **Task handling (generated)** (analyze before execution; delete the file after completion). **Full verify (regen + accuracy):** `npm run verify:audit-session-storage` (last step of `npm run test:before-start`). **CI-safe contract only:** `npm run verify:audit-session-storage-generator`.

Then `start-all.bat` and retry.

---

## Next (ordered)

1. **Broader offline:** `npm run test:direct-tests` — **33 passed** · `npm run cross-system:validate` — exit **0** (may print `EXECUTE_MESSAGE_ONLY` on stored hub/session files — informational) · **`npm run test:before-start`** — indirect + server units + **`test:monitor`** + **`verify:audit-session-storage`** (re-run `npm run test:monitor` / `test:before-start` to confirm; Vitest file count drifts) · `npm run test:gang` only when changing session/proxy contracts — **last stage** `validate:proba-servera` needs **ai-integration `:11434`** unless **`PROBA_SERVERA_SKIP_STACK_CHECK=1`**. **Proba `agent-tool-rag-search`:** gray-room merges include **`workbench.sections`** ([`interrupt-trace-contract.ts`](a2a-server/src/transform/interrupt-trace-contract.ts)); `ensureWorkbenchSectionsShape` coerces bad **`workbench` / `sections`** ([`dialog-request-processor.ts`](a2a-server/src/services/core/request-processor/dialog-request-processor.ts)).
2. **Sims:** `npm run sim:lint -- --all` · `npm run sim:validate -- --all` (from root) — **2026-04-08:** exit **0** — `sim:lint` / `sim:validate` JSON: all sims **`valid: true`**, **`warningCount: 0`** (same bar as **2026-04-07** run).
3. **Live stack / north star:** `start-all.bat` → `npm run monitor:once` (or one manual Client API session per [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)); set **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** when hub reports `promise_daemon_only` and the queue is drained.
4. **Test-architecture debt (fixtures / gray paths):** [`tasks/pending/test-architecture-proposals.md`](tasks/pending/test-architecture-proposals.md).

## Secondary / backlog (not blocking the north star)

- **Central orchestrator (parameterless):** [`docs/CENTRAL-ORCHESTRATOR.md`](docs/CENTRAL-ORCHESTRATOR.md) — **`npm run central`** → **`test:before-start`** + **`cross-system:validate`** + **`sim:check-md:fail`** + **`sim:lint:all`** + **`sim:validate --all`** + **`monitor:once`**; optional **`CENTRAL_SKIP_OFFLINE=1`** → **`monitor:once`** only; links [`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md).
- Offline gate (repo root): **`npm run test:before-start`** — ends with **`verify:audit-session-storage`**; last full pass **2026-04-08** (green).
- Roadmap: [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md)
- Schema debug entry: [`tests/direct-tests/README.md`](tests/direct-tests/README.md)
- Gray room offline check: `npm run verify:gray-room -- <snapshot.json>`
- Sims: `npm run sim:lint -- --all` · `npm run sim:validate -- --all`

**2026-04-08:** Docs tightened — indexed stack workflow normative on Task Monitor (`AGENTS.md`, `ONE-PIPELINE.md`, `tasks/README.md`, `MONITOR-QUICK-START.md`, `STACK-RUN.md`, `GLOSSARY.md`). **`npm run test:monitor`** → **38 passed** (re-verified; + central-orchestrator argv test; + sequential `createCompletionReport` guard). **`START-FULL-SPECTRUM.md`** Agent prompt updated: real **`hooks/task_monitor_issue.json`** (`errors[]`), **`task_completion_report.json`**, optional sample **`CURSOR_AGENT_SIGNAL`** (no in-repo ticker script), monitor-owned `/next` loop, IDE cadence + [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md), evidence before hook cleanup. Dead **`BREAK_STATE.md`** links removed from [`docs/PROMISE-RETRY-DIALOG.md`](docs/PROMISE-RETRY-DIALOG.md) and [`a2a-server/docs/GRAY-ROOM.md`](a2a-server/docs/GRAY-ROOM.md); **`test:before-start`** includes **`test:monitor`** (see *Next* §1 for current count); [`prompts-to-agent-mode/methodology-proposals-folder-missing.md`](prompts-to-agent-mode/methodology-proposals-folder-missing.md) no longer claims missing `tasks.md` is “done.”

Historical change log was pruned in favor of this goal-centric view; use `git log` and module DEV_STATE history for archaeology.
