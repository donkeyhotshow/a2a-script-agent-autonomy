# DEV_STATE — 2026-04-08

**Evidence (2026-04-15, web-dialog smoke + UI build):** `pnpm run build` in `a2a-client` (Vite `vite.config.prod.ts`) → **exit 0** (~600ms). Добавлены `scripts/testing/web-dialog-smoke.bat` (синхронный `call start-all.bat`, ожидание `11434` LISTENING → `GET /health`, проверка `simulation_enabled`, диагностика: `netstat`, пробы `localhost`/`127.0.0.1`, хвосты `a2a-ai-hub/logs/ai-integration.log` и `a2a-ai-hub/logs/a2a-ai-hub.log`), `docs/runbook-web-dialog-smoke.md`, `a2a-ai-hub/scripts/run-uvicorn-logged.cmd`, правки `scripts/scripts/start-ai-integration.bat` (recycle порта при `SIMULATION_ENABLED=true`, fallback `kill-all.bat`, прерывание при ошибке recycle, старт uvicorn через wrapper с логом). **Прогон smoke на агентском хосте:** стек после recycle не поднялся стабильно — `netstat` показывал `LISTENING :11434` с PID **18220**, при этом `tasklist`/`Get-Process` для этого PID процесс не находили; `kill-all.bat`/`taskkill /F /T` не освобождали порт в этой среде → **FAIL** до полного E2E; зафиксировано как блокер среды, на реальной машине оператора требуется проверить владельца сокета и права.

**Evidence (2026-04-14):** `a2a-client`: `npm test` → **38 files, 341 tests, exit 0**. Root: `npm run central:offline` → **exit 0** (indirect tests, server unit, monitor infra, cross-system validate, sim lint/validate). **Launch-fix pass:** workspace `@a2a/fs-utils` + ESM `execution/fs-utils`; companion `.js` for execution scan modules + `rag/embedding-client.js`; `shared/session-stage-derive` matches Client API stage tests; monitor: log tail age filter (`TASK_MONITOR_LOG_SCAN_MAX_AGE_MINUTES`) + Client API health tries `127.0.0.1` / `localhost` / `[::1]`; broken `runbook/docs/OPERATOR-CURL.md` links pointed at `docs/OPERATOR-CURL.md`. Smoke: `npm run monitor:once` → **exit 0**; `node` ESM import `@a2a-client/execution/fs-utils` / `@a2a-client/embedding` → OK.

