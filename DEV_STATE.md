# DEV_STATE - Общее состояние проекта (2026-03-27)

> Текущее состояние системы для работы до продакшена.
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

---

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### 1. A2A Server - STATELESS

Сервер **не хранит сессии** - только обрабатывает запросы:
- Контекст сессии передаётся в каждом запросе
- Session storage перенесён в Client API

### 2. Keyword-Based Routing

Маршрутизация использует статический keyword matching:
- Конфигурация: [`shared/router-static-choices.json`](shared/router-static-choices.json)
- Обработка: [`a2a-server/src/config/router-static.ts`](a2a-server/src/config/router-static.ts)

### 3. Action-Key Shape (ОБЯЗАТЕЛЬНО)

```json
// ✅ Правильно:
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// ❌ Неправильно:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

---

## Архитектура системы

```
┌──────────────────┐     ┌────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web UI :5173   │────▶│ Client API     │────▶│ A2A Server  │────▶│ AI Hub      │
│   (Vite + API)   │     │ :5173/api/a2a  │     │ :3000       │     │ :11434      │
└──────────────────┘     └───────┬────────┘     └──────┬──────┘     └──────┬──────┘
                                 │                    │                   │
                                 ▼                    │                   ▼
                        ┌───────────────┐            │             ┌─────────────┐
                        │   storage/    │            │             │   Ollama    │
                        │  (sessions)   │            │             │   :11435    │
                        └───────────────┘            │             └─────────────┘
                                                   │
                                              (stateless)
```

---

## Ports

| Порт | Компонент | Описание |
|------|-----------|----------|
| 11435 | Ollama | Локальная LLM |
| 11434 | AI Integration | Прокси / promise → Ollama |
| 3000 | a2a-server | A2A API сервер (stateless) |
| 5173 | Vite Dev | Web UI + Client API |

---

## Переменные окружения

```bash
# Development
SKIP_AUTH=1
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=12345678901234567890123456789012
DEFAULT_SYNC_MODE=1
```

---

## Быстрый старт

### Windows

```bash
# Запуск всех компонентов
start-all.bat

# Проверка
curl http://localhost:3000/health
curl http://localhost:5173/api/a2a/projects
```

### Docker (AI Integration)

```bash
cd ai-integration
docker-compose up -d
```

---

## Подсистемы

| Подсистема | Описание | Файл состояния |
|------------|----------|-----------------|
| **a2a-client** | Web UI, Client API, Session Storage | [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) |
| **a2a-server** | Request Processing, Router, Transform | [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) |
| **ai-integration** | AI Proxy, Ollama, Promises, Daemon | [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md) |

---

## Проверка работоспособности

```bash
# Server (stateless)
curl http://localhost:3000/health
# {"status":"ok","mode":"stateless"}

# AI Integration
curl http://localhost:11434/health

# Ollama
curl http://localhost:11435/api/tags

# Client API (Vite proxy)
curl http://localhost:5173/api/a2a/projects
```

---

## Тестирование

### Simulations (from repo root)

```bash
# Lint
npm run sim:lint -- --all --json

# Validate
npm run sim:validate -- --all --json
```

### Unit tests

```bash
# a2a-server
cd a2a-server && npm run test

