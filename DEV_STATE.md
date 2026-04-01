# DEV_STATE - 2026-04-01

**Doc:** Schema-debug entry point: [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

Current system state: **Stack готов** - все сервисы работают, задач нет.

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

```bash
npm run sim:lint -- --all
npm run sim:validate -- --all
cd a2a-server && npm run test
cd a2a-client && npm test
```
