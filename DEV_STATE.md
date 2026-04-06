# DEV_STATE - 2026-04-03

**Self-Upgrade:** Process of system self-improvement via daemon script `monitor-and-process-tasks.js` or manual API dialog with agent. See [GLOSSARY.md](GLOSSARY.md). In this repo, **“doing work” = executing concrete tasks _and_, when that queue is empty, driving prompts through the Client API / monitor until new concrete, testable tasks appear and are written back into `tasks/` + `DEV_STATE`**. **Operator order:** advance `tasks/` / `tasks/ide-prompts/` first; **before large session volume**, archive needed `a2a-client/storage/sessions/` ([`tasks/README.md`](tasks/README.md) step 2, *Session archival*); run `prompts-to-agent-mode/` (monitor / session API) after — policy only, not enforced in code ([`tasks/README.md`](tasks/README.md) *Self-Upgrade order*).

**Doc:** Schema-debug entry point: [`tests/direct-tests/README.md`](tests/direct-tests/README.md) (hub moved from `scripts/direct-tests/`; stub [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) redirects), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md). **Stack triage (integration-centric; Ollama only via hub):** [`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md).

**Agent-mode task prompts (Task Monitor scans this folder only):** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **IDE/docs prompts (not in monitor scan):** [`tasks/ide-prompts/README.md`](tasks/ide-prompts/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач*. Root file keeps narrative only; do not treat a single line here as the row-by-row status.

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Sequence queue checks:** `npm run verify:gray-room -- <snapshot.json>` (or `--stdin`) — offline validation of `context.workbench.sections.sequence` / `predictions` / `history`; [`tests/direct-tests/validators/verify-gray-room-state.mjs`](tests/direct-tests/validators/verify-gray-room-state.mjs).

**Recent (operator / parity batch):** Task Monitor with promise queue support; Client API multi-provider LLM routing; session storage improvements.

**2026-04-07:** Proba + hub L3 cache: [`tests/proba-servera/LLM-CACHE-PATHS.md`](tests/proba-servera/LLM-CACHE-PATHS.md), `PROBA_WARM_CACHE` + `LLM_DISK_CACHE_LOG` (see [`tests/proba-servera/README.md`](tests/proba-servera/README.md)); ai-integration `normalize_body_for_cache` message/options normalization — [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md).

**2026-04-06:** `AGENTS.md` — Client API table: **`GET …/messages`** row + **`GET …/sessions/{id}`** includeContext note; standalone SDK bullet links **OPERATOR-CURL** § *GET session JSON shape* for `unwrap` / `includeContext` / `afterSeq`.

**2026-04-06 (human-review follow-up):** [`docs/HUMAN-REVIEW-FINDINGS.md`](docs/HUMAN-REVIEW-FINDINGS.md) snapshot **20/20 pass**; [`docs/AGENT-DIALOG-API-STATE.md`](docs/AGENT-DIALOG-API-STATE.md) **Open risks** table aligned with implemented behavior; `toPublicNextResponse` falls back through **`buildWebExecute`** when projected `session.execute` is missing or empty; SDK **`client-api-envelope.test.ts`** removed (Vitest 2 “no suite” in `packages/sdk`) — coverage in **`a2a-client/tests/unit/client-api-envelope-shared.test.js`**.

**2026-02-09:** Async-only **follow-up docs:** [`SESSION-SYSTEMS-OVERVIEW.md`](docs/SESSION-SYSTEMS-OVERVIEW.md) (invoke handler wording, E2E smoke → `e2e-dialog-test.js` / `agent-dialog-runner.mjs`), [`AGENT-DIALOG-API-STATE.md`](docs/AGENT-DIALOG-API-STATE.md) changelog + Purple alert row (agent tool chain + **`promiseId`**); comments in `agent-rag-chain.js` / SDK `agent-rag-chain.ts`; e2e-dialog JSDoc.

**2026-04-06:** [`docs/AGENT-DIALOG-API-STATE.md`](docs/AGENT-DIALOG-API-STATE.md) — **Purple alert** + **code:** `POST /api/v1/invoke` is **async-only** (dropped `sync` / `DEFAULT_SYNC_MODE` / `runSyncInvokeChain`); Client **`next-invoke-pipeline`** does not send `sync`; [`AGENTS.md`](AGENTS.md), [`server-invoke-request.schema.json`](docs/new-request-flow/json-schemas/server-invoke-request.schema.json), [`tests/proba-servera/validate.mts`](tests/proba-servera/validate.mts), [`e2e-dialog-test.js`](tests/direct-tests/e2e-dialog-test.js) updated.

**2026-04-06 (purple alert doc sweep):** Stale **sync invoke** references removed from [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) (curl + bullets), [`a2a-server/README.md`](a2a-server/README.md), [`PAPA-MAMA.md`](PAPA-MAMA.md), [`docs/PROMISE-RETRY-DIALOG.md`](docs/PROMISE-RETRY-DIALOG.md), [`a2a-server/docs/detailed-architecture.md`](a2a-server/docs/detailed-architecture.md); `claimPendingByPromiseId` JSDoc; dropped no-op `DEFAULT_SYNC_MODE` cleanup in server integration tests.

**2026-04-06:** Fixed cognition injection in dialog request processor by adding feature flag `COGNITION_INJECTION_ENABLED` to control when priors are loaded from LessonStore and PatternStore. Previously, stubs were used that never loaded real data. Now the feature can be enabled/disabled via environment variable.

**2026-04-06 (purple alert sweep 2):** Retired glossary **“Sync Mode”** → **sync golden** + async-only note in [`GLOSSARY.md`](GLOSSARY.md) / [`AGENTS.md`](AGENTS.md); [`tests/direct-tests/README.md`](tests/direct-tests/README.md) merge flag wording; [`docs/new-request-flow/PROTOCOLS/sessions/README.md`](docs/new-request-flow/PROTOCOLS/sessions/README.md) session example heading; sim mirror MD [`simulations/sync/task-decomposition/7/`](simulations/sync/task-decomposition/7/); comments in [`session-routes-shared.ts`](a2a-client/packages/sdk/src/server/lib/session-routes-shared.ts), [`step-storage.ts`](a2a-client/packages/sdk/src/server/services/step-storage.ts), [`agent-rag-chain.js`](a2a-client/packages/vite-plugin/routes/utils/agent-rag-chain.js), [`request-processor.service.ts`](a2a-server/src/services/core/request-processor/request-processor.service.ts).
**2026-04-06 (Brown alert):** Removed the root `debug.log` artifact and confirmed the repo already ignores `*.log` entries so runtime traces stay off-tree while `logs/archive/` captures any human-needed evidence.

**Fixed:** Added check in dialog request processor to return initial form directly from request transform for dialog schema without user input, before attempting LLM call.

**Fixed (artifact paths):** Windows `scripts\start-*.bat` and `start-all.bat` / `kill-all.bat` now `cd` to repo root via `%~dp0` so logs land in `a2a-client/logs`, `a2a-server/logs` (not nested `a2a-client/a2a-client/...`). `start-all.sh` / `start-all.ps1` anchor to script directory. AI Integration: LLM `POST` traces live under `ai-integration/proxy_logs/promises/<id>/`; legacy `proxy_logs/requests/request_*` remains for non-promise paths only. `cleanup.py` prunes both `requests/` and legacy top-level `request_*`.

**Fixed:** Router no longer overwrites `execution.action` when session created with `mode: "agent"`. `isTaskRequest()` in `base-processor.ts` now checks if `execution.action` is already an LLM pipeline action and returns `false` to prevent forced routing. Added direct LLM pipeline handling in `action-request-processor.ts` for seeded agent mode.

**Fixed (2026-04-05):** Dialog history accumulation in client. `mergeDialogHistoryForInvoke` in `builders.js` was replacing the last user message instead of appending when text differed. Changed to `h.push()` to properly accumulate history.

**Fixed (2026-04-05):** Step data persistence in client. `saveStepData` in `step-routes-dialog-flow.js` was using stale `mergedContext` instead of updated `savedContext` after server response. This caused all steps to have the same initial form data instead of actual server responses. Changed to use `savedContext` (the context returned by `updateSessionAfterResponse`). **Verified:** Live session test shows step 4 correctly has `execution.action: "dialog"` and accumulated history.

**Added (2026-04-05):** Proba-servera test coverage expanded. Added 11 new tests aligned with `simulations/sync/*` goldens:
- Agent tools (9): `agent-tool-read-file`, `agent-tool-write-file`, `agent-tool-rag-search`, `agent-tool-list-directory`, `agent-tool-grep-search`, `agent-tool-execute-command`, `agent-tool-file-exists`, `agent-tool-edit-patch`, `agent-tool-run-script`
- Dialog variants (2): `dialog-interrupt`, `dialog-message-only`
- Workbench (1): `agent-workspace-chain`
Total: 18/18 tests passing.

**Fixed (2026-04-05):** Execute message format fixes per schema:
- `router-choice-handler.ts`: Changed fallback `execute.message` to `execute.form` (compliance with schema - no message-only execute)
- `step-result-handler.ts`: Same fix - message-only → form
- `simulations/sync/sequence-workbench-min/1/`: Added missing `server-transforms-request.json`, updated `execute.message` → `execute.form` in response.json and received.json
- MD/JSON drift: Fixed 13 mismatches via `sim:check-md:fix`

**Fixed (2026-04-05):** Unit tests aligned with new behavior:
- `merge-dialog-history.test.js`: Updated to expect history accumulation instead of replacement (matches dialog fix)
- `client-api-promise-helpers.test.mjs`: Same updates for history accumulation
- `rag.test.js`: Added `useTFIDF` field to `RAGSearcher` class and `index` getter/setter for proper test mocking
- `index-manager.ts`: Added `index` setter for test support
- `papa-mama-gang.mjs`: Fixed sim:validate call to include `--all` flag

**Fixed (router beat B, 2026-04-03):** `determineRequestType` routes `execution.step === 'router'` + pipeline `result.choice` to **action** first so `handleRouterChoice` patches `execution` before dialog. Dialog processor failed outcomes now include normalized `context`; `request.service` `updateStatus` merges `result.context` on **failed** as well as **completed** (sticky `task`/`router` after LLM errors).

**Papa–Mama test matrix (2026-04-04):** Added realistic Mama fixture `sim-agent-vertical.spec.json` using `simulations/sync/agent/*` goldens; updated `run-all.mjs` (7/7 green). Documented Papa hardening (`--only`, `E2E_DIRECT_LOW_LLM`, merge flags) in `tests/direct-tests/README.md`. Failure class matrix documented in `tests/indirect-tests/README.md`. Proposals doc: [`tasks/pending/test-architecture-proposals.md`](tasks/pending/test-architecture-proposals.md) — глубокий анализ выполнен:
- Gray room: 3/6 handlers имеют fixtures (missing: compress_history, clarify, algorithm_invoke chains)
- Execute shape: 0 violations в 29 категориях simulations (сканер `audit-execute-shape-explore.mjs`)
- Runtime validators: 5+ валидаторов в `transform-execute-validator.ts` (dialog/agent/result/router)
- Sticky router: логика переходов документирована (valid vs STICKY_ROUTER/ACTION_JUMP)
- Идеальные варианты: A (Unified Auditor), B (Live Drift Detector), C (Simulation-First)
- **Papa & Mama Gang:** Создан единый оркестратор `tests/papa-mama-gang.mjs` (`npm run test:gang`), который последовательно запускает смену Мамы (оффлайн проверки, юнит-тесты сервера и клиента, симуляции) и смену Папы (E2E на живом стеке). Документировано в `PAPA-MAMA.md`. Добавлена философия "Zero Trust": если скрипт зелёный, значит мы плохо искали. Новые проблемы должны вшиваться в скрипт (мы злопамятные).

**Extended deep search findings (2026-04-04):**
- Validator gaps: `TOP_LEVEL_MESSAGE_WITH_TOOL`, `DUPLICATE_TOP_AND_EXECUTE_MESSAGE`, `EXECUTE_MESSAGE_ONLY` — есть в `check-llm-execute-shape.mjs`, но **не в** `transform-execute-validator.ts` (runtime не проверяет)
- Form-choice pipeline gap: `form-choice-pipeline.ts:33` валидирует `formProcessResult`, но не `execute` shape
- Strict mode policy: `A2A_TRANSFORM_STRICT` работает, но нет documented policy когда включать (CI vs dev)
- Black Room: `black-room-orchestrator.ts` не имеет unit/integration тестов, нет Mama fixtures для `algorithm_invoke`
- Client API: `step-routes-dialog-flow.js:435` возвращает 502 при parse error, но нет тестов на recovery (stuck step)
- New proposals added: #8 (missing validators), #9 (form-choice validation), #10 (strict mode policy), #11 (Black Room tests), #12 (Client API recovery)

**Recent (client UI):** Async polling improvements; sticky router prevention with localized text mapping.

**Recent (direct-tests):** Post-start checks; sticky router testing improvements; router choice validation; `validators/lib/check-llm-execute-shape.mjs` shared by `scan-promise-bodies` + `scan-session-responses`; root `npm run sim:check-md` delegates to a2a-server MD/JSON drift check.

**Recent (simulations):** MD mirrors for async sims; unified SCHEMA.md scope; gray room goldens; router descriptions audit; S11 mirror sweep completed.

**Recent (docs):** Completed task notes from `tasks/completed/` folded into `docs/` (see `docs/new-request-flow/SIMULATION-VALIDATION.md` *Sync golden conventions*, `docs/ARCHITECTURE-IMPROVEMENTS-PROPOSALS.md` Category D, `docs/agent-iteration-traps.md` *Task Monitor*, `docs/WORKFLOW.md` *Task Monitor metrics*, `docs/SESSION-SYSTEMS-OVERVIEW.md` *Execution mode parity*, `docs/adr/ADR-0059` Related); `tasks/completed/*.md` removed.

**Pre-existing issues (known):**
- a2a-client: `@a2a/rag` tests green — Vitest `fs/promises` hoisted mocks + BM25 `minScore` / corpus fixes (`packages/rag/tests/rag.test.js`).
- Orchestrator metrics: requires periodic updates
- **S18 (partial):** `a2a-client` dev `vite.config.js` `root: web`, workspace `web` + `@a2a-client/vite-plugin`; physical move to `packages/web` still pending ([`tasks/pending/a2a-client-web-scoped-package.md`](tasks/pending/a2a-client-web-scoped-package.md)).

## System Backlog:
- **Architecture - Gray Room Refinement**: Refine Gray Room implementation per work/STATE.md focus §3
- **Architecture - Black Room / Gray Room Split**: Implement Black Room / Gray Room Split concept from ADR-0058
- **S18 (partial):** Complete `@a2a-client` web + vite-plugin scoped package migration

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

## Cross-Module: Multi-Provider Model Selection

**Status:** Done (API path) — Combined `GET /api/tags` with `provider`; invoke / context **`llmModel`** and Client API **`POST /sessions` { llmModel }** propagate to dialog + gray room (`resolveLlmModelFromContext`). ADR-0059. Optional: Web UI dropdown.

**Goal:** Enable model selection throughout the stack (Z.AI `glm-4.7-flash` vs Ollama `qwen3:8b`).

**Done:**
1. **a2a-server:** `context.llmModel` + top-level invoke `llmModel` → AI Hub `/api/chat` body `model`
2. **a2a-client:** Session create + `/next` merge `llmModel`; full UI picker optional
3. **Shared:** ADR-0059