# a2a-client
cd a2a-client && npm test
```

---

## Ссылки

- [AGENTS.md](AGENTS.md) - Правила работы агентов, включая Operational Protocol
- [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) - Протокол
- [a2a-server/docs/production/FULL_LAUNCH_PLAN.md](a2a-server/docs/production/FULL_LAUNCH_PLAN.md) - Полный план запуска
- [simulations/SCHEMA.md](simulations/SCHEMA.md) - Симуляции

---

## Известные проблемы

- `sim:validate` часто возвращает `valid` вместе с warning (`Optional file not found`) — это contract debt, не “clean” статус.
- [ИСПРАВЛЕНО] В таблице подсистем была ссылка на `ai-integration/DEV_STATE.md`, но файл отсутствовал - создан.

---

## DEV_STATE Usage Rules

- **Source of truth:** каждый модуль ведет свой `DEV_STATE.md`; root фиксирует только кросс-модульные риски, решения и зависимости.
- **When to update:** обновлять в начале и в конце каждой рабочей сессии, плюс при любом изменении статуса риска/задачи.
- **Task quality:** каждая задача должна быть проверяемой (что сделать, где, как проверить), без общих формулировок.
- **Status model:** использовать два уровня качества для симуляций: `valid` (структурно) и `clean` (без warnings).
- **Ownership:** у каждой P0/P1 задачи должен быть владелец (модуль) и целевой этап (Phase / milestone).

## DEV_STATE Hygiene & Cleanup Requirements

- **Mandatory cleanup:** удалять устаревшие/дублирующие пункты после закрытия, не оставлять “мертвые” roadmap-элементы.
- **No contradiction:** нельзя одновременно держать “No active problems” и открытый технический долг в том же файле.
- **Link integrity:** каждая ссылка на модульный state-файл должна вести на существующий файл.
- **Aging control:** задачи без обновления >14 дней переносить в отдельный backlog-блок с причиной блокировки.
- **Consistency check:** минимум раз в неделю сверять `DEV_STATE.md` ↔ `docs/DEV_STATE.md` ↔ `simulations/DEV_STATE.md`.

---

## Roadmap (Simple → Complex)

### Фаза 1: Окружение (Simple)
- [x] Проверка портов (`11435`, `11434`, `3000`, `5173`).
- [x] Валидация `ENCRYPTION_KEY` (строго 32 символа) во всех `.env`.
- [x] Проверка доступности моделей в Ollama (`qwen3:8b`).

### Фаза 2: Валидация компонентов (Moderate)
- [x] Исправление `ReferenceError: require` в `stepRoutes.js`.
- [x] Исправление путей `/shared` в `vite-plugin-a2a.js`.
- [x] Запуск unit-тестов сервера: `cd a2a-server && npm run test`.
- [x] Запуск unit-тестов клиента: `cd a2a-client && npm run test`.

### Фаза 3: Протокол и Симуляции (Complex)
- [x] Аудит симуляций на соответствие `Action-Key Shape` (никаких `content` в корне `result`).
- [x] Очистка `received.json` от клиентских ключей (`read-file`, `rag-search` и т.д. запрещены в `execute`).
- [x] Полный прогон: `npm run sim:validate -- --all --json`.

### Фаза 4: Сквозное тестирование (E2E)
- [x] Ручной Smoke-тест: Создание сессии → Диалог → Обработка ответа.
- [x] Проверка сохранения шагов в `storage/sessions` (stateless-режим).
- [x] Проверка работы Polling с новыми логами в консоли.

### Фаза 5: Production Readiness
- [x] Сборка фронтенда: `cd a2a-client && npm run build` - **исправлено** (picomatch установлен).
- [x] Проверка `SKIP_AUTH=0` (безопасность).
- [x] Финальный `health-check` всей цепочки.
- [x] E2E тестирование: сессия → диалог → agent mode (Ollama работает).

---

## Технический долг и новые задачи

### Alternatives Migration Plan (cross-repo execution)
- [ ] **A-01 session-storage-layout**: freeze canonical session layout (step dirs only), define allowed exceptions, and document migration path for legacy artifacts.
- [ ] **A-02 golden-simulations**: set a single repo-wide quality gate (`valid` vs `clean`) and align CI commands/reporting to that gate.
- [ ] **A-03 upstream-service-urls**: standardize service URL env matrix for dev/CI/prod (`A2A_SERVER_URL`, `AI_HUB_URL`, Ollama/Meili ports).
- [ ] **A-04 workspace-rag-packaging**: choose one packaging strategy for workspace RAG (`file:` vs registry vs git) and pin owner + rollout steps.
- [ ] **A-05 simulations-base-path**: decide default vs override behavior (`SIMULATIONS_PATH`) and sync scripts/docs with chosen mode.
- [ ] **A-06 ts-module-policy**: lock NodeNext import policy (`.js` suffix) as enforced convention across server/client packages.
- [ ] **A-07 llm-pipeline-modes**: define production mode set (dialog/agent/task-decomposition/auto-ai) with explicit enable criteria.

### Refactoring (Moderate)
- [ ] `list-directory`: Перейти на нативный `readdir({recursive: true})` (Node.js 20+).
- [x] `list-directory`: Заменить самодельный regex на `picomatch` для полноценной поддержки glob.
- [x] `list-directory`: Добавить параметры `maxDepth` и `limit` для предотвращения перегрузки.

### AI Integration & Architecture (Complex)
- [x] Документировать REST-поток тикетов (`/promises/pending` -> `/promise/<id>/execute`) - см. `ai-integration/docs/AI-INTEGRATION-UI.md`
- [ ] Восстановить/создать `ai-integration/DEV_STATE.md` и синхронизировать ссылку в таблице подсистем (сейчас ссылка есть, файла в workspace нет).

### Simulation Contract & Docs (Complex)
- [ ] Зафиксировать единый cross-repo baseline: что считаем “clean” для симуляций на уровне репозитория (`valid + 0 warnings` vs `valid + warnings`) и вынести это в единое правило для всех `DEV_STATE.md`.
- [ ] Добавить агрегированный отчёт по долгам симуляций в root: топ-папки с warning-уровнем (например `orchestrator-dialog`, `phpunit-deprecations`, `task-decomposition`) и план снижения по итерациям.
- [ ] Утвердить policy для golden-симуляций на уровне монорепо: полный pipeline или документированное исключение с owner/причиной/сроком.
- [ ] Привязать roadmap из `simulations/SCHEMA.md` к межмодульным milestone (client + server): paginated RAG, read-file queue, human-gate chunking.
- [ ] Синхронизировать state-документы модулей (`docs/DEV_STATE.md`, `simulations/DEV_STATE.md`, `a2a-client/DEV_STATE.md`, `a2a-server/DEV_STATE.md`) по единому шаблону статуса: Risks, Warning Debt, Next Tasks.

---

*Обновлено: 2026-03-27*

### Session Notes (2026-03-27)
- [x] Root `request.md` duplicate source identified: request transform runtime defaulted output writes to repo root.
- [x] Normalized transform runtime with dedicated `outputDir` option; dialog request transforms now write generated markdown to temp dir only.

### Session Notes (2026-03-27) - Продолжение
- [x] Проверены health checks: Ollama (11435), AI Hub (11434), A2A Server (3000), Vite/Client API (5173)
- [x] Проверено наличие ai-integration/DEV_STATE.md - файл существует
- [x] Добавлены параметры maxDepth и limit в list-directory action
- [x] Проверена корректность ссылки в таблице подсистем (ai-integration)
- [x] Unit tests: 437 passed
- [x] Simulations lint: 89 passed
- [x] E2E тест: полный цикл dialog работает
- [x] E2E тест: полный цикл dialog работает

### Session Notes (2026-03-27) - Client Session Modernization
- [x] Added unified projection modules: `session-projection-dto.js`, `execute-projection-dto.js`.
- [x] Added deterministic timeline builder `message-timeline.js` with explicit source order.
- [x] Migrated Vite routes to projection modules; kept `web-*dto.js` as compatibility bridges.
- [x] Switched web hydration defaults to projected payload (`includeContext` only by explicit debug request).
- [x] Added modernization task docs under `tasks/00` ... `tasks/05`.
- [x] Validation: unit tests pass; `sim:lint --all` pass; `sim:validate --sim agent-coder/3` pass.