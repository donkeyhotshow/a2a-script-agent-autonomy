# DEV_STATE - Общее состояние проекта (2026-03-27, verified)

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

| Подсистема | Описание | Файл состояния | Документация |
|------------|----------|----------------|--------------|
| **a2a-client** | Web UI, Client API, Session Storage | [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) | [`a2a-client/docs/*`](a2a-client/docs/) |
| **a2a-server** | Request Processing, Router, Transform | [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) | [`a2a-server/docs/*`](a2a-server/docs/) |
| **ai-integration** | AI Proxy, Ollama, Promises, Daemon | [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md) | [`ai-integration/docs/*`](ai-integration/docs/) |

---

## AI-Integration Work Lock

- Статус: **BLOCKED**.
- Все execution-задачи по `ai-integration` ведутся только в [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md).
- Работы по `ai-integration` не запускать до завершения активных задач в [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) и [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md).

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
- **Модульные DEV_STATE:** [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md), [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md), [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) — каждый должен содержать ссылки на свою документацию

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
- **Link integrity:** каждая ссылка на модульный state-файл должна вести на существующий файл. Все DEV_STATE файлы должны быть пролинкованы между собой и с документацией (AGENTS.md, SCHEMA.md, docs/*).
- **Aging control:** задачи без обновления >14 дней переносить в отдельный backlog-блок с причиной блокировки.
- **Consistency check:** минимум раз в неделю сверять `DEV_STATE.md` ↔ `docs/DEV_STATE.md` ↔ `simulations/DEV_STATE.md`.

## State Governance Protocol (Mandatory)

Этот root `DEV_STATE.md` и связанные state-файлы являются источником истины для текущего состояния разработки.

### AI Role (combined)
- System architect
- Task manager
- Executor
- State controller

### Mandatory Responsibilities
- **State updates:** после каждого значимого действия обновлять состояние, помечать завершенное как `DONE`, удалять/архивировать устаревшее, фиксировать решения и ограничения.
- **Task management:** поддерживать активные задачи, автоматически создавать следующие задачи, декомпозировать крупные, отмечать зависимости/приоритеты, фиксировать или устранять блокеры.
- **Closed loop execution:** всегда идти по циклу: analyze state -> execute max possible -> update state -> cleanup -> plan next -> milestone readiness check -> repeat.
- **State transitions:** переходы между state-документами допускаются только с фиксацией, обоснованием и отражением в source+target документах.
- **Parallel state tracks:** допускается параллельная работа по нескольким state-документам с синхронизацией shared решений и без логических конфликтов.
- **Maturity stages:** продвигать систему через `prototype -> alpha -> beta -> release-candidate -> production` с явными критериями и фиксацией переходов.

### Strict Rules
- Никаких абстрактных рассуждений без отражения в state.
- Никаких задач без статуса.
- Никаких завершений без фиксации.
- Любая неопределенность фиксируется как риск или вопрос.

### Priority Policy
- 1) Завершение начатого.
- 2) Стабилизация системы.
- 3) Подготовка к production.
- Эстетика/рефакторинг допускаются только если ускоряют production readiness.

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
- [x] **A-01 session-storage-layout**: freeze canonical session layout (step dirs only), define allowed exceptions, and document migration path for legacy artifacts.
- [x] **A-02 golden-simulations**: set a single repo-wide quality gate (`valid` vs `clean`) and align CI commands/reporting to that gate.
- [x] **A-03 upstream-service-urls**: standardize service URL env matrix for dev/CI/prod (`A2A_SERVER_URL`, `AI_HUB_URL`, Ollama/Meili ports).
- [x] **A-04 workspace-rag-packaging**: choose one packaging strategy for workspace RAG (`file:` vs registry vs git) and pin owner + rollout steps.
- [x] **A-05 simulations-base-path**: decide default vs override behavior (`SIMULATIONS_PATH`) and sync scripts/docs with chosen mode.
- [x] **A-06 ts-module-policy**: lock NodeNext import policy (`.js` suffix) as enforced convention across server/client packages.
- [x] **A-07 llm-pipeline-modes**: define production mode set (dialog/agent/task-decomposition/auto-ai) with explicit enable criteria.

### Refactoring (Moderate)
- [x] `list-directory`: Перейти на нативный `readdir({recursive: true})` (Node.js 20+).
- [x] `list-directory`: Заменить самодельный regex на `picomatch` для полноценной поддержки glob.
- [x] `list-directory`: Добавить параметры `maxDepth` и `limit` для предотвращения перегрузки.

### Simulation Contract & Docs (Complex)
- [x] Зафиксировать единый cross-repo baseline: что считаем “clean” для симуляций на уровне репозитория (`valid + 0 warnings` vs `valid + warnings`) и вынести это в единое правило для всех `DEV_STATE.md`.
- [x] Добавить агрегированный отчёт по долгам симуляций в root: топ-папки с warning-уровнем (например `orchestrator-dialog`, `phpunit-deprecations`, `task-decomposition`) и план снижения по итерациям.
- [x] Утвердить policy для golden-симуляций на уровне монорепо: полный pipeline или документированное исключение с owner/причиной/сроком.
- [x] Привязать roadmap из `simulations/SCHEMA.md` к межмодульным milestone (client + server): paginated RAG, read-file queue, human-gate chunking.
- [x] Синхронизировать state-документы модулей (`docs/DEV_STATE.md`, `simulations/DEV_STATE.md`, `a2a-client/DEV_STATE.md`, `a2a-server/DEV_STATE.md`) по единому шаблону статуса: Risks, Warning Debt, Next Tasks.

---

## Следующие задачи (Backlog, Cross-Module Only)

### Cross-Module Coordination
- [x] **CM-01**: Keep root/module state hierarchy clean: root stores only cross-module risks, decisions, and dependencies; implementation details stay in module `DEV_STATE.md`.
- [x] **CM-02**: Align simulation quality gate across modules (`valid` vs `clean`) and publish one acceptance rule for CI.
- [x] **CM-03**: Verify production env matrix consistency across client/server/ai-integration (`A2A_SERVER_URL`, `AI_HUB_URL`, auth flags, polling budgets). Baseline published in `docs/ENV-MATRIX.md`; root `.env.example` aligned (`POLL_TIMEOUT_MS=3600000`, `A2A_SERVER_URL` added).
- [x] **CM-04**: Track stage transition criteria (`beta` -> `release-candidate`) using aggregated evidence from all module states. Evidence report published: [`docs/STAGE-TRANSITION-CRITERIA.md`](docs/STAGE-TRANSITION-CRITERIA.md).
- [x] **CM-05**: Track client session-clarity alignment with simulation contracts (`simulations/dialog`, `simulations/agent-auto-ai`) and ensure no Web DTO regressions.
- [x] **CM-06**: Run quarterly cross-module redundancy review (duplicate abstractions, dead adapters, obsolete compatibility layers) and publish removal decisions in module states.
- [x] **CM-07**: Enforce tri-role dialogue contract (`user`/`assistant`/`system`) across client session storage and Web rendering; `system` messages represent Red Room auto-responses and must be preserved end-to-end.
- [x] **CM-08**: Remove duplicate/overlapping root session notes blocks and keep only cross-module facts in root history.
- [x] **CM-09**: Run docs encoding/terminology cleanup pass (mixed glyph artifacts, mixed-language drift) in high-impact protocol docs (`AGENTS.md`, Web protocol docs, simulation workflow docs).

### Code Cleanup Discovery Map (Where/How to Search)
- [ ] **CDM-01 scope-map**: Each module keeps a target list of folders for cleanup scans (hotspots only, no broad random search).
- [ ] **CDM-02 signal-set**: Search signals: duplicate adapters, legacy compatibility bridges, dead exports, unused route branches, overlapping DTO builders.
- [ ] **CDM-03 evidence-format**: For every cleanup candidate, record: `path`, `why redundant`, `usage proof`, `safe removal check`.
- [ ] **CDM-04 acceptance-gate**: Candidate can be removed only if module tests + simulation checks stay green.

### Module Task Sources (No Duplication in Root)
- Client execution backlog: [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md)
- Server execution backlog: [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md)
- AI integration execution backlog: [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md)

---

## Session Notes (Root, Cross-Module Only)

### 2026-03-27
- [x] CM-05 completed: client session-clarity alignment confirmed via fixture matrix tests and targeted simulation validation (`dialog/1-2`, `agent-auto-ai/5-7`).

### 2026-03-20
- [x] Root `request.md` output side-effect removed by transform runtime `outputDir` isolation.
- [x] State governance policy integrated and synchronized across module state files.
- [x] Root backlog normalized to cross-module ownership; module-specific tasks moved to module `DEV_STATE.md` files.
- [x] Root note cleanup done: duplicate/overlapping session-note blocks removed; client-specific history stays in `a2a-client/DEV_STATE.md`.
- [x] CM-01 completed: removed module-implementation backlog items from root and kept module task ownership in module `DEV_STATE.md` files.
- [x] CM-06 completed: quarterly cross-module redundancy review done; decisions synced in `a2a-client/DEV_STATE.md` and `a2a-server/DEV_STATE.md`.

### 2026-03-27
- [x] CM-04 completed: published cross-module stage transition criteria and readiness dashboard in `docs/STAGE-TRANSITION-CRITERIA.md`.
- [x] Transition rule formalized: stage decisions use aggregated evidence from root, client, server, and ai-integration state files.
- [x] CM-02 completed: unified simulation gate documented as `clean = valid + 0 warnings`.
- [x] CI acceptance rule aligned to one command: `npm run sim:quality` (`a2a-server/scripts/sim-quality-gate.ts`).
 
*Обновлено: 2026-03-27, hierarchy cleanup verified*