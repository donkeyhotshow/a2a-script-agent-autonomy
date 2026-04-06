# DEV_STATE - a2a-server (2026-04-01)

Текущее состояние подсистемы a2a-server.
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

---

## Scope Boundary

- Этот файл хранит только server-специфичные архитектуру, риски, задачи и историю изменений.
- Кросс-модульные решения/зависимости ведутся только в root: [`../DEV_STATE.md`](../DEV_STATE.md).
- Не дублировать здесь client/ai-integration backlog; хранить только ссылки на них при необходимости.

## AI-Integration Work Lock

- Status: **UNBLOCKED (2026-03-27)**.
- All a2a-client tasks completed.
- ai-integration tasks can now proceed.

---

## Recent (2026-02-09)

- **Gray Room (`gray-room-orchestrator.ts`):** Skip ADR-0093 internal `llmService.debate` when `schemaName === 'dialog'` (avoids 3 extra sync hub calls and spurious failures such as `error: "terminated"` on the dialog turn after router). Debate wrapped in try/catch for non-dialog — on failure, keep primary LLM markdown. Fixed hard-timeout branch: was referencing undefined `c`; now merges `result.context` or `workingCtx` for `hard_timeout` flag.

## Recent (2026-04-06)

- **Blue-alert / execute contract:** Gray room `warnOnInvalidExecute` uses `validateExecuteShapeForSchema(schemaName)` (agent vs dialog) instead of always dialog rules; passes transform `message` + `execute` into `validateLlmOutputShape`; **`router`** schema also runs `validateRouterResultShape` (non-empty `form.choices`). `isAgentTransformSchema` treats any `fix-vue-imports*` prefix as agent-shaped (decline/batched). Simulation `validateTransformExecute` fixed (was referencing undefined `rawOutput`); passes `responseData` for top-level `message`.
- **Human-review (implemented):** `toInvokeShapeForPromptsTransform` (`context: null` envelope), `resolveExecution` (empty root `{}` ignored), `mergeGrayRoomFinalizeInnerContext` (non-array `history` cannot clobber array), `validateContextBlock` (`execution` not array), `humanizeUpstreamErrorMessage` (Ollama / loopback ports). See [`docs/HUMAN-REVIEW-FINDINGS.md`](../../docs/HUMAN-REVIEW-FINDINGS.md).
- **Tests**: `determineRequestType` table in `request-processor.service.test.ts`; invoke HTTP parity + assert `context.session_id`; action-parser invalid JSON DSL fallback; materialize `result.choice` → history.
- **Poll context**: `GET /api/v1/requests/:id/result` now includes `context.session_id` (added to `POLL_CONTEXT_KEYS` in `requests.routes.ts`) so pollers see server session id on terminal payloads.

## Recent (2026-04-03)

- **GET `/requests/:id/result` poll context**: `mergePollContextWithPersisted` merges whitelisted fields from `RequestResult.context` into the JSON `data.context` after `filterResponse(result)`, with `workbench.slots` deep-merged so `grayRoom` survives when the stored `result` blob differs (Client API async → session `redGrayRoom` e2e).
- **`execution.step === 'init'` + root `task`**: `normalizeContext` no longer promotes that `task` into `result.message` (avoids spurious LLM hop on async invoke schema probe). `resolveTransformSchema` maps dialog+init without user message to the dialog schema so the dialog processor returns the initial task form. E2E: `invokeContextFollowup`.
- **Dialog initial form check**: Added check in `dialog-request-processor.ts` to return initial form directly from request transform for dialog schema without user input, before attempting LLM call.
- **Upstream errors (Client API messages)**: `humanizeUpstreamErrorMessage()` in `request.service.ts` replaces bare Node `fetch failed` / connection errors with actionable text for failed `/api/v1/invoke` calls and `executeLlmCall` paths (stored assistant line in session `messages.json` is no longer the opaque two-word error).
- **Gray Room `mergeTraceIntoResult`**: Always merge `interruptTrace` + `workbench.slots.grayRoom` even when `ProcessResult.context` is missing (finalize path could leave context undefined; early return dropped the slot and broke `e2e-dialog-test.js` `redGrayRoom`).
- **Agent + dialog prompts (`agent-request.md`, `dialog-request.md`)**: Tool turns: assistant line in **`execute.message`** next to the tool key (no top-level **`message`**). **`append-to-array`** prefers **`llm.execute.message`** then **`llm.message`**. Dialog: **`execute.message`** required for nested **`form.textarea`**; legacy **`form.input[]`** unchanged. **Not** `execute.dialog` as a tool. Agent aligned with **`simulations/`** for `step` names and shapes.
- **Router step**: `context.execution.routerAnalysis` is omitted unless `shared/router-static-choices.json` → `routerConfig.autoSelectionEnabled` is true (default **false**). Router choices are always explicit user/monitor `POST …/next` with `result.choice`.
- **Task routing**: `parseTaskText` prefers `message` / `result.message` over stale `task`; dialog router keywords include `dialog` / `диалог` / `діалог`.

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
| `gray-room-orchestrator` | Server-side LLM chaining (gray room / interrupt loop) |
| `action-request-processor` | Tool/action flow |
| `form-request-processor` | Form/choice handling |
| `simulation-request-processor` | Simulation/golden flow |

---

## Gray Room (Concept: GR-S-01)

