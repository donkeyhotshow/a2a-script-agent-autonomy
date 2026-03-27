# DEV_STATE - a2a-server (2026-03-27)

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

### Out of scope

- `promiseId`, async polling, retries
- `execute.wait` / loader timing

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

# Sync invoke
curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d "{\"task\":\"hello\",\"sync\":true}"
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

## Задачи (Next Tasks)

- Основные задачи модуля закрыты; список выполненных пунктов зафиксирован в `docs/TASKS-COMPLETED.md`.
- Оставляем только текущие/открытые риски и шаги, как требуется по нормам DEV_STATE.
- [x] **S-03 server-requests-storage**: define default/override storage path behavior (`REQUESTS_STORAGE_PATH`) and retention/cleanup policy.
- [x] **S-04 server-llm-hub-polling**: standardize `LLM_POLL_*`/`POLL_*` defaults and timeout budget for daemon processing. Defaults documented in `.env.example`, implementation in `src/daemon/llm-hub-poll.ts` with 1h default / 24h cap aligned to ai-integration `PROMISE_TTL_SECONDS`.
- [x] **S-06 server-error-detail-level**: Production JSON responses omit stacks and genericize unknown `Error` messages; `exposeErrorDetailsToClient()` / `A2A_ERROR_EXPOSE_DETAILS`; server logs always include stacks. See `.env.example` and `src/middleware/error.middleware.ts`.
- [x] **S-07 server-background-processor**: add `REQUEST_PROCESSOR_INTERVAL_MS` config (default 5000ms), env variable support, and latency metrics via `/metrics` endpoint.
- [x] **S-08 server-logging**: unify `LOG_LEVEL`/`LOG_FORMAT` and Winston rotation/boot-clean strategy; add acceptance checks.
- [x] **S-09 agent-rag-chain-limits**: set safe defaults for `A2A_AGENT_RAG_CHAIN_MAX` + project path envs and verify fallback behavior.

### Высокий приоритет (Phase 2-3)
- [x] Аудит всех процессоров на `Action-Key Shape`.
- [x] Проверка `request-processor.service.ts` - логика переключения на `agent` при наличии ключевых слов.
- [x] Загрузка всех симуляций и проверка `received.json`.
- [x] Полный прогон `npm run sim:validate`.
- [x] Очистка `storage/requests` (удалить старые файлы).

### Simulation Contract & Docs (Complex)
- [x] **No-LLM transform messages (tooling)** (2026-03-27): Одно правило в `scripts/sim-contract/step-transform-rules.ts`; `npm run sim:validate -- --step-contract` и `npm run sim:lint -- --step-contract` (опционально, без изменения default CI). Полное строгое требование в `sim:quality` по-прежнему блокируется warning-debt по золотым.
- [x] **Contract warnings / CI visibility** (2026-03-27): `npm run sim:contract-report` (JSON: structural + step-contract delta + `bySimulation`); `sim:validate --json` добавляет `structuralValid`, `contractComplete`, `warningCount`; `gate:cleanup` печатает `validate.warningCount` / `contractComplete`; workflow `simulations-ci.yml` — шаг **Contract debt report** в summary.
- [x] **Shortened golden policy** (2026-03-27): [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) § Shortened golden sets — bundled transforms, warnings vs `valid`, отсылки к `sim:contract-report` / `sim:quality`.
- [x] **Resilience simulations** (2026-03-27): [`simulations/resilience-contract/`](../simulations/resilience-contract/) — шаги 1–6: human-gate `form`, два `rag-search` с `scratchpad` drain, два `read-file` с ростом `context.files`, финал с `slots.grayRoom` (`6/response.json`). Web UI: `buildGrayRoomHtml` в [`a2a-client/web/js/task-flow/render-layout.js`](../a2a-client/web/js/task-flow/render-layout.js).
- [x] **scan-directory protocol alignment** (2026-03-27): Отдельного действия нет; протокол зафиксирован как зарезервированное имя + маппинг на `list-directory` / `grep-search` в [`docs/new-request-flow/PROTOCOLS/actions/scan-directory.md`](../docs/new-request-flow/PROTOCOLS/actions/scan-directory.md); индексы PROTOCOLS/README, actions/README, STAGES/03-execution обновлены.
- [x] **sim-validate reporting modes** (2026-03-27): JSON `structuralValid` (= schema errors), `contractComplete` (= `warningCount === 0`), плюс `warningCount` per simulation.

