# DEV_STATE - 2026-04-03 (Manual LLM Mode Added)

**Self-Upgrade:** Process of system self-improvement via daemon script `monitor-and-process-tasks.js` or manual API dialog with agent. See [GLOSSARY.md](GLOSSARY.md). In this repo, **“doing work” = executing concrete tasks _and_, when that queue is empty, driving prompts through the Client API / monitor until new concrete, testable tasks appear and are written back into `tasks/` + `DEV_STATE`**. **Operator order:** advance `tasks/` / `tasks/ide-prompts/` first; **before large session volume**, archive needed `a2a-client/storage/sessions/` ([`tasks/README.md`](tasks/README.md) step 2, *Session archival*); run `prompts-to-agent-mode/` (monitor / session API) after — policy only, not enforced in code ([`tasks/README.md`](tasks/README.md) *Self-Upgrade order*).

**Doc:** Schema-debug entry point: [`tests/direct-tests/README.md`](tests/direct-tests/README.md) (hub moved from `scripts/direct-tests/`; stub [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) redirects), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**Agent-mode task prompts (Task Monitor scans this folder only):** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **IDE/docs prompts (not in monitor scan):** [`tasks/ide-prompts/README.md`](tasks/ide-prompts/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач* (S10/S12 partial, S14 partial, S18 pending `@a2a-client` web/package, SYS backlog; S11 sync mirrors done). Root file keeps narrative only; do not treat a single line here as the row-by-row status.

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Sequence queue checks:** `npm run verify:gray-room -- <snapshot.json>` (or `--stdin`) — offline validation of `context.workbench.sections.sequence` / `predictions` / `history`; [`scripts/verify-gray-room-state.mjs`](scripts/verify-gray-room-state.mjs). See [`tasks/pending/gray-room-system-tasks.md`](tasks/pending/gray-room-system-tasks.md) task 8.

**NEW: Manual LLM Mode ENABLED** — Operator-controlled LLM responses. `A2A_MANUAL_LLM_MODE=1` active in `.env.local`. See docs section at bottom.

**Recent (operator / parity batch):** Task Monitor — after health check, if **`GET` AI hub `/health`** returns **`promise_daemon_only: true`**, prints promise-queue instructions and requires typing **`OK`** in an interactive TTY (`TASK_MONITOR_SKIP_PROMISE_GATE` / `CI` / non-TTY skips the prompt). See **`MONITOR-QUICK-START.md`** (*AI Integration promise queue*). Task Monitor (`tests/monitor-tasks/task-monitor-processing.js`) does **not** auto-submit router `form.choices` (manual `POST …/next` with `result.choice` only); still auto-fills idle **task** text forms via `/next` when applicable. `getSession(..., { includeContext: true })`; daemon active tasks carry `taskDescription` + bounded gate retries before “no result”. Client API: **`GET /api/a2a/models`** proxies `AI_HUB_URL` + `/api/tags`; Settings modal — default LLM for **new** sessions (`POST /sessions` `llmModel`); **`DELETE /sessions/:id` → 409** when **flat or project** storage shows in-flight promise (`getActiveAsyncWork` / `getProjectModeInflightPromise` over `.a2a/session-steps` + session snapshot). **`GET /sessions/:id`:** removed duplicate early handler so **one** path applies `includeContext` prod guard + flat `collectSessionMessagesFlat` hydration (monitor `includeContext=1` sees real `context.execution.form`). **compress_history / `resolveHistoryLength`:** regression test in `a2a-server/tests/normalization-history-length.test.ts`.

**Recent (client UI):** `web/js/action-executor.js` — after `POST …/next` with `asyncPending`, starts session-scoped `startPromisePolling` so floating panels (5173) complete LLM/async steps instead of hanging on "Waiting…". Failed/ rejected acks clear `promisePending` and stop the loader. `window-events.js` — floating session panels no longer re-render the previous router/form while `promisePending` or `awaitingSessionVerify` (avoids double-submit and matches `LOADER-BEHAVIOR.md` sending state); `startLoader` on message/choice submit. `html-utils` / `render-form` still align on actionable form detection for fresh `execute`. **NEW:** Client API `normalizeRouterStepSubmit` in `step-routes-router-flow.js` now auto-maps localized choice text (`"диалог"` → `choice: "dialog"`, `"агент"` → `choice: "agent"`, etc.) to prevent sticky router when users submit free-text that matches a router button id.

**Recent (direct-tests):** `start-all.bat` ends with `tests/direct-tests/run-post-start-all.ps1` (full stack checks + Vitest + node + PS1 flows; `A2A_POST_START_SKIP_HEAVY=1` skips long LLM steps). All runners and `e2e-dialog-test.js` / `gray-room-test.js` live under `tests/direct-tests/`; nested `.ps1` wrappers use `Join-Path $PSScriptRoot '..\..\..'` for repo root; `npm run test:direct-tests` = Vitest (`lib/a2a-schema-guards.mjs` + `router-choice-transition.test.mjs`: AJV `server-invoke-request.schema.json` + optional live sticky-router probe skipped unless `GET {A2A_SERVER_URL}/health` OK, default `http://127.0.0.1:3000`). CLI repro: `node tests/direct-tests/router-choice-transition-run.mjs` (keyword task → `fix-vue-imports` scripted choice, avoids LLM dialog pipeline). **`e2e-dialog-test.js`:** sticky-router cases include `routerAgentNoLoop*` and **`routerDialogNoLoop`** / **`routerDialogNoLoopTaskShorthand`** (after **dialog** choice); `routerWrongBeatMessage`. **`replay-session-from-disk.js`:** `--assert-no-sticky-router` exits non-zero if a router `choice` / choice-shorthand `/next` leaves `task`/`router` + `form.choices`. **Router→LLM pipeline choices** (`dialog`/`agent`/…) still go through `dialog-request-processor` — covered by Client API cases above; server router pre-apply fix remains in `action-request-processor.ts` `handleRouterChoice`.

**Recent (simulations):** `gen-sim-md-mirrors.mjs` covers `simulations/async/**` (`promise-lifecycle/1`–`3` mirrors); `sim:check-md --fail` clean. `SCHEMA.md` scope unified (sync vs `async/`); root `npm run sim:contract-report`; `async/promise-lifecycle/3` failed-terminal golden; `server-invoke-response-execute.schema.json` allows `execution.status` `failed` / `cancelled`. **`sync/agent`:** 15-step golden — усі типи `execute` для web agent у одному ланцюжку (без LLM у фікстурах), шляхи репо + workbench як `agent-coder-smart`. **`web-execute-dto`:** form + stripped `script`/`run-script` now get synthetic `Running script…`; form-only steps after auto script use `context.workbench.sections.autoScriptTrigger` → `message` + `attachments.runScriptId` (`script-agent-dialog/4` received). **`sim:validate`:** `--sim foo/bar` falls back to `simulations/sync/foo/bar`; `--all` lists numeric steps in numeric order. **Gray room goldens:** `sync/gray-room-clarify-dialog/1` (`clarify` + trace + `grayRoom` slot), `sync/gray-room-auto-read-file/1` (`auto_read_file` + `context.files`); server `mergeGrayRoomFinalizeInnerContext` fixes finalize dropping handler context. **Router descriptions:** sim audit — all `form.choices` / nested `result.form.choices` under `simulations/**` now have non-empty `description` (fix-vue / fix-laravel / fix-vue-imports-decline goldens); see [`tasks/sync-documentation-and-router-drift.md`](tasks/sync-documentation-and-router-drift.md). **S11:** full `simulations/sync/**` mirror sweep (`request.md`/`response.md` + `sim:check-md --fail`); [`scripts/gen-sim-md-mirrors.mjs`](scripts/gen-sim-md-mirrors.mjs). Earlier: `sync/dialog-message-only/1`, `sync/gray-room-hook/1`. **S10:** `tasks/sync-documentation-and-router-drift.md` — script step-1 router ids vs `router-static-choices.json`. **S12:** `agent-workspace-tools/description.md` — coverage note (13 keys, agent vs dialog). **S16:** Client API `sess_1775163935824` → 404 (storage pruned); see `tasks/pending/monitor-router-interaction-followup.md`. **`sync/agent-tool-loop/10`:** added missing `request.json` (execute-command result → `run-script` step); aligned `server-transforms-request.json` with `response.json`; `npm run sim:quality` clean.

**Pre-existing issues (known):**
- **S14:** stub [`tasks/script-dialog-agent-response-parity.md`](tasks/script-dialog-agent-response-parity.md) → [`tasks/archive/…`](tasks/archive/script-dialog-agent-response-parity.md) (fixes broken links from sims / prompts).
- a2a-client: `@a2a/rag` tests green — Vitest `fs/promises` hoisted mocks + BM25 `minScore` / corpus fixes (`packages/rag/tests/rag.test.js`).
- Orchestrator metrics: требует периодического обновления
- **Code/doc hierarchy audit (2026-04-03):** `methodology/` links → `archive/methodology/` (prompts fixed); `archive/methodology/` restored; `shared/README.md` tail corruption fixed. **S18 (partial):** `a2a-client` dev `vite.config.js` `root: web`, workspace `web` + `@a2a-client/vite-plugin`; physical move to `packages/web` still pending ([`tasks/pending/a2a-client-web-scoped-package.md`](tasks/pending/a2a-client-web-scoped-package.md)). **Optional:** `@a2a/execution` import tighten ([`tasks/pending/hierarchy-client-packages-import-policy.md`](tasks/pending/hierarchy-client-packages-import-policy.md)). **Done:** `queue.ts` → `request-processor.interfaces.js`; [`.cursor/rules/code-hierarchy.mdc`](.cursor/rules/code-hierarchy.mdc) documents NodeNext vs bundled UI.
- **Sequence / Gray Room (incremental):** [`sequence-workbench.ts`](a2a-server/src/services/core/request-processor/sequence-workbench.ts) + `step_complete` in [`action-request-processor.ts`](a2a-server/src/services/core/request-processor/action-request-processor.ts); [`docs/references/sequence-schema.json`](docs/references/sequence-schema.json). Full queue UI, Client API `sequence.json`, and `POST /api/v1/sequence` remain backlog ([`tasks/pending/gray-room-system-tasks.md`](tasks/pending/gray-room-system-tasks.md)).

## Newly Discovered System Flaws and Tasks (2026-04-03):
1. **Critical - Broken Import Path**: Fixed import in `a2a-server/src/types/queue.ts` - corrected from non-existent `../services/request-processor.interfaces.js` to `src/services/core/request-processor/request-processor.interfaces.ts`
2. **Test Coverage - 11 Excluded Test Files**: Review and address 11 excluded test files in vitest.config.ts (neurons-v2/**, rag-entity-integration.test.ts, auto-ai-index.test.ts, llm-client.service.test.ts, auth.middleware.test.ts, definitions-load.test.ts, etc.)
3. **Architecture - Gray Room Refinement**: Refine Gray Room implementation per work/STATE.md focus §3 - concept described as "very unthought-out"
4. **Architecture - Black Room / Gray Room Split**: Implement Black Room / Gray Room Split concept from ADR-0058 (Algorithm Mode for local Ollama execution vs Prompt Mode for paid API)
5. **Integration - Session 404 Cleanup**: Addressed session 404 for `sess_1775163935824` (expected after storage prune) and stale promise `prom_1775164401703_g29l65y66` - mitigation in place per monitor-router-interaction-followup.md
6. **Integration - Script/Dialog/Agent Parity**: Complete S14 work - achieve "one language of data" between script branch and agent/dialog, fix Web DTO contract gaps for `execute.script`
7. **Code Hierarchy - 2 Pending Fixes**: Address remaining hierarchy violations: fix `methodology/` root links, clarify client packages import policy (shared/README.md completed)
8. **Stability - compress_history Dual-Write Risk**: Fix gray-room writing to both root `history` and `context.history`, prefering root but not cleanly reconciled
9. **Stability - Per-Schema Transform Overrides**: Implement per-schema overrides for transforms beyond root `server-transforms-response.json`
10. **Queue System - 11 Pending Tasks**: Implement gray-room system action tasks from `tasks/pending/gray-room-system-tasks.md` (sequence schema, step_complete workflow, client/server coordination, simulation coverage, etc.)

## Proposed architecture (2026-04-03):
- **Black Room / Gray Room Split (NEW CONCEPT)**: Algorithm Mode for local Ollama execution
  - **Concept:** Split Gray Room into Prompt Mode (paid API) and Algorithm Mode (local Ollama)
  - **Prompt Mode:** Natural language instructions, strategy, reasoning → Paid API
  - **Algorithm Mode:** Deterministic execution via `algorithmId` → Local Ollama (free)
  - **Trigger:** `interrupt.reason: "algorithm_invoke"` with `algorithmId` and `data`
  - **Algorithm Numbers:** Pre-defined templates (ctx-gather-*, edit-apply-*, pattern-match-*, validate-*)
  - **Historical Context:** Session state passed to Ollama via system prompt
  - **Pre-Spins:** Multiple Gray Room spins before algorithm selection for complex cases
  - **ADR:** [`docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md`](docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md)
  - **Doc:** [`ai-integration/docs/BLACK-ROOM.md`](ai-integration/docs/BLACK-ROOM.md) (in ai-integration module)

## Completed work/tasks (2026-04-03):
- **Architecture Proposals Document**: Created `docs/ARCHITECTURE-IMPROVEMENTS-PROPOSALS.md` with 33 concrete improvement proposals across 7 categories:
  - Core Architecture (Multi-Agent, Black Room, Storage, Streaming)
  - Gray Room Evolution (Sequence Workbench, Predictive Steps, Visualization)
  - Developer Experience (Schema-first, Hot-reload, Debug overlay, SDK gen)
  - Performance (Connection pool, Deduplication, Delta updates, Parallel spins)
  - Integration (MCP adapter, GitHub Copilot, VS Code, Webhooks)
  - Observability (OpenTelemetry, Metrics, Session replay)
  - Security (Secret scanning, Audit export, RBAC)
  - Priority matrix with P1-P4 ranking and 4-phase roadmap
- **Documentation - Cross-Comparison Analysis (Expanded)**: Created comprehensive `docs/A2A-COMPARATIVE-ANALYSIS.md` (600+ lines) with:
  - Detailed architecture comparison across 8 frameworks
  - Code examples for each pattern (LangGraph, AutoGen, CrewAI, etc.)
  - Data flow diagrams for A2A vs alternatives
  - Deep dive: Session management, State management, Storage, LLM integration
  - Performance characteristics comparison
  - Security model analysis
  - Testing strategy comparison (Golden Simulations vs Unit Tests)
  - Migration paths with code examples
  - Protocol-level feature matrix (A2A vs Google A2A vs MCP vs OpenAI)
- **Manual LLM Mode (NEW)**: Operator-controlled LLM response submission
  - Env: `A2A_MANUAL_LLM_MODE=1` to enable
  - Server pauses before LLM call, stores prepared messages
  - Status: `waiting_manual_llm`
  - API: `GET /requests/manual-llm/pending`, `POST /requests/{id}/llm-response`
  - Files: `manual-llm.service.ts`, updates to `llm-orchestration.ts`, `dialog-request-processor.ts`, `requests.routes.ts`

## Completed work/tasks (2026-04-02):
- **Task Monitor System (COMPLETED)**: Fixed all 6 identified bugs in `monitor-and-process-tasks.js`:
  - Bug 1: Router choice parameter handling (`result.choice` format)
  - Bug 2: Double task submission prevention with fallback logic
  - Bug 3: Task extraction fallback improved with multi-level strategy
  - Bug 4: Poll loop promise state checking enhanced with clear logging
  - Bug 5: Hardbit state logging accuracy improved
  - Bug 6: Session verification with 404 handling and empty check
- **Daemon System (COMPLETED)**: Full daemon monitoring implementation:
  - Graceful shutdown with signal handling (SIGINT/SIGTERM)
  - Status reporting every 30 seconds (Active/Completed/Failed tasks)
  - Hook document creation for failed/timeout tasks
  - Non-blocking async task monitoring with concurrent processing
  - Health check system on startup
- **Testing (COMPLETED)**: Created comprehensive test suite:
  - 17 validation tests (100% passing)
  - All 6 bug fixes validated
  - All daemon features verified
  - Code quality checks passed
- **Documentation (COMPLETED)**:
  - Completion report: [COMPLETION-REPORT.md](./COMPLETION-REPORT.md)
  - Quick start guide: [MONITOR-QUICK-START.md](./MONITOR-QUICK-START.md)
  - Test file: [monitor-and-process-tasks.test.js](./monitor-and-process-tasks.test.js)
- Doc: operator methodology — **Ollama busy / do not abort inference**: [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) (*Ollama is generating — pause other work*), [`AGENTS.md`](AGENTS.md) (Debugging comment, Common Issues *Promise stays pending*, *Why iteration stops* table + stuck pipeline), [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) (Windows *Ollama busy*), [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) §3 trap 7 + Quick links; cross-links relative per file
- Doc: router alignment — `simulations/sync/agent/description.md` (step 1 vs `router-static-choices.json`); `AGENTS.md` router note + `tasks/sync-documentation-and-router-drift.md` status line
- Doc: S11 — `sync/dialog/1` request/response `.md` mirrors; `sync/script/description.md` sim:check-md note; refreshed `tasks/sync-llm-snapshot-coverage.md` + `work/STATE.md` S11; `sync/dialog/description.md` step-1 table accuracy
- S11: `sync/script` steps 2–3, 4/response, 5–10 — added `request.md`/`response.md` JSON fences ( `cd a2a-server && npm run sim:check-md -- --fail` ); `npm run sim:quality` clean
- S11/S12: `sync/dialog/2` request.md aligned with `dialog/1`/`script` headers; `dialog/3–4` top matter; `description.md` tree path `simulations/sync/dialog/` + notes for steps 1–2 vs 3–4; `agent-workspace-tools/description.md` — `dialog` row points at `sync/dialog/`; `npm run sim:check-md -- --fail` clean
- S11: `sync/dialog/2/response.md` — **fixed**: was invalid one-line array; now full JSON fence mirroring `response.json` (dialog `request` step); `sim:check-md -- --path ../simulations/sync/dialog/2` clean
- S11: `sync/invoke-form-confirmation/1` + `sync/invoke-simulation-record/1` — added `request.md` / `response.md` mirrors (`sim:check-md` clean per step)
- S11: `sync/orchestrator-dialog/1`–`4` — `request.md` / `response.md` mirrors; `sim:check-md -- --path ../simulations/sync/orchestrator-dialog` clean
- S11: `sync/resilience-contract/1`–`6` — `request.md` / `response.md` mirrors; `sim:check-md -- --path ../simulations/sync/resilience-contract` clean

- **AI Integration (COMPLETED)**: Z.AI стал default-провайдером, `/api/tags` отдаёт Z.AI-модели и подмешивает локальные Ollama-entry только при доступности сервера, `/health/ready` смотрит на default-провайдер, а конфиги/README/queue отражают новое поведение (`ai-integration/proxy/proxy_handler.py`, `ai-integration/proxy/health_routes.py`, `ai-integration/proxy/config.py`, `ai-integration/proxy/providers/config_loader.py`, `ai-integration/README.md`, `work/STATE.md`).

- **Self-Upgrade monitor run (2026-04-03)**: `node monitor-and-process-tasks.js` kicked off `ai-integration-configuration-system-plan.md` and, after the router form asked "What would you like me to do?", a manual `POST /sessions/sess_1775163935824/next` (see `curl.exe` log) pushed a real task message. The agent is now sitting on `promiseId prom_1775164401703_g29l65y66` with `asyncPending` still `true` (call `GET .../async` or `GET http://localhost:3000/api/v1/requests/.../result` to watch it). The failure hook document still documents the router prompt, and follow-up instructions live in `tasks/pending/monitor-router-interaction-followup.md` for whoever continues the run.

## Completed work/tasks (2026-04-01):
- Analyze test failures: Classified 41 failed a2a-client tests as config/environment issues
- Orchestrator metrics tracking: Added cycle tracking in task-execute loop
- Sync documentation and router drift: Added description.md and updated router labels
- Sync LLM snapshot coverage: Documented in simulations/sync/README.md
- Sync README and CLI gap: Updated README to match SCHEMA.md
- Sync step-contract warnings: Fixed all 47 warnings via passthrough transforms
- Sync substeps: `sim-validate --all` includes `N-sub-M` by default (`--skip-substeps` to exclude); fixed agent-auto-ai substep fixtures
- Sync workspace tools golden map: Added mapping to description.md

---

## Ports

| Port | Component |
|------|-----------|
| 11435 | Ollama |
| 11434 | AI Integration |
| 3000 | a2a-server |
| 5173 | Vite + Client API |

---

## Health Checks

```bash
curl http://localhost:3000/health
curl http://localhost:11434/health
curl http://localhost:11435/api/tags
curl http://localhost:5173/api/a2a/projects
```

---

## Subsystems

| Module | State |
|--------|-------|
| a2a-client | [DEV_STATE.md](a2a-client/DEV_STATE.md) |
| a2a-server | [DEV_STATE.md](a2a-server/DEV_STATE.md) |
| ai-integration | [DEV_STATE.md](ai-integration/DEV_STATE.md) |

---

## Testing

`tests/direct-tests/e2e-dialog-test.js`: added 8 server-only cases (invoke 400s, `/health` JSON, `/api/v1/requests/*` batch/single).

```bash
npm run sim:lint -- --all
npm run sim:validate -- --all
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## Manual LLM Mode

**Env:** `A2A_MANUAL_LLM_MODE=1` to enable (default: 0/off).

When enabled, server pauses before calling LLM and waits for operator to submit response manually. Useful for testing, debugging, using external LLM providers, or manually crafting responses.

**Flow:**
1. Request submitted via `POST /api/v1/invoke`
2. Server prepares request.md via transforms
3. Server stores prepared messages and sets status `waiting_manual_llm`
4. Response includes `execute.form` with instructions and message preview
5. Operator submits LLM response via `POST /api/v1/requests/{promiseId}/llm-response`
6. Server continues with gray room processing

**API Endpoints:**
```bash
# List all requests waiting for manual input
GET /api/v1/requests/manual-llm/pending

# Check request status (shows manualLlmMode: true when waiting)
GET /api/v1/requests/{promiseId}/result

# Submit manual LLM response
POST /api/v1/requests/{promiseId}/llm-response
Body: {"response": "Paste LLM response markdown here"}
```

**Implementation Files:**
- `a2a-server/src/services/core/request/manual-llm.service.ts` — core service
- `a2a-server/src/services/core/request-processor/llm-orchestration.ts` — manual mode hook
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts` — wait handling
- `a2a-server/src/routes/requests.routes.ts` — API endpoints

---

## Cross-Module: Multi-Provider Model Selection

**Status:** Done (API path) — Combined `GET /api/tags` with `provider`; invoke / context **`llmModel`** and Client API **`POST /sessions` { llmModel }** propagate to dialog + gray room (`resolveLlmModelFromContext`). ADR-0059. Optional: Web UI dropdown.

**Goal:** Enable model selection throughout the stack (Z.AI `glm-4.7-flash` vs Ollama `qwen3:8b`).

**Done:**
1. **a2a-server:** `context.llmModel` + top-level invoke `llmModel` → AI Hub `/api/chat` body `model`
2. **a2a-client:** Session create + `/next` merge `llmModel`; full UI picker optional
3. **Shared:** ADR-0059