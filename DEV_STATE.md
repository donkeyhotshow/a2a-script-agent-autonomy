<<<<<<< HEAD
# DEV_STATE - 2026-04-02

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**Agent-mode task prompts:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач* (S10–S12 partial, S14 partial, SYS backlog). Root file keeps narrative only; do not treat a single line here as the row-by-row status.
=======
### Simulation Tests Fix (2026-03-29 03:16-03:18)
>>>>>>> 4800bb41 (feat: sync additional ADRs for aleon10)

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Recent (simulations):** `SCHEMA.md` scope unified (sync vs `async/`); root `npm run sim:contract-report`; `async/promise-lifecycle/3` failed-terminal golden; `server-invoke-response-execute.schema.json` allows `execution.status` `failed` / `cancelled`. **`sync/agent`:** 15-step golden — усі типи `execute` для web agent у одному ланцюжку (без LLM у фікстурах), шляхи репо + workbench як `agent-coder-smart`.

**Pre-existing issues (known):**
- a2a-client test failures: 41 failed — 100% SDK config issues (not code)
- Orchestrator metrics: требует периодического обновления

## Completed work/tasks (2026-04-02):
- Doc: router alignment — `simulations/sync/agent/description.md` (step 1 vs `router-static-choices.json`); `AGENTS.md` router note + `tasks/sync-documentation-and-router-drift.md` status line
- Doc: S11 — `sync/dialog/1` request/response `.md` mirrors; `sync/script/description.md` sim:check-md note; refreshed `tasks/sync-llm-snapshot-coverage.md` + `work/STATE.md` S11; `sync/dialog/description.md` step-1 table accuracy
- S11: `sync/script` steps 2–3, 4/response, 5–10 — added `request.md`/`response.md` JSON fences ( `cd a2a-server && npm run sim:check-md -- --fail` ); `npm run sim:quality` clean
- S11/S12: `sync/dialog/2` request.md aligned with `dialog/1`/`script` headers; `dialog/3–4` top matter; `description.md` tree path `simulations/sync/dialog/` + notes for steps 1–2 vs 3–4; `agent-workspace-tools/description.md` — `dialog` row points at `sync/dialog/`; `npm run sim:check-md -- --fail` clean

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
