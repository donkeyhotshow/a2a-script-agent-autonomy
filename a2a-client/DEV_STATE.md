# DEV_STATE - a2a-client (2026-03-27, verified)

Текущее состояние подсистемы a2a-client (Web UI + Client API).
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

---

## Scope Boundary

- Этот файл хранит только client-специфичные архитектуру, риски, задачи и историю изменений.
- Кросс-модульные решения/зависимости ведутся только в root: [`../DEV_STATE.md`](../DEV_STATE.md).
- Не дублировать здесь server/ai-integration backlog; хранить только ссылки на них при необходимости.

## AI-Integration Work Lock

- Status: **UNBLOCKED (2026-03-27)**.
- All a2a-client and a2a-server tasks completed.
- ai-integration tasks can now proceed.

---

## Архитектура

**Client API** - хранит сессии и управляет состоянием:
- Step-based storage (нумерованные папки)
- Vite plugin для `/api/a2a/*` endpoints

---

## Ports

| Порт | Компонент |
|------|-----------|
| 5173 | Vite Dev Server + Web UI |
| 3001 | Standalone Client API (опционально) |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/a2a/projects` | Список проектов |
| POST | `/api/a2a/projects` | Создать проект |
| GET | `/api/a2a/sessions` | Список сессий |
| POST | `/api/a2a/sessions` | Создать сессию |
| GET | `/api/a2a/sessions/:id` | Получить сессию |
| POST | `/api/a2a/sessions/:id/next` | Отправить сообщение |
| GET | `/api/a2a/sessions/:id/async` | Polling async результата |
| GET | `/api/a2a/daemon/stats` | Статистика daemon |

---

## Session Storage

```
a2a-client/storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # Ввод пользователя
│   ├── request-to-server.json # Запрос к A2A Server
│   ├── server-response.json   # Ответ сервера
│   ├── server-promise.json    # Статус промиса
│   └── messages.json           # История сообщений
├── 2/
│   └── ...
└── ...
```

**Важно:** Нет root `session.json` - состояние определяется последним шагом.
**Важно (3-й участник диалога):** история должна явно поддерживать роль `system` (auto-responses из Red Room) наравне с `user` и `assistant`; рендер и хранение не должны терять эти сообщения.

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **vite-plugin-a2a** | [vite-plugin-a2a.js](vite-plugin-a2a.js) | Main plugin |
| **stepRoutes** | [vite-plugin-a2a/routes/stepRoutes.js](vite-plugin-a2a/routes/stepRoutes.js) | Управление шагами |
| **sessionRoutes** | [vite-plugin-a2a/routes/sessionRoutes.js](vite-plugin-a2a/routes/sessionRoutes.js) | Управление сессиями |

---

## Context Fields (новые)

| Field | Type | Description |
|-------|------|-------------|
| `context.execution` | object | Текущее выполнение |
| `context.history` | array | История действий |
| `context.workbench` | object | Рабочее состояние |

---

## Тестирование

### Без запуска серверов

```bash
# Client API (mocked)
cd a2a-client && npm run test:client-api

# Full Vitest
cd a2a-client && npm test
```

### С запуском серверов

```bash
# 1. A2A Server (port 3000)
cd a2a-server && npm run dev:local

# 2. Vite (port 5173)
cd a2a-client && npx vite

