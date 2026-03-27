# DEV_STATE - a2a-client (2026-03-27)

Текущее состояние подсистемы a2a-client (Web UI + Client API).
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

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

- [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) - Протокол
- [AGENTS.md](AGENTS.md) - Правила работы
- [docs/LOADER-BEHAVIOR.md](docs/LOADER-BEHAVIOR.md) - Поведение лоадера

---

## Задачи (Next Tasks)

### Alternatives Migration Plan (client scope)
- [ ] **C-01 client-filesystem-root**: choose and document canonical `A2A_CLIENT_STORAGE_DIR` strategy (repo-local vs home) for dev and CI.
- [ ] **C-02 session-storage-layout**: formalize step-folder invariants (`client-result`, `request-to-server`, `server-response`, `messages`) and recovery rules.
- [ ] **C-03 sdk-http-limits**: define default CORS/rate-limit/file-cap profile for standalone SDK mode and add contract tests.
- [ ] **C-04 golden-simulations**: add client-focused simulation checklist for sanitized web DTOs (`execute` must stay web-safe).
- [ ] **C-05 simulations-base-path**: align client test tooling with selected simulations path strategy (`SIMULATIONS_PATH` override support).

### Высокий приоритет (Phase 2-3)
- [x] Проверка ESM `import http` в `stepRoutes.js`.
- [x] Аудит `toWebExecute` - убедиться, что клиентские данные (`rag-search`, `read-file`) не просачиваются в JSON.
- [x] Очистка `storage/sessions` (удалить тестовые сессии).

### Средний приоритет (Phase 4-5)
- [x] Сборка фронтенда: `npm run build`.
- [x] Smoke-тест: сессия → диалог → завершение (Ollama работает).
- [x] Проверка `LOADER-BEHAVIOR` (минимальное время 5 сек).

### Simulation Contract & Docs (Complex)
- [ ] Добавить client-specific checklist для `received.json`: в `execute` допускаются только web-safe поля (`message`/`form`/attachments), tool-actions (`read-file`, `rag-search`, `write-file`, `run-script`) должны оставаться вне `execute`.
- [ ] Завести отдельный контроль для `buildWebExecute` / `toWebExecute`: golden-проверки на sanitized DTO и отсутствие регрессий по loader/async полям в web-ответе.
- [ ] Формализовать требования к шагам хранения в `a2a-client/storage/sessions/*`: соответствие пары `response.json` ↔ `received.json` и явные причины, если в симуляции неполный pipeline.
- [ ] Добавить client-ориентированные roadmap-сценарии в симуляции: paginated RAG в UI, очередь `read-file` с корректными attachments, human-gate после N единиц работы.

### Client Runtime Debt (Code)
- [ ] Закрыть `TODO(Task-04)` в `packages/execution/src/script-runner/index.ts`: унифицировать `execute.script` API и форму `result["script"]`.
- [ ] Интегрировать script-runner с `createExecuteCode` и согласовать sandbox/config (ссылка в TODO на Task 39).
- [ ] Убрать временный bypass в `packages/sdk/src/server/server/middleware/auth.ts` (`allow all requests`) и включить полноценную auth-проверку по окружению.

---

## 2026-03-27 Обновления

### Исправления
- ✅ Исправлен `vite.config.prod.ts`: удалены несуществующие Vue компоненты
- ✅ Заменён `minify: 'terser'` на `minify: 'esbuild'`
- ✅ Сборка проходит успешно
- ✅ Очищены тестовые сессии

### E2E Тестирование
- ✅ Ollama запущен и работает (порт 11435)
- ✅ Создание сессии → работает
- ✅ Отправка сообщения → async mode → работает
- ✅ Polling `/async` endpoint → работает
- ✅ Выбор agent mode → работает

---

*Обновлено: 2026-03-27*

## 2026-03-27 Client Session Modernization (in progress)

### Completed now
- Added `vite-plugin-a2a/routes/utils/session-projection-dto.js` (canonical -> UI projection boundary).
- Added `vite-plugin-a2a/routes/utils/execute-projection-dto.js` and compatibility re-exports in legacy `web-execute-dto.js`.
- Added deterministic timeline utility `vite-plugin-a2a/routes/utils/message-timeline.js`.
- Migrated imports in session/step routes and step handlers to projection modules.
- Updated web hydration defaults in `web/js/session-store.js` and `web/js/app/windows/window-session-gateway.js`.
- Added task documents under `tasks/00-05` with atomic actions and reasons.
- Updated docs for canonical/projection split (`docs/WEB_UI_PROTOCOL.md`, `docs/session-management-protocols.md`, `simulations/SCHEMA.md`).

### Verification
- `npx vitest run tests/unit/vite-plugin-storage.test.js tests/unit/web-execute-dto.test.mjs` -> pass.
- `npm run sim:lint -- --all --json` -> pass.
- `npm run sim:validate -- --sim agent-coder/3 --json` -> pass.