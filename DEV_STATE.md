# DEV_STATE - 2026-04-01

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**System roadmap:** [`work/tasks/system-improvement-priorities.md`](work/tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Work queue (sync sims):** S7–S12 done (2026-04-01). Осталось:
- S10: router drift (optional)

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Recent (simulations):** `SCHEMA.md` scope unified (sync vs `async/`); root `npm run sim:contract-report`; `async/promise-lifecycle/3` failed-terminal golden; `server-invoke-response-execute.schema.json` allows `execution.status` `failed` / `cancelled`. **`sync/agent`:** 15-step golden — усі типи `execute` для web agent у одному ланцюжку (без LLM у фікстурах), шляхи репо + workbench як `agent-coder-smart`.

**Pre-existing issues (known):**
- a2a-client test failures: 41 failed — 100% SDK config issues (not code)
- Orchestrator metrics: требует периодического обновления

**Pending tasks:**
- S10: Router drift (optional)

## Completed work/tasks (2026-04-01):
- Analyze test failures: Classified 41 failed a2a-client tests as config/environment issues
- Orchestrator metrics tracking: Added cycle tracking in task-execute loop
- Sync documentation and router drift: Added description.md and updated router labels
- Sync LLM snapshot coverage: Documented in simulations/sync/README.md
- Sync README and CLI gap: Updated README to match SCHEMA.md
- Sync step-contract warnings: Fixed all 47 warnings via passthrough transforms
- Sync substeps not discovered: Extended scanner with --include-substeps flag
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