### Large File Decomposition (400-500+ lines)
- [x] **LF-S-01**: Decompose `src/transform/operations.ts` (~897) into `operations/json-path.ts`, `operations/value-helpers.ts`, `operations/transform-groups.ts` + index re-export.
- [x] **LF-S-02**: Decompose `src/services/core/request-processor/dialog-request-processor.ts` (~781) into normalization.ts, llm-orchestration.ts, response-path.ts + index re-export.
- [x] **LF-S-03**: Decompose `scripts/sim-validate.ts` (~810) into scanner, validators, and report formatters.
- [x] **LF-S-04**: Decompose `scripts/sim-lint.ts` (~718) into lint rule registry + rule runners + reporters.
- [x] **LF-S-05**: Decompose `src/transform/pipeline.ts` (~481) into `src/transform/pipeline/{run,load,file-runner,prompts,validate}.ts` + barrel `pipeline.ts` (see `tasks/lf-s-05-decompose-pipeline.md`).
- [x] **LF-S-06**: Decompose `src/actions/handlers/file-operations.ts` into `file-operations/{types,security,read-file,write-file,file-exists,list-directory}.ts` + barrel (see `tasks/lf-s-06-decompose-file-operations.md`).
- [x] **LF-S-07**: `operations.ts` must **import** transform-group handlers for `applyOperation()` dispatch, not only re-export (see `tasks/lf-s-07-operations-transform-groups-dispatch.md`).

### Redundant Functionality Detection & Cleanup
- [x] **RF-S-01 inventory**: Inventory overlapping server paths (transforms, action handlers, request processors) with duplicate responsibilities.
- [x] **RF-S-02 rule-of-one-owner**: For each responsibility, keep exactly one owner module and mark others as deprecation targets.
- [x] **RF-S-03 remove-dead-branches**: Remove unreachable/deprecated code paths after test + simulation confirmation.
- [x] **RF-S-04 cleanup-gate**: `npm run gate:cleanup` (a2a-server) = `vitest` + structural `sim:lint.valid` && `sim:validate.valid` (warnings allowed). Stricter debt gate: `npm run sim:quality` (requires `warnings == 0`).

### Redundancy Review Decisions (2026-03-27)
- **Single-owner mapping confirmed (keep):** request processor selection stays in `request-processor.service.ts`; dialog orchestration remains in `dialog-request-processor.ts`; no duplicate active owner found for these responsibilities.
- **No dead compatibility adapters found in runtime paths:** sampled candidates marked `legacy`/`deprecated` are docs/tests metadata or still referenced by active flows.
- **Removal decision:** no runtime server file deletion in this pass; next removal candidate requires explicit proof of unreachable branch plus `sim:lint`/`sim:validate` gate.

### Completed Tasks (2026-03-27)
- [x] **LF-S-01**: Decomposed `src/transform/operations.ts` (~897 lines) into:
  - `operations/json-path.ts` - JSONPath utilities (query, set, resolveTemplates, etc.)
  - `operations/value-helpers.ts` - Value helpers (shouldSkipDuplicateUserHistoryAppend, truncateToMaxChars)
  - `operations/transform-groups.ts` - Transform groups (applyPickContext, applyDrop, applyPickFiles, etc.)
  - `operations.ts` - Re-exports all from submodules + core operations (copy, set, append-to-array, parse-json-from-md, render-markdown, truncate-section, switch)
  - **Fix (2026-03-27, tracked as LF-S-07):** `applyPickContext`, `applySwitch`, and other `transform-groups` handlers must be **imported** into `operations.ts` for `applyOperation()` dispatch; `export { … } from './transform-groups.js'` alone does not create local bindings (runtime `ReferenceError` / `applySwitch is not defined`). `tests/transform-runtime.test.ts` now fully passes (31/31).
- [x] **LF-S-02**: Decomposed `src/services/core/request-processor/dialog-request-processor.ts` (~201 lines) into:
  - `normalization.ts` - нормализация входных данных (resolveTransformSchema, normalizeContext, extractSchemaName)
  - `llm-orchestration.ts` - оркестрация LLM вызовов (executeLlmCall, runRequestTransforms, initLlmPromise, recoverLlmPromise)
  - `response-path.ts` - обработка путей ответа (recoverDialogFromLlmPromise, canRecoverFromLlmPromise, getLlmPromiseId)
  - `dialog-request-processor.ts` - Re-exports + основной класс