**Operator UI (2026-04-14):** Implemented Both-mode Operator UI shell using existing `a2a-client/packages/web` (vanilla JS) aligned with [`a2a-client/docs/WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md): session-scoped polling (`GET /api/a2a/sessions/:id/async`) and router two-beats (`result.message` → `execute.form.choices` → `result.choice`). **Build evidence:** `pnpm --prefix a2a-client run build` → **exit 0**, output to `a2a-client/public/ui` (served in prod by a2a-server at `/ui/*`). Note: `a2a-server` root `tsc` currently reports many pre-existing type errors in packages unrelated to the UI wiring, so verification for this change relies on `a2a-client` build + runtime smoke (below).

**Operator UI smoke (2026-04-14):** Dev server started on **`http://localhost:5174/`** (5173 was in use). `POST /api/a2a/sessions` succeeded (session `sess_1776159204853`). `POST /api/a2a/sessions/:id/next` with `{ result: { message: "покажи варианты" } }` returned ack `{ success:true, step:2, asyncPending:true }` and server-side promiseId `prom_a257d18e-7e43-4ff4-aefa-4c37e39b1ad4`. Polling verified: `GET /api/a2a/sessions/:id` → `asyncPending=true`, `stage=awaiting-async`; `GET /api/a2a/sessions/:id/async` → `{ status:"pending", asyncPending:true }`. Upstream completion/choices were not observed in this environment because the server promise stayed `pending` (likely AI hub not running), so the choices-beat UI was not end-to-end exercised today.

**Operator UI protocol hardening (2026-04-14):** UI updated to strictly follow `router-submit` semantics: when the server issues a `task` input field, the first beat submits **top-level** `{ task: "..." }` (not nested in `result`); choice beat submits `{ result: { choice: "..." } }`. Polling gained an early-stop hook when `/async` surfaces an actionable `execute.form` (choices/input/textarea), plus a stable UX status counter (`Processing… (N)`). Build evidence repeated: `pnpm --prefix a2a-client run build` → **exit 0**.

**Stack E2E attempt (2026-04-14):** `start-all.bat` brought up `web-ui :5173`, `client-api :3001`, `a2a-server :3000`, `a2a-ai-hub :11434`. Hub health: `local_llm_upstream_available=false` (no upstream on `:11435`), `promise_daemon_only=true`. Result: dialog requests proceed to `asyncPending=true` but remain `status=pending` on `/async` (no terminal) until an upstream LLM is available. This is an environment constraint, not a UI contract break.

**Live stack attempt (2026-04-14):** `start-all.bat` paths fixed to `scripts\scripts\start-*.bat`; root `node_modules` no longer deleted on start (required for `npm run monitor:once`). Use root `kill-all.bat` for port cleanup. **ai-hub:** `http://127.0.0.1:11434/health` → **200** after `providers.json` copy from example. **`a2a-server` `dev:no-auth`:** import graph + **server-config** env/Zod alignment fixed; **`GET http://127.0.0.1:3000/health`** → **200** when process listens (see `tasks/pending/a2a-server-dev-entry-import-paths.md`). **`npm run monitor:once`:** **exit 0** after root `npm install` (postinstall fixed for Windows); initial health may still warn if Client API `/projects` or hub/LLM are down.

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

**Import migration P0 (2026-04-13, `a2a-server`):** Hub promise pipeline moved into `@a2a/server-utils` (no `packages/lib` → `daemon` typecheck edge); daemon wraps poll ticks for A2A context; `server-request` re-exports errors from `@a2a/server-utils`; canonical `npm run build` uses `scripts/build-workspaces-ordered.mjs` through `@a2a/server-gray-room`. Evidence: that command **exit 0** on agent host. Journal: [`docs/import-migration-board.md`](import-migration-board.md).

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
| AI hub + promises | [a2a-ai-hub/DEV_STATE.md](a2a-ai-hub/DEV_STATE.md) |

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
2. **Session + async storage (no cache):** [`cleanup-session-state.js`](cleanup-session-state.js) — `npm run cleanup:state` or `node cleanup-session-state.js`. Wipes **all** of `a2a-client/storage/sessions/*`, hub `proxy_logs`, `a2a-ai-hub/storage/promises`, `a2a-server/storage/requests`. **No** age-based pruning for client sessions — only explicit cleanup; after that Task Monitor uses **one** Client API session per prompt (`taskSessions`) until done. **Does not** touch `a2a-ai-hub/storage/cache` (LLM disk cache) or npm/vite caches.
3. **Task Monitor pointer reset (optional):** `npm run monitor:reset` removes `task-monitor-state.json` if the daemon left a bad cursor.
4. **Session storage “engine check” (optional):** `npm run audit:session-storage` — writes deterministic `tasks/pending/session-storage-*.md` from `a2a-client/storage/sessions/` (always overwrites; no content-hash tracking); deletes per-session/cluster tasks when defects clear; each generated task includes **Task handling (generated)** (analyze before execution; delete the file after completion). **Full verify (regen + accuracy):** `npm run verify:audit-session-storage` (last step of `npm run test:before-start`). **CI-safe contract only:** `npm run verify:audit-session-storage-generator`.

Then `start-all.bat` and retry.

---

## Next (ordered)

1. **Broader offline:** `npm run test:direct-tests` — **33 passed** · `npm run cross-system:validate` — exit **0** (may print `EXECUTE_MESSAGE_ONLY` on stored hub/session files — informational) · **`npm run test:before-start`** — indirect + server units + **`test:monitor`** + **`verify:audit-session-storage`** (re-run `npm run test:monitor` / `test:before-start` to confirm; Vitest file count drifts) · `npm run test:gang` only when changing session/proxy contracts — **last stage** `validate:proba-servera` needs **a2a-ai-hub `:11434`** unless **`PROBA_SERVERA_SKIP_STACK_CHECK=1`**. **Proba `agent-tool-rag-search`:** gray-room merges include **`workbench.sections`** ([`interrupt-trace-contract.ts`](a2a-server/src/transform/interrupt-trace-contract.ts)); `ensureWorkbenchSectionsShape` coerces bad **`workbench` / `sections`** ([`dialog-request-processor.ts`](a2a-server/src/services/core/request-processor/dialog-request-processor.ts)).
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

---

## 2026-04-13 — Topology / NodeNext stabilization (no directory moves)

**Decision:** freeze structural moves; fix topology ambiguity first.

**Evidence (inbound imports):**
- `@a2a/config` consumers found in `a2a-server/packages/server/**` and `a2a-server/packages/services/**`
- `@a2a/server-protocol` consumers found in `a2a-server/packages/server/**` and `a2a-server/packages/actions/**`

**Fixes (topology ambiguity removed):**
- Duplicate workspace package name **`@a2a/config`** resolved by:
  - keeping canonical in `a2a-server/packages/server-config` (real usage + workspace)
  - renaming legacy `a2a-server/packages/config` → `@a2a/config-legacy`
  - exporting router/static + health API from canonical `@a2a/config`
- Duplicate workspace package name **`@a2a/server-protocol`** resolved by:
  - keeping canonical in `a2a-server/packages/server-protocol` (workspace)
  - renaming legacy `a2a-server/packages/protocol` → `@a2a/server-protocol-legacy`

**NodeNext/ESM import rule enforced:** `.js` specifiers retained (NodeNext).

**Runtime checks:**
- `npm --prefix a2a-server run build --workspace=@a2a/server-utils` → **exit 0**
- `npm --prefix a2a-server run build` → **still failing** (next error class: workspace boundary/tsconfig rootDir in `@a2a/server-daemon`, plus protocol/type mismatches in `actions` and missing modules in `gray-room`).

**Next step:** normalize workspace package boundaries (`package.json` + `exports` + tsconfig references) for `actions/daemon/gray-room/...` and re-run typecheck/build after each wave.

Historical change log was pruned in favor of this goal-centric view; use `git log` and module DEV_STATE history for archaeology.

## 2026-04-14 — Offline gate `central:offline` green (path + sim toolchain)

**Evidence:** repo root `npm run central:offline` → **exit 0** (indirect 14/14, server Vitest 87, monitor infra 38, audit-session-storage chain ok, cross-system ok, sim:check-md ok, sim:lint 36 roots, sim:validate **174** step/substep targets).

**Fixes in this iteration:**
- `a2a-server/shared/internal-client-action-keys.mjs` re-export → `../../a2a-client/packages/shared/internal-client-action-keys.mjs`.
- `sim-lint/registry.ts`: `isSimulationRoot` filter (skip `tests/integration/simulations/scripts/*` tooling dirs mistaken for goldens).
- `sim-validate`: `SCHEMAS_DIR` → `docs/PROTOCOL/json-schemas`; discovery via `getAllSimulations` + `expandSimulationValidateTargets` (numbered steps + `N-sub-M`); interrupt substeps require only `request`/`response` (+ optional client/received/transforms).
- `sim-validate/reporters.ts`: `--sim` paths under `integration/…` resolve to `tests/integration/simulations`.

**Note:** `cross-system:validate` still logs 4× `EXECUTE_MESSAGE_ONLY` on stored sessions (informational); gate remains OK.

**2026-04-14 (later) — client workspace + launchers:** `@a2a/rag` renamed from `@a2a-client/rag`, exports point at `src/` (no missing `dist/`). `@a2a-client/core` `a2a-invoke-builders.js` aligned with shared (sanitize returns clones — fixes undefined `context` / `a2aTraceId`). SDK `context-invoke-patch.ts` import path corrected. Added repo-root `scripts/start-web-ui.bat` and `scripts/start-client-api.bat` (so `a2a-client` `npm run dev` and SDK `dev` resolve). Evidence: `npm --prefix a2a-client run test:web` → **52 tests passed**; `npm run central:offline` → **exit 0**.
