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

---

## Конфигурация

```bash
PORT=5173           # Vite port
DEFAULT_SYNC_MODE=1
SKIP_AUTH=1
```

---

## Известные проблемы

- В `packages/sdk/src/server/server/middleware/auth.ts` есть временный bypass (`allow all requests`) до полной auth-реализации.
- В `packages/execution/src/script-runner/index.ts` открыты `TODO(Task-04)` по унификации `execute.script`/`result["script"]`.

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

### Alternatives Migration Plan (client scope)
- [x] **C-01 client-filesystem-root**: choose and document canonical `A2A_CLIENT_STORAGE_DIR` strategy (repo-local vs home) for dev and CI. See [`docs/C-01-storage-strategy.md`](docs/C-01-storage-strategy.md).
- [x] **C-02 session-storage-layout**: formalize step-folder invariants (`client-result`, `request-to-server`, `server-response`, `messages`) and recovery rules, including explicit persistence rules for `system` role messages (Red Room auto-responses).
- [x] **C-03 sdk-http-limits**: define default CORS/rate-limit/file-cap profile for standalone SDK mode and add contract tests.
- [x] **C-04 golden-simulations**: add client-focused simulation checklist for sanitized web DTOs (`execute` must stay web-safe).
- [x] **C-05 simulations-base-path**: align client test tooling with selected simulations path strategy (`SIMULATIONS_PATH` override support).

### Высокий приоритет (Phase 2-3)
- [x] Проверка ESM `import http` в `stepRoutes.js`.
- [x] Аудит `toWebExecute` - убедиться, что клиентские данные (`rag-search`, `read-file`) не просачиваются в JSON.
- [x] Очистка `storage/sessions` (удалить тестовые сессии).

### Средний приоритет (Phase 4-5)
- [x] Сборка фронтенда: `npm run build`.
- [x] Smoke-тест: сессия → диалог → завершение (Ollama работает).
- [x] Проверка `LOADER-BEHAVIOR` (минимальное время 5 сек).

### Simulation Contract & Docs (Complex)
- [x] Добавить client-specific checklist для `received.json`: в `execute` допускаются только web-safe поля (`message`/`form`/attachments), tool-actions (`read-file`, `rag-search`, `write-file`, `run-script`) должны оставаться вне `execute`.
- [x] Завести отдельный контроль для `buildWebExecute` / `toWebExecute`: golden-проверки на sanitized DTO и отсутствие регрессий по loader/async полям в web-ответе. *(2026-03-27: `tests/unit/session-projection-dto.test.mjs` + `tests/unit/simulation-workbench-contract.test.mjs`)*
- [ ] Формализовать требования к шагам хранения в `a2a-client/storage/sessions/*`: соответствие пары `response.json` ↔ `received.json` и явные причины, если в симуляции неполный pipeline.
- [ ] Добавить client-ориентированные roadmap-сценарии в симуляции: paginated RAG в UI, очередь `read-file` с корректными attachments, human-gate после N единиц работы.

### Client Runtime Debt (Code)
- [ ] Закрыть `TODO(Task-04)` в `packages/execution/src/script-runner/index.ts`: унифицировать `execute.script` API и форму `result["script"]`.
- [ ] Интегрировать script-runner с `createExecuteCode` и согласовать sandbox/config (ссылка в TODO на Task 39).
- [ ] Убрать временный bypass в `packages/sdk/src/server/server/middleware/auth.ts` (`allow all requests`) и включить полноценную auth-проверку по окружению.
- [x] **C-06**: [P1] Cleanup Script: Create utility for cleaning up sessions older than 14 days. (Implemented: `scripts/cleanup-sessions.js`, npm scripts: `cleanup:sessions`, `cleanup:sessions:dry-run`)
- [x] **C-07**: [P3] UI Session List Optimization: Add pagination/filtering to avoid performance issues with many sessions.