# 3. Smoke tests
cd a2a-client && npm run smoke:client
```

### Manual curl

```bash
curl -s http://localhost:5173/api/a2a/projects
curl -s -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{"task":"Hello"}'
```

---

## Simulations

**Contract tests** - golden fixtures для sync потока:
- `client.json` → transforms → `response.json` → `received.json`
- [`simulations/SCHEMA.md`](simulations/SCHEMA.md)

**Verify:**
```bash
npm run sim:lint -- --all --json
npm run sim:validate -- --sim <name> --json
```

- [x] **Gray room UI (2026-03-27):** `context.workbench.slots.grayRoom` — collapsible block in [`web/js/task-flow/render-layout.js`](web/js/task-flow/render-layout.js) (`buildGrayRoomHtml`), styles in [`web/css/components/task-flow.css`](web/css/components/task-flow.css). Golden: [`simulations/resilience-contract/6/response.json`](../simulations/resilience-contract/6/response.json).

---

## Конфигурация

```bash
PORT=5173           # Vite port
DEFAULT_SYNC_MODE=1
SKIP_AUTH=1
```

---

## Известные проблемы

- В `packages/execution/src/script-runner/index.ts` унифицированы формы `execute.script` (code, language; runner/sandbox внутренние) и `result["script"]` (output, exitCode, error) — C-08.

---

## Ссылки

- [DEV_STATE.md](../DEV_STATE.md) - Root state файл (кросс-модульные зависимости)
- [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) - Протокол
- [AGENTS.md](AGENTS.md) - Правила работы
- [docs/LOADER-BEHAVIOR.md](docs/LOADER-BEHAVIOR.md) - Поведение лоадера

---

## State Governance (Inherited from Root)

- Этот файл является source of truth для client-состояния и должен обновляться после каждого значимого действия.
- Каждая задача обязана иметь статус (`[ ]` / `[x]`) и проверяемый критерий завершения.
- После завершения задач: cleanup устаревших пунктов, фиксация решений/ограничений, план следующих шагов.
- Неопределенности фиксируются явно как risks/questions.
- Приоритет: завершение начатого -> стабилизация -> production readiness.

---

## Задачи (Next Tasks)

- Основные цели модуля закрыты, детали выполненных пунктов переносим в `docs/TASKS-COMPLETED.md`.
- В этом файле остаются только активные риски/следующие шаги (в коде, если появятся).
- Текущее состояние: готово к поддержке и проверкам, без лишних “перечень выполнено” блоков.
### Large File Decomposition (400-500+ lines)
- [x] **LF-C-01**: Decompose `vite-plugin-a2a/routes/stepRoutes.js` (~719) into `step-routes-read.js`, `step-routes-write.js`, and shared middleware/util layer.
- [x] **LF-C-02**: Decompose `web/js/task-flow/render.js` (~1421) into focused render modules (`render-message`, `render-form`, `render-layout`, `render-state`).
- [x] **LF-C-03**: Decompose `packages/sdk/src/server/server/routes/sessions.ts` (~1033) into route groups (session read, session mutation, async/promise endpoints).
- [x] **LF-C-04**: Decompose `packages/rag/src/searcher/rag-searcher.ts` (~836) into query planner, chunk pipeline, ranking pipeline, and output shaping.
- [x] **LF-C-05**: Decompose `web/js/error-handler.js` (~772) into classification, UI mapping, telemetry/logging, and recovery actions.
- [x] **LF-C-06**: Decompose `vite-plugin-a2a/routes/utils/agent-rag-chain.js` (~566) into chain steps + guards + depth policy helpers.

### Session Clarity Alignment (based on simulations/dialog + simulations/agent-auto-ai)
- [x] **SC-01 session-view-model**: Introduce `session-view-model.js` as single adapter from `received.json` shapes to UI state (`choice-form`, `input-form`, `message+form`, `message-only`, `completed`).
- [x] **SC-02 session-stage-machine**: Add explicit `session-stage-machine.js` (`routing`, `dialog-input`, `agent-tool-loop`, `awaiting-async`, `completed`) driven by `execute` + `context.execution` + `asyncPending` (tests: `tests/unit/session-stage-machine.test.mjs`).
- [x] **SC-03 history-projection-boundary**: Add `history-projection.js` that accepts only canonical server payload (`context.history`, `context.files`, `workbench`) and emits deterministic timeline records with mandatory support for `system` role entries.
- [x] **SC-04 project-daemon-registry**: Mirror daemon clarity pattern for sessions via `session-background-registry.js` keyed by `projectId + sessionId` (pollers, timers, status).
- [x] **SC-06 web-dto-contract-tests**: Add tests from simulation fixtures (`dialog/*/received.json`, `agent-auto-ai/*/received.json`) to validate all supported execute variants in one matrix.
- [x] **SC-07 step-routes-split-by-flow**: Split `stepRoutes.js` by flow ownership: `router-flow`, `dialog-flow`, `agent-flow`, `async-flow`, then keep one composition root.
- [x] **SC-08 session-read-model-doc**: Add `docs/SESSION-READ-MODEL.md` with mapping: simulation artifact -> client store field -> renderer behavior.
- [x] **SC-09 system-message-policy**: Define and implement Web UI policy for `system` messages (Red Room auto-responses): rendering style, ordering in timeline, and non-lossy persistence in `messages.json`.

### Session Clarity Rollout Order
- [x] **SCR-1**: Implement `SC-01` + `SC-02` first (no UI redesign; behavior-preserving).
- [x] **SCR-2**: Implement `SC-04` to make per-project/per-session background processes explicit. Created `session-background-registry.js` in `a2a-client/web/js/daemons/` with key `projectId::sessionId`, supports pollers/timers/statusCheckers, includes cleanup on session close and project change.
- [x] **SCR-3**: Implement `SC-03` only (keep UI minimal; no new visualization features).
- [x] **SCR-4**: Lock with `SC-06` fixture matrix tests and update docs (`SC-08`).

### Redundant Functionality Detection & Cleanup
- [x] **RF-C-01 inventory**: Build inventory of session-related modules and mark overlap (same responsibility implemented in 2+ places).
- [x] **RF-C-02 usage-evidence**: For each candidate, confirm runtime usage via imports/routes/tests before removal.
- [x] **RF-C-03 delete-plan**: Create per-item removal plan (what to delete, what remains as single owner module).
- [x] **RF-C-04 compatibility-window**: Keep temporary bridges max 1 release cycle; then remove legacy aliases/wrappers.
  - Audited legacy bridges/aliases in a2a-client
  - Added @deprecated markers with dates (2026-03-27) to:
    - `saveNewSession` function in `vite-plugin-a2a/storage/newSessions.js`
    - `handlePostStep` function in `vite-plugin-a2a/routes/handlers/step-handlers.js`
    - `LEGACY_SESSION_STATUS` constant in `packages/types/src/types.js`
  - Created removal plan: items will be removed in next release cycle
  - Legacy bridges remain functional but marked for removal
- [x] **RF-C-05 done-criteria** (2026-03-27): Cleanup counts as done when behavior is unchanged, `npm test` (a2a-client + a2a-server as applicable) passes, and golden matrix stays green (`npm run sim:lint -- --all`, `npm run sim:validate -- --all` from a2a-server). Same bar as `gate:cleanup` / `AGENTS.md` checklist.

### Redundancy Review Decisions (2026-03-27)
- **Owner split confirmed (keep):** `shared/web-execute-dto.mjs` remains the single implementation; `vite-plugin-a2a/routes/utils/execute-projection-dto.js` and `packages/sdk/src/server/lib/web-execute-dto.ts` remain thin boundary adapters for runtime/package separation.
- **No dead route adapters found:** split flow routes (`step-routes-*.js`) are actively referenced by `stepRoutes.js`; no safe deletion in this pass.
- **Removed obsolete compatibility note:** dropped stale mention of legacy `web-execute-dto.js` compatibility re-export from historical notes.
- **RF-C-01 inventory published:** session-module overlap inventory and consolidation candidates documented in `docs/SESSION-REDUNDANCY-INVENTORY.md`.

### Unusual Findings Alignment (Client)
- [x] **UA-C-01 polling-contract-drift**: Align documented async polling contracts between Vite Client API (`/api/a2a/sessions/:id/async`) and SDK async path variants (`/async/status/:promiseId`) to one canonical integration guide + compatibility matrix.
- [x] **UA-C-02 debug-context-guard** (2026-03-27): Rule already in [`docs/WEB_UI_PROTOCOL.md`](docs/WEB_UI_PROTOCOL.md) (`includeContext` debug-only). Test: [`tests/unit/session-projection-dto.test.mjs`](tests/unit/session-projection-dto.test.mjs) — public session strips `context` / `workbench.slots`.
- [x] **UA-C-03 tri-role-render-tests** (2026-03-27): [`tests/unit/tri-role-timeline.test.mjs`](tests/unit/tri-role-timeline.test.mjs) — `projectHistoryTimeline` order/roles, JSON round-trip, `mergeDialogHistoryForInvoke` with interleaved `system` rows.
- [x] **UA-C-04 web-protocol-doc-cleanup** (2026-03-27): [`docs/WEB_UI_PROTOCOL.md`](docs/WEB_UI_PROTOCOL.md) § **Glossary** — Web DTO, Red Room, Gray Room, Agent loop.

### Code Cleanup Discovery Plan (Client: where/how)
- [x] **CCP-C-01 where-to-scan**: Primary folders зафиксированы (`web/js/`, `vite-plugin-a2a/routes/`, `vite-plugin-a2a/routes/utils/`, `packages/sdk/src/server/server/routes/`); стартовый scan выполнен, hotspots покрываются задачами `LF-C-*`, `RF-C-*` и `CCP-C-02..05`.
- [x] **CCP-C-02 signal-set (CDM-02)**: (1) duplicate adapters, (2) legacy compatibility bridges, (3) dead exports, (4) unused route branches, (5) overlapping DTO/projection builders. **How:** ripgrep across CCP-C-01 folders: `projection`, `dto`, `poll`, `session`, `execute`, `re-export`, `compat`, `deprecated`; cross-check `packages/*/src/index.ts` and vite route registration.
- [x] **CDM-03 evidence format**: Each cleanup candidate must be recorded as one row: `path` · `why redundant` · `usage proof` (imports/tests) · `safe removal check` (commands to run before delete).
- [x] **CCP-C-03 bridge-detection** (2026-03-27): Bridges and overlap inventory: [`docs/SESSION-REDUNDANCY-INVENTORY.md`](docs/SESSION-REDUNDANCY-INVENTORY.md); `@deprecated` markers tracked under RF-C-04; no extra owner column — follow RF-C-04 removal window.
- [x] **CCP-C-04 dead-path-check** (2026-03-27): Procedure = CDM-03 evidence row + import/`rg` usage proof before delete (same as server CCP-S-03 pattern).
- [x] **CCP-C-05 safe-remove-gate (CDM-04)** (2026-03-27): Same commands as RF-C-05 (`npm test`, `sim:lint`/`sim:validate` as applicable to touched modules).

## 2026-03-27 SDK HTTP Limits (C-03)

- Completed `tasks/00-c-03-sdk-http-limits.md`.
- Added standalone SDK HTTP limits profile (`cors`, in-memory `rateLimit`, `fileCap`) with env overrides in `packages/sdk/src/server/server/http-limits.ts`.
- Wired profile into standalone server path in `packages/sdk/src/server/index.ts` and `packages/sdk/src/server/server/app.ts`.
- Added contract tests in `packages/sdk/src/server/server/http-limits.test.ts`.