**Gray room** — это overlay на interrupt loop в `dialog-request-processor`:
- Product name: "gray room" (серверные LLM подзапросы)
- Implementation: `GrayRoomOrchestrator` в [`gray-room-orchestrator.ts`](src/services/core/request-processor/gray-room-orchestrator.ts)
- Trigger: `detectGrayRoomTrigger()` → explicit flag → env → policy
- Loop: `runLoop()` → interrupt budget → transforms → LLM cycle

### Data Flow Boundaries

- **Only** modifies `context.workbench` and `context.history`
- Does **not** modify `context.execution` (trace only)
- Final `execute` follows **Action-Key Shape**
- No client round-trips; server-only

### Documentation

- [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) — full specification with Concept Boundary section
- [`docs/adr/ADR-0029-server-interrupt-loop.md`](docs/adr/ADR-0029-server-interrupt-loop.md) — decision record

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

### Out of scope (клиентская ответственность)

- `promiseId`, async polling, retries — клиент опрашивает
- `execute.wait` / loader timing — **сервер не возвращает wait; клиент сам рендерит ожидание по promiseId**

### Команды

```bash
# Lint
cd a2a-server && npm run sim:lint -- --all --json

# Validate
cd a2a-server && npm run sim:validate -- --all --json

# Unified quality gate (CI acceptance rule)
cd a2a-server && npm run sim:quality
```

---

## Проверка

```bash
# Liveness
curl -s http://localhost:3000/health

# Async invoke (ack only — then poll GET …/result until terminal)
curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d "{\"task\":\"hello\"}"
# Use `data.promiseId` from the JSON body, then:
# curl -s "http://localhost:3000/api/v1/requests/<promiseId>/result"
```

---

## Тесты

| Check | Command | Result |
|-------|---------|--------|
| Unit + integration | `cd a2a-server && npm run test` | 445 passed |
| Simulation lint | `cd a2a-server && npm run sim:lint -- --all --json` | valid |
| Simulation validate | `cd a2a-server && npm run sim:validate -- --all --json` | valid |
| ESLint | `cd a2a-server && npm run lint` | 0 errors |

---

## Архитектура скриптов (LF-S-04)

**sim-lint разделён на модули (`scripts/sim-lint/`):**
- `registry.ts` — типы, константы, lint правила (`SIMULATIONS_DIR` = repo-root `simulations/`)
- `runners.ts` — запуск проверок файлов и симуляций
- `reporters.ts` — генерация отчётов, CLI args/help
- `scripts/sim-lint.ts` — точка входа (`import './sim-lint/registry.js'` и т.д.)

**Верификация:** `npm run sim:lint -- --help`

---

## Архитектура скриптов (LF-S-03)

**sim-validate разделён на модули (`scripts/sim-validate/`):**
- `scanner.ts` — сканирование симуляций, CLI args/help
- `validators.ts` — валидация JSON по схемам, нормализация (repo-root `docs/new-request-flow/json-schemas`)
- `reporters.ts` — вывод + `main()`
- `scripts/sim-validate.ts` — точка входа (`import './sim-validate/reporters.js'`)

**Верификация:** `npm run sim:validate -- --help`

---

## Ссылки

- [DEV_STATE.md](../DEV_STATE.md) - Root state файл (кросс-модульные зависимости)
- [AGENTS.md](../AGENTS.md) - Правила работы
- [docs/new-request-flow/PROTOCOL.md](../docs/new-request-flow/PROTOCOL.md) - Протокол
- [docs/GRAY-ROOM.md](docs/GRAY-ROOM.md) - Gray room спецификация
- [simulations/SERVER-CONTRACT.md](../simulations/SERVER-CONTRACT.md) - Contract overview

---

## State Governance (Inherited from Root)

- Этот файл является source of truth для server-состояния и обновляется после каждого значимого действия.
- Все задачи ведутся только со статусами и проверяемыми критериями.
- После выполнения: фиксировать фактическое состояние, удалять неактуальное, добавлять следующий исполнимый шаг.
- Блокеры фиксируются явно; при возможности устраняются в текущем цикле.
- Приоритет: завершение начатого -> стабилизация -> production readiness.

---

## Current Status

- *Нет активных задач* — модуль в стабильном состоянии.
- Все основные задачи модуля закрыты; детали в `docs/TASKS-COMPLETED.md`.



### Recent (2026-04-03)
- **Vitest:** Dropped stale excluded suites; removed tests that imported deleted modules (`neurons-v2`, `ollama-adapter`, `rag` entity scorer, `llm-client`, `auth.middleware`, `neuron-activator`, old `simulation/*`). `vitest.config.ts` excludes only `node_modules` / `dist`.
- **Auto-AI index:** Added [`src/actions/definitions/auto-ai-index.ts`](src/actions/definitions/auto-ai-index.ts) (`AUTO_AI_CATEGORIES`, `AUTO_AI_ACTION_IDS`, helpers) for `definitions-load` + `auto-ai-index` unit tests.
- **Router static JSON:** Fixed corrupt trailing `]` / `}` in [`shared/router-static-choices.json`](../shared/router-static-choices.json) (was breaking `JSON.parse` in `src/config/router-static.ts`).
- **Sequence / Gray Room (incremental):** [`sequence-workbench.ts`](src/services/core/request-processor/sequence-workbench.ts) implements `step_complete` against `context.workbench.sections.sequence` (replaces broken `session-manager` import). [`docs/references/sequence-schema.json`](../docs/references/sequence-schema.json) documents `SequenceStep` + `SequencePlan`. No `POST /api/v1/sequence` on the stateless server—queue edits stay on Client API or invoke `context`.