### SC-09 System Message Policy (Implemented 2026-03-27)
- [x] **SC-09 system-message-policy**: Define and implement Web UI policy for `system` messages (Red Room auto-responses):
  - **Rendering**: CSS `.task-flow-message.system` with orange accent border (#ff9800), light orange background (#fff3e0), robot emoji 🤖 prefix (see `a2a-client/web/css/components/task-flow.css:200-214`)
  - **Role display**: "System" label in role header (see `a2a-client/web/js/task-flow/render.js:170-171`)
  - **Filtering**: Telemetry-only errors (metadata.type === 'error' || severity in {'error','warning'}) hidden from timeline but stored (see `isSystemErrorChatMessage()` in `render.js:43-48`)
  - **Ordering**: Chronological sequence from step slices, no reordering of system relative to user/assistant (see `applyServerMessages()` in `session-data.js:325-336`)
  - **Persistence**: All roles preserved in messages.json slice per step, non-lossy across refresh/async (see `normalizeMessage()` in `normalizers.js:28-40`)
  - **Tests**: Fixture tests in `tests/unit/history-projection.test.mjs`, `tests/unit/session-store.test.ts`
  - **Documentation**: `docs/WEB_UI_PROTOCOL.md:159-169`

### Large File Decomposition (400-500+ lines)
- [x] **LF-C-01**: Decompose `vite-plugin-a2a/routes/stepRoutes.js` (~719) into `step-routes-read.js`, `step-routes-write.js`, and shared middleware/util layer.
- [x] **LF-C-02**: Decompose `web/js/task-flow/render.js` (~1421) into focused render modules (`render-message`, `render-form`, `render-layout`, `render-state`).
- [ ] **LF-C-03**: Decompose `packages/sdk/src/server/server/routes/sessions.ts` (~1033) into route groups (session read, session mutation, async/promise endpoints).
- [ ] **LF-C-04**: Decompose `packages/rag/src/searcher/rag-searcher.ts` (~836) into query planner, chunk pipeline, ranking pipeline, and output shaping.
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
- [ ] **RF-C-04 compatibility-window**: Keep temporary bridges max 1 release cycle; then remove legacy aliases/wrappers.
- [ ] **RF-C-05 done-criteria**: Cleanup is done only if behavior is unchanged and simulation fixture matrix stays green.

### Redundancy Review Decisions (2026-03-27)
- **Owner split confirmed (keep):** `shared/web-execute-dto.mjs` remains the single implementation; `vite-plugin-a2a/routes/utils/execute-projection-dto.js` and `packages/sdk/src/server/lib/web-execute-dto.ts` remain thin boundary adapters for runtime/package separation.
- **No dead route adapters found:** split flow routes (`step-routes-*.js`) are actively referenced by `stepRoutes.js`; no safe deletion in this pass.
- **Removed obsolete compatibility note:** dropped stale mention of legacy `web-execute-dto.js` compatibility re-export from historical notes.
- **RF-C-01 inventory published:** session-module overlap inventory and consolidation candidates documented in `docs/SESSION-REDUNDANCY-INVENTORY.md`.

### Unusual Findings Alignment (Client)
- [x] **UA-C-01 polling-contract-drift**: Align documented async polling contracts between Vite Client API (`/api/a2a/sessions/:id/async`) and SDK async path variants (`/async/status/:promiseId`) to one canonical integration guide + compatibility matrix.
- [ ] **UA-C-02 debug-context-guard**: Define strict rule for `?includeContext=1` usage (debug-only), add tests that UI runtime does not depend on raw `context.workbench` fields.
- [ ] **UA-C-03 tri-role-render-tests**: Add fixture tests proving timeline/render/storage support for `user`, `assistant`, and `system` (Red Room auto-response) roles without loss/reordering.
- [ ] **UA-C-04 web-protocol-doc-cleanup**: Normalize `WEB_UI_PROTOCOL.md` wording (remove ambiguous/partial lines, keep one-term glossary for Red Room/Gray Room/Agent loop).

### Code Cleanup Discovery Plan (Client: where/how)
- [x] **CCP-C-01 where-to-scan**: Primary folders зафиксированы (`web/js/`, `vite-plugin-a2a/routes/`, `vite-plugin-a2a/routes/utils/`, `packages/sdk/src/server/server/routes/`); стартовый scan выполнен, hotspots покрываются задачами `LF-C-*`, `RF-C-*` и `CCP-C-02..05`.
- [ ] **CCP-C-02 how-to-find**: Look for duplicate logic by searching repeated responsibility keywords (`projection`, `dto`, `poll`, `session`, `execute`) across those folders.
- [ ] **CCP-C-03 bridge-detection**: Identify temporary compatibility bridges/re-exports and mark removal owner + deadline.
- [ ] **CCP-C-04 dead-path-check**: For each candidate, verify import/use coverage in tests before deletion.
- [ ] **CCP-C-05 safe-remove-gate**: Removal only after `npm test`, `sim:lint`, and targeted fixture tests pass.

## 2026-03-27 SDK HTTP Limits (C-03)

- Completed `tasks/00-c-03-sdk-http-limits.md`.
- Added standalone SDK HTTP limits profile (`cors`, in-memory `rateLimit`, `fileCap`) with env overrides in `packages/sdk/src/server/server/http-limits.ts`.
- Wired profile into standalone server path in `packages/sdk/src/server/index.ts` and `packages/sdk/src/server/server/app.ts`.
- Added contract tests in `packages/sdk/src/server/server/http-limits.test.ts`.

