# DEV_STATE - 2026-04-03 (Manual LLM Mode Added)

**Self-Upgrade:** Process of system self-improvement via daemon script `monitor-and-process-tasks.js` or manual API dialog with agent. See [GLOSSARY.md](GLOSSARY.md).

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**Agent-mode task prompts:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач* (S10–S12 partial, S14 partial, SYS backlog). Root file keeps narrative only; do not treat a single line here as the row-by-row status.

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**NEW: Manual LLM Mode ENABLED** — Operator-controlled LLM responses. `A2A_MANUAL_LLM_MODE=1` active in `.env.local`. See docs section at bottom.

**Recent (client UI):** `web/js/action-executor.js` — after `POST …/next` with `asyncPending`, starts session-scoped `startPromisePolling` so floating panels (5173) complete LLM/async steps instead of hanging on "Waiting…". Failed/ rejected acks clear `promisePending` and stop the loader. `window-events.js` — floating session panels no longer re-render the previous router/form while `promisePending` or `awaitingSessionVerify` (avoids double-submit and matches `LOADER-BEHAVIOR.md` sending state); `startLoader` on message/choice submit. `html-utils` / `render-form` still align on actionable form detection for fresh `execute`.

**Recent (simulations):** `SCHEMA.md` scope unified (sync vs `async/`); root `npm run sim:contract-report`; `async/promise-lifecycle/3` failed-terminal golden; `server-invoke-response-execute.schema.json` allows `execution.status` `failed` / `cancelled`. **`sync/agent`:** 15-step golden — усі типи `execute` для web agent у одному ланцюжку (без LLM у фікстурах), шляхи репо + workbench як `agent-coder-smart`. **`web-execute-dto`:** form + stripped `script`/`run-script` now get synthetic `Running script…`; form-only steps after auto script use `context.workbench.sections.autoScriptTrigger` → `message` + `attachments.runScriptId` (`script-agent-dialog/4` received). **`sim:validate`:** `--sim foo/bar` falls back to `simulations/sync/foo/bar`; `--all` lists numeric steps in numeric order.

**Pre-existing issues (known):**
- a2a-client test failures: 41 failed — 100% SDK config issues (not code)
- Orchestrator metrics: требует периодического обновления

## Completed work/tasks (2026-04-03):
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

`scripts/direct-tests/e2e-dialog-test.js`: added 8 server-only cases (invoke 400s, `/health` JSON, `/api/v1/requests/*` batch/single).

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