- [x] **LF-S-05**: `src/transform/pipeline.ts` → `pipeline/run.ts`, `load.ts`, `file-runner.ts`, `prompts.ts` (schema maps + `getPromptsTransformsPath` → `a2a-server/prompts/transforms`), `validate.ts`; public API unchanged.
- [x] **LF-S-06**: `handlers/file-operations.ts` → `handlers/file-operations/*.ts` (types, `validatePath`, per-action executors); exports unchanged for `handlers/index.ts`.
- [x] **Stabilization (2026-03-27):** `dialog-request-processor.ts` — `canProcess` used `require('./normalization.js')` (ESLint `@typescript-eslint/no-var-requires`). Replaced with static import; `normalization.ts` does not import the processor, so no circular dependency.
- [x] **Stabilization (2026-03-27):** ESLint **0 warnings** on `src/**/*.ts`: removed unused `path` import in `index.ts`; trimmed `operations.ts` type imports; removed dead `truncateToMaxChars` copy in `json-path.ts`; trimmed unused json-path/value-helpers imports in `transform-groups.ts`.

### Unusual Findings Alignment (Server/Contracts)
- [x] **UA-S-01 interrupt-trace-contract** (2026-03-27): Canonical path and merge helper in `src/transform/interrupt-trace-contract.ts` (`INTERRUPT_TRACE_CONTEXT_PATH`, `mergeInterruptTraceIntoContext`). `GrayRoomOrchestrator.mergeTraceIntoResult` uses this helper only. UI readers: `a2a-client/web/js/task-flow/render-layout.js` (`slots?.interruptTrace`).
- [x] **UA-S-02 no-llm-vs-llm-step-rules** (2026-03-27): Canonical rules live in `scripts/sim-contract/step-transform-rules.ts` (aligned with `simulations/SCHEMA.md`). **`collectNoLlmStepContractWarningsForSimulation()`** walks numbered steps + `N-sub-M` + flat root (parity with `sim-lint --step-contract`). **Optional** CLI: `npm run sim:validate -- --step-contract` (with `--sim` or `--all`). Default validate unchanged (legacy goldens retain warning debt until fixed).

