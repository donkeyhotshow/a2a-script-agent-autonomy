# DEV_STATE - 2026-04-02 (Self-Upgrade in progress)

**Self-Upgrade:** Process of system self-improvement via daemon script `monitor-and-process-tasks.js` or manual API dialog with agent. See [GLOSSARY.md](GLOSSARY.md).

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**Agent-mode task prompts:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач* (S10–S12 partial, S14 partial, SYS backlog). Root file keeps narrative only; do not treat a single line here as the row-by-row status.

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Recent (simulations):** `SCHEMA.md` scope unified (sync vs `async/`); root `npm run sim:contract-report`; `async/promise-lifecycle/3` failed-terminal golden; `server-invoke-response-execute.schema.json` allows `execution.status` `failed` / `cancelled`. **`sync/agent`:** 15-step golden — усі типи `execute` для web agent у одному ланцюжку (без LLM у фікстурах), шляхи репо + workbench як `agent-coder-smart`.

**Pre-existing issues (known):**
- a2a-client test failures: 41 failed — 100% SDK config issues (not code)
- Orchestrator metrics: требует периодического обновления

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
