# DEV_STATE - a2a-server (2026-03-27)

Текущее состояние подсистемы a2a-server.

---

## Текущая архитектура

**Stateless server** - не хранит сессии, только обрабатывает запросы:
- Контекст передаётся в каждом запросе
- Session storage в Client API
- Keyword-based routing (без LLM для роутинга)

---

## Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | Liveness |
| GET | `/api/v1/health` | API health |
| POST | `/api/v1/invoke` | Main invoke |
| GET | `/api/v1/requests/:promiseId/status` | Promise status |
| GET | `/api/v1/requests/:promiseId/result` | Promise result |
| POST | `/api/a2a/sessions/:sessionId/next` | Session bridge |

---

## Request Processors

| Component | Role |
|-----------|------|
| `request-processor.service` | Выбор процессора по action/task |
| `dialog-request-processor` | Dialog flow с LLM |
| `action-request-processor` | Tool/action flow |
| `form-request-processor` | Form/choice handling |
| `simulation-request-processor` | Simulation/golden flow |

---

## Protocol Contract

### Execute (action-key shape)

```json
{ "execute": { "read-file": { "path": "README.md" } } }
```

### Result (action-key shape)

```json
{ "result": { "read-file": { "path": "README.md", "content": "..." } } }
```

---

## Context Fields

- `context.execution` - текущее состояние выполнения
- `context.history` - история выполнения
- `context.workbench` - рабочее состояние (sections, batch, slots)
- `context.scratchpad` - временные данные

---

## Удалено/Deprecated

- Server-side session storage
- `neurons` subsystem
- LLM-based router transform
- Redis/BullMQ queue orchestration
- Prisma/PostgreSQL/pgvector persistence

---

## Simulations

**Canonical rules:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md)

### Что показывают goldens

- Router → `execute.form.choices` (keyword-based)
- Dialog + LLM tools
- Agent coder / smart flows
- Task decomposition
- Workspace tools (`list-directory`, `grep-search`, `read-file`, etc.)
- Gray room (`N-sub-M/` folders)

### Out of scope

- `promiseId`, async polling, retries
- `execute.wait` / loader timing

### Команды

```bash
# Lint
cd a2a-server && npm run sim:lint -- --all --json

# Validate
cd a2a-server && npm run sim:validate -- --all --json
```

---

## Проверка

```bash
# Liveness
curl -s http://localhost:3000/health

# Sync invoke
curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d "{\"task\":\"hello\",\"sync\":true}"
```

---

## Тесты

| Check | Command | Result |
|-------|---------|--------|
| Unit + integration | `cd a2a-server && npm run test` | 437 passed |
| Simulation lint | `cd a2a-server && npm run sim:lint -- --all --json` | valid |
| Simulation validate | `cd a2a-server && npm run sim:validate -- --all --json` | valid |
| ESLint | `cd a2a-server && npm run lint` | 0 errors |

---

## Ссылки

- [AGENTS.md](../AGENTS.md) - Правила работы
- [docs/new-request-flow/PROTOCOL.md](../docs/new-request-flow/PROTOCOL.md) - Протокол
- [docs/GRAY-ROOM.md](docs/GRAY-ROOM.md) - Gray room спецификация
- [simulations/SERVER-CONTRACT.md](../simulations/SERVER-CONTRACT.md) - Contract overview

---

*Обновлено: 2026-03-27*