### Gray Room / Planned Sub-Requests (Server-Orchestrated)
- [x] **GR-S-01 concept-boundary** (2026-03-27): Зафиксировано в [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Concept Boundary + Status (overlay на interrupt loop, `DialogRequestProcessor` → `GrayRoomOrchestrator.runLoop`, trace через `interrupt-trace-contract.ts`).
- [x] **S-10**: [P2] Request Cleanup Script: utility for cleaning up `storage/requests` older than 14 days.
- [x] **S-11**: [P1] Realize unified Gray Room Orchestrator by extracting logic from `dialog-request-processor.ts`.
- [x] **GR-S-02 trigger-contract**: Определены механизмы запуска gray room:
  - (a) Explicit flag: `context.execution.grayRoomRequested = true` или `flowControlHint = "gray-room"`
  - (b) Env toggle: `A2A_GRAY_ROOM_ENABLED=1` (по умолчанию off)
  - (c) Policy для типов запросов: `dialog`, `agent`, `task-decomposition`
  - Добавлены переменные: `A2A_GRAY_ROOM_MAX_TURNS` (default 10, max 100)
  - Реализованы функции: `shouldUseGrayRoom()`, `detectGrayRoomTrigger()`, `isGrayRoomEnabled()`
  - По умолчанию gray room выключен (backwards compatible)
- [x] **GR-S-03 schema-entry-points** (2026-03-27): В [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § **Server orchestration (schema entry points)** — цепочка `resolveTransformSchema` → `extractSchemaName` → `runLoop`; `ACTION_TO_SCHEMA` / `LLM_PIPELINE_ACTIONS` из `shared/router-static-choices.json`; `interrupt.schema` → `activeSchemaName` только при `continueLoop`, тот же `runPromptsTransform` / `prompts/transforms/<name>/`; опциональные пакеты без параллельного пайплайна.
- [x] **GR-S-04 orchestration-loop** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Orchestration loop + error paths.
- [x] **GR-S-05 isolation-and-scheduling** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Isolation and scheduling (policy).
- [x] **GR-S-06 simulations-and-ci** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Simulations and CI + CI step `sim:contract-report`.
- [x] **GR-S-07 runtime-gap-audit** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Runtime vs roadmap.
- [x] **GR-S-08 control-envelope-schema** (2026-03-27): `GrayRoomControlEnvelope` в [`src/transform/types.ts`](src/transform/types.ts); `mergeGrayRoomSlotIntoContext` в [`interrupt-trace-contract.ts`](src/transform/interrupt-trace-contract.ts); `GrayRoomOrchestrator.runLoop` обновляет `context.workbench.slots.grayRoom` на каждом успешном выходе из цикла. Док: [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Client visibility `grayRoom`.
- [x] **GR-S-09 interrupt-directive-schema** (2026-03-27): `docs/new-request-flow/json-schemas/interrupt-directive.schema.json`; при наличии `interrupt` в `response.json` — AJV в `validateFile` (`sim-validate`).
- [x] **GR-S-10 substep-schemas** (2026-03-27): Loose `server-interrupt-substep-request.schema.json` / `server-interrupt-substep-response.schema.json` (документированы в GRAY-ROOM; строгая валидация в sim — по желанию).
- [x] **GR-S-11 lint-validate-parity** (2026-03-27): `collectNoLlmStepContractWarningsForSimulation()` в `step-transform-rules.ts` — те же шаги что `sim-lint --step-contract` (numbered + `N-sub-M` + flat).
- [x] **GR-S-12 orchestrator-unification** (2026-03-27): Все `LLM_PIPELINE_ACTIONS` (в т.ч. `agent`, `task-decomposition`) маршрутизируются в `dialogRequestProcessor` через `determineRequestType` → регистр `dialog`; один `GrayRoomOrchestrator` на процессор. Комментарий в [`request-processor.service.ts`](src/services/core/request-processor/request-processor.service.ts).
- [x] **GR-S-13 transform-contract-unification** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Transform `$.llm.interrupt` → `$out.interrupt`.
- [x] **GR-S-14 observability-and-ops** (2026-03-27): [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) § Observability (planned) — метрики/логи как roadmap; сейчас trace + logs.

### Code Cleanup Discovery Plan (Server: where/how)
- [x] **CCP-S-01 where-to-scan**: Primary folders for cleanup scans зафиксированы: `src/transform/`, `src/services/core/request-processor/`, `src/actions/handlers/`, `scripts/`.
- [x] **CCP-S-02 signal-set (CDM-02)**: (1) duplicate adapters, (2) legacy compatibility bridges, (3) dead exports, (4) unused route branches, (5) overlapping DTO builders. **How:** overlapping operations/validators/reporters and duplicate path-specific branches in `src/transform/`, `src/actions/handlers/`, `src/services/`; ripgrep `deprecated`, `compat`, `re-export`, `legacy`.
- [x] **CDM-03 evidence format**: Each cleanup candidate must be recorded as one row: `path` · `why redundant` · `usage proof` · `safe removal check` (e.g. `npm run test`, `npm run sim:lint`).
- [x] **CCP-S-03 deprecation-check** (2026-03-27): Ripgrep on `src/**/*.ts` for `deprecated|legacy|compat` (case-insensitive). **Still intentional (keep):** `transform-execute-validator.ts` rejects legacy bare `{content}` / `{results}` result blobs (runtime validation, not dead code). `request-processor.interfaces.ts` exports `ActionRequest` (comment: legacy shape); **no** internal `import type { ActionRequest }` — reserved for external/compat; do not delete without semver note. `request-processor.service.ts` re-export comment for types. `invoke.service.ts` / `sessions.routes.ts` comments describe compatibility behavior, not unused branches. **No** `deprecated`/`@deprecated` runtime branches found that are safe to remove in this pass.
- [x] **CCP-S-04 safe-remove-gate (CDM-04)**: Use `npm run gate:cleanup` (tests + `sim:lint.valid` + `sim:validate.valid`). Stricter removals: `npm run sim:quality` when warning debt is zero.

