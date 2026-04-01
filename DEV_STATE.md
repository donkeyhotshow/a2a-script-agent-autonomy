# DEV_STATE - 2026-04-01

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**System roadmap:** [`work/tasks/system-improvement-priorities.md`](work/tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Work queue (sync sims):** сделано: README/step-contract/form `description`/`agent/description.md` — см. `work/STATE.md` S7–S8, S13, S10 partial. Осталось: [`work/tasks/sync-substeps-not-discovered.md`](work/tasks/sync-substeps-not-discovered.md), [`work/tasks/sync-llm-snapshot-coverage.md`](work/tasks/sync-llm-snapshot-coverage.md), [`work/tasks/sync-workspace-tools-golden-map.md`](work/tasks/sync-workspace-tools-golden-map.md), опционально выравнивание роутера — [`work/tasks/sync-documentation-and-router-drift.md`](work/tasks/sync-documentation-and-router-drift.md).

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный. Недавно: root `GET /health` включает `mode: stateless`; sync `POST /invoke` дожимает очередь и возвращает `execute`/`context`; публичный DTO сессии отдаёт slim `context.execution` (seeds); `e2e-dialog-test` follow-up допускает dialog `{message,form}` на `execute`.

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
