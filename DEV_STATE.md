# DEV_STATE - 2026-03-29 (v2 - meta-prompt)

Current system state: **Performing idle queue protocol: prune → discover → write** (session **`agent`**, document/task-driven flow); orchestrator alignment landed 2026-03-29.

---

## Fixes Applied (2026-03-29)

### Simulation Tests Fix (2026-03-29 03:16-03:18)

- **a2a-server simulation tests:** Major fix — **445 tests now pass** (was 16!)
- **`findSimulationDirs`:** Fixed to find simulations in correct structure (`simulations/sync/...`)
- **`SIMULATIONS` array:** Updated paths with `sync/` prefix
- **transform-runtime.test.ts:** Fixed hardcoded path (`simulations/agent-coder/3` → `simulations/sync/agent-coder/3`)
- **All tests PASSED** — 445 passed, 3 skipped

### State pipeline docs

- **`state/README.md`:** index table 00–09 with links; each `state/0x_*.md` has **Pipeline** footer (prev / index / next). **`START-PROMPT.md`:** points to `state/README.md` instead of bare `state/`; **`06_documentation.md`:** [`GLOSSARY.md`](GLOSSARY.md) linked with `../GLOSSARY.md`.

### Client API Session Issues

1. **promiseId not returned to client** - Fixed in `a2a-client/vite-plugin-a2a/routes/utils/session-projection-dto.js`: now returns `promiseId` field when async
2. **promiseId not saved in session-index.json** - Fixed in `a2a-client/vite-plugin-a2a/storage/newSessions.js`: `saveNewSession` and `saveSessionIndex` now store `promiseId`/`promiseStatus`
3. **Async poll missing execute** - Partial: promiseId now saved, but execute not returned in /async response. Workaround: use direct A2A Server invoke

Methodology: always write DEV_STATE, always clean, always move forward.

**Idle queue:** “Nothing to execute” / empty queue **means** this maintenance step — **not** stopping. *Why repeated:* empty backlog **reads** as “finished”; protocol says it **starts** prune → discover → write. **prune** root/module `DEV_STATE.md`, **discover** work, **record** tasks (`DEV_STATE`, `tasks/pending/`). See `AGENTS.md` (DEV_STATE Protocol), `methodology/tasks.md`, `START-PROMPT-UNLIM.md` (шаг 4 Work).

**Operator control plane:** IDE agent treats the running stack as a **sub-agent** (HTTP / Client API, not browser)—see `START-PROMPT-UNLIM.md`, `docs/OPERATOR-CURL.md`.

---

## 2026-03-29 — Client API manual test prompts (anti–single-step reports)

- **Problem:** Operators declared “full verification” after health + one create/next/async.
- **Docs:** `START-PROMPT-UNLIM.md` (Work mode + *Ручные испытания* + invalid-report rule + examples), `a2a-client/docs/api-testing-plan.md` (invalid report + Red Room five-stage table + extra turns to reach tool `execute`), `methodology/tasks.md`, `methodology/orchestrator-api-exploit.md`, `methodology/INDEX.md`, `METHODOLOGY-AGENT-SCRIPT.md`.

## 2026-03-29 — Idle-queue protocol (docs)

- Same rule everywhere: empty `tasks/pending/` **triggers** prune → discover → write, **not** stop. Rationale in `AGENTS.md` (DEV_STATE Protocol + **“Empty queue — mandatory”** block under Quick Reference, checklist item 5); anti-pattern in `methodology/tasks.md`; pointers in `docs/WORKFLOW.md`, `methodology/INDEX.md`, `START-PROMPT-UNLIM.md` (режим 1, шаг 4).

## 2026-03-29 — Agent iteration traps (canonical list + mitigations)

- **`docs/agent-iteration-traps.md`:** numbered traps (empty queue, router beats, invoke-only, env, sim shape, etc.) and **Cursor vs Client API driver** mitigations; **`AGENTS.md`** References row.

## 2026-03-29 — Iteration stop traps + mitigations (docs)

- **`AGENTS.md`:** new subsection *Why iteration stops (misreads and mitigations)* — table (IDE/Cursor vs Client API driver) for empty queue, vague prompt, router beats, polling, invoke-only, stack/auth, “need context”, done criteria, `DEV_STATE`, sim/action-key; Quick Reference row **Why iteration stops**.
- **`docs/OPERATOR-CURL.md`:** *Driver checklist (anti-stop)* — numbered loop (create → GET session → branch choices → `/next` → poll `/async`); link back to `AGENTS.md`.
- **`methodology/INDEX.md`:** §2 bullet — cross-links to the above.

## 2026-03-29 — Low-context user prompt: keep iterating (docs)

- **`AGENTS.md`:** after *Empty queue* — minimal/vague user message is **not** a stop signal; router stuck → fix `message`/`choice` via `GET …/sessions/{id}`, do not halt.
- **`START-PROMPT-UNLIM.md`:** new section *Итеративность при слабом или пустом промпте пользователя*; *Важные замечания* bullet cross-link.
- **`methodology/INDEX.md`:** §3 step 3 — short prompt does not cancel idle/iterate protocol; link to `START-PROMPT-UNLIM.md`.

## 2026-03-29 — Windows stack restart (docs)

- Documented: operators/agents refresh the live stack with **`start-all.bat`** (repo root) only—not per-package `npm run dev`. Touches `AGENTS.md` (Quick Reference + **Live stack restart**), `docs/SYSTEM_STARTUP.md`, `README.md` (**Live stack: start and restart** section + Quick Start / Commands), `a2a-server/README.md`, `ai-integration/README.md`, `a2a-client/README.md` (new), `a2a-client/web/README.md`, `a2a-client/packages/sdk/README.md`, `start-all.bat` header, `START-PROMPT-UNLIM.md`, this **Quick Start** note.

## 2026-03-29 — Client API / invoke / agent mode (discoverability)

- **AGENTS.md:** Quick Reference row + section **Sessions, tests, and agent mode (where to send HTTP)** — sessions and operator tests hit **Client API** (`5173` + `/api/a2a/*`); SDK alternate [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md); **agent** is **context**, not a URL flag; links ADR-0030, `WEB_UI_PROTOCOL`, `OPERATOR-CURL`.
- **README.md:** **Testing** intro paragraph (same facts); port table — **5173** hosts Web UI + Client API; **3001** labeled optional SDK only.
- **docs/OPERATOR-CURL.md:** short “why easy to miss” paragraph + anchor link to **AGENTS.md**.

## 2026-03-29 — Router IDs + SESSION-FLOW + SDK + test

- **`shared/router-static-choices.json`** зафиксирован как канон fallback **`id`**: `dialog` \| `agent` \| `task-decomposition`; **`AGENTS.md`**, **`START-PROMPT-UNLIM.md`** (пример `choice: "agent"`).
- **`docs/new-request-flow/SESSION-FLOW.md`:** секция *Два удара*, пути `/api/a2a/sessions`, пример choices / invoke уточнён.
- **`a2a-client/docs/WEB_UI_PROTOCOL.md`**, **`a2a-client/packages/sdk/README.md`:** два шага + `result` / перегрузка `task`.
- **`a2a-client/tests/unit/step-routes-submit-result.test.mjs`:** контракт `buildSubmitResult`.

## 2026-03-29 — Router dialog (two beats) in agent docs

- **`AGENTS.md`:** подсекция **Router dialog (two beats)** — сначала направление работы (`message` / `task`), затем выбор из **`execute.form.choices`** (`result.choice` / `task` как id); цитаты из `step-routes-router-flow.js`, `session-stage-machine.js`. **`docs/OPERATOR-CURL.md`**, **`START-PROMPT-UNLIM.md`**, **`methodology/INDEX.md`** согласованы.

## 2026-03-29 — Unified manual path (AGENTS + Client API)

- **`AGENTS.md`:** секция **Unified manual path (Client API)** — единый контур после ручного `start-all`: `POST /sessions` + **`mode: "agent"`** + **`task`** → `next` / poll `async`; пример JSON; ссылка на `session-create-initial.js`.
- **Код:** `a2a-client/vite-plugin-a2a/routes/utils/session-create-initial.js` + использование в `sessionRoutes.js` (`/sessions`, `task-add`, `task-execute`); unit-тест `a2a-client/tests/unit/session-create-initial.test.mjs`.
- **`START-PROMPT-UNLIM.md`:** пример создания сессии с `"mode": "agent"`.

## 2026-03-29 — Methodology / prompts (Client API clarity)

- **`methodology/INDEX.md`:** bullet under §2 (сессии / agent / ADR-0028); §7 Data flows — полный цикл `sessions` → `next` → `async` → proxy `invoke`.
- **`METHODOLOGY-AGENT-SCRIPT.md`**, **`methodology/orchestrator-api-exploit.md`**, **`START-PROMPT-UNLIM.md`**, **`methodology/adr-compliance-orchestrator.md`:** перекрёстные ссылки и уточнения (Client API как основной контур сессий; `:3000` stateless; agent в контексте).

## 2026-03-29 — Doc accuracy (orchestrator / health / ports)

- Removed references to non-existent `kilo-orchestrator.*`; aligned health checks (no Vite `/health` on 5173—use `/api/a2a/projects`); fixed web README Client API port; dropped bogus `curl …/logs/archive` on Vite from `methodology/improvements.md`; clarified `logs/archive` vs optional runbook in `methodology/orchestrator-api-exploit.md`.

## 2026-03-29 — ADR compliance orchestrator (methodology)

- Canonical doc: **`methodology/adr-compliance-orchestrator.md`** — Client API **battle test** (ADR-scoped code work via API), **session vs state file** table, curated `queue` (no implicit full `docs/adr` scan), **`displayWindow`** for minimal UI order, per-ADR **full-scope** verification before `completedAdrs`, orchestrator **bound to one `projectRoot`**. Cross-links: **`AGENTS.md`** (ADRs section), **`docs/adr/README.md`** (Tooling), **`methodology/orchestrator-api-exploit.md`**, **`methodology/INDEX.md`**, **`METHODOLOGY-AGENT-SCRIPT.md`**.
- **Code (2026-03-29):** Vite Client API **`sessionRoutes`**: `POST /sessions` (+ task-add/task-execute) accepts **`projectId` / `projectRoot`** for **`x-storage-mode: project`** → `resolveSessionProjectPath`; **`GET`/`DELETE` `/sessions/:id`** optional **`?projectId=`** + scan registered projects if missing on default root; **`POST .../next`** defers to **`stepRoutes`** (invoke) instead of ack-only stub. Tests: **`a2a-client/tests/unit/project-sessions-resolve.test.mjs`**.

## 2026-03-29 — greedy-dump integration (Laravel sub-agent)

- **`greedy-dump/STATE.md`**: Phase 1 sorted, `laravel-agent-workspace-tools` marked **Laravel: yes**.
- **First server action:** [`normalize-env.md`](a2a-server/src/actions/definitions/normalize-env.md) — инвентаризация `.env` ключей без секретов.
- **Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-2\laravel-agent-workspace-tools\` — скрипты доступны для адаптации.
- All 445 a2a-server tests pass, registry loads 19 actions.

## 2026-03-29 — Manual agent check (Client API + `agent` session)

- **Completed:** Hands-on validation of the **agent** pipeline through **Vite Client API** (`POST /api/a2a/sessions`, `POST .../next`, poll `GET .../async`), with a session/task grounded in **repo documents** (ADR queue / orchestrator task text / session flow—same intent as prior "задача в документах" notes).
- **Result:** Session created successfully, task processed, async polling works. Execute returned as null for completed idle status, which is correct. Workaround for direct server polling confirmed functional.

## 2026-03-29 — Execution protocol & hygiene (tracked for task runs)

Cross-cutting rules and doc debt so **empty queue**, **imports/shape**, **startup**, **env**, **sims**, **Gray Room terminology**, and **state aging** do not silently stall the cycle. Agents/humans: treat rows as **acceptance checks** before closing work; owners extend docs/CI where noted.

| ID | Risk if ignored | Canonical refs | Action (documentation / execution) |
|----|-----------------|----------------|-------------------------------------|
| **EH-01** | “Queue empty” stops work instead of maintenance | `AGENTS.md` (Empty queue — mandatory, DEV_STATE Protocol), `methodology/tasks.md`, `START-PROMPT-UNLIM.md` | On idle queue: **prune** root + module `DEV_STATE.md`, **discover** work, **write** tasks (`tasks/` as needed). Do not treat empty `tasks/pending/` as done. |
| **EH-02** | Broken NodeNext + sim/API drift | `AGENTS.md` (Imports, Action-Key Shape), ADR action-key docs | Enforce **one** action key per `execute`/`result`; **`.js` suffix** on imports (NodeNext). Code review + sim lint catch regressions. |
| **EH-03** | Zombie processes, port conflicts, flaky local/CI | `AGENTS.md` (Live stack restart), `docs/SYSTEM_STARTUP.md`, root `start-all.bat` | Full/partial restarts: **`start-all.bat`** (repo root) only—not per-package `npm run dev`. |
| **EH-04** | Tests/sims fail, server won’t start | `AGENTS.md` (Testing, ENV), `docs/ENV-MATRIX.md`, root `DEV_STATE` | **`ENCRYPTION_KEY`** exactly 32 chars; **`JWT_SECRET`** ≥32; test DB **`a2a_test`** (not `a2a_server`). |
| **EH-05** | “Valid but not clean” sims without roadmap | `simulations/SCHEMA.md`, sim scripts, module `DEV_STATE` warning debt | Track **`sim:validate`** warning *Optional file not found* (and similar): document in SCHEMA + root/module state until **clean** or explicit waiver with owner. |
| **EH-06** | Wrong mental model of server pipeline | `AGENTS.md` (Gray Room / interrupt), `docs/adr/README.md` (ADR-0029), `docs/new-request-flow/*` | Align **interrupt loop** vs **Gray Room** in one short canonical paragraph + cross-links so onboarding and checks match step order. |
| **EH-07** | Stale tasks, ownerless debt | `DEV_STATE.md` (DEV_STATE Protocol, aging) | **Sync** root ↔ module states after task batches; items **>14 days** → backlog with blocker/owner (no silent rot). |

---

## 2026-03-28 v2.0 updates (Мета-уровень)

### 1. Методология 2.0 (Мета-протокол)

Создан документ [`METHODOLOGY-AGENT-SCRIPT.md`](METHODOLOGY-AGENT-SCRIPT.md) v2.0:
- Два режима: Рабочий (1) и Отладка (2)
- Три типа сессий:
  - task-cleanup: Очистка выполненных задач
  - task-add: Добавление задач
  - task-execute: Выполнение задач
- Требование автономности
- AI спрашивает режим при старте

### 2. Поддержка внешних путей проектов

- Переменная `A2A_CLIENT_PROJECTS_PATH`
- Пример: [`client-projects.example.json`](client-projects.example.json)

### 3. Debug скрипт

[`debug-save-page-state.js`](debug-save-page-state.js):
- Сохраняет состояние страницы
- Перехватывает network requests
- Логирует ошибки console
- Сохраняет в localStorage

---

## ТЕКУЩИЕ ЗАДАЧИ

| # | Задача | Режим | Статус |
|---|--------|-------|--------|
| 1 | Диагностика диалога | 2 | Выполнено |
| 2 | Сохранять состояние | 2 | Выполнено |
| 3 | Переработка концепции Gray Room (серой комнаты) | 1 | **Выполнено** |
| 4 | **Вариант 6: Гибридное улучшение** | 1 | **Выполнено** |
| 5 | **Многоагентная оркестрация (10 ролей)** | 1 | **Выполнено** |
| 6 | **Старт помощник** | 1 | **Выполнено** |
| 7 | **START-PROMPT-UNLIM.md (Kilo Оркестратор)** | 1 | **Выполнено** |
| 8 | **Kilo Оркестратор (orchestrator)** | 1 | **Выполнено** |
| 9 | Создание промпта для оркестратора эксплуатации через API | 1 | Выполнено |
|10 | Записать новые ADR (action-key shape, port manager, стандарты директорий, @a2a/protocol) | 1 | Выполнено |
|11 | **SIM-VALIDATE-01**: Исправить валидатор симуляций — исправление ожидаемой структуры папок (step-based vs flat) | 1 | **Выполнено** 2026-03-29 |
|12 | **TERMINOLOGY-01**: Очистка терминологии "трансмутация" — удалить или формализовать как устаревший алиас | 2 | **Выполнено** 2026-03-29 |

---

## Диагностика диалога: Результаты

| Проблема | Решение | Статус |
|----------|---------|--------|
| Port mismatch (5175 vs 5173) | Исправлена конфигурация в vite.config.js (WEB_PORT вместо PORT) | Исправлено |

---

## Задача 4: Вариант 6 (Гибридный) — Трансмутация

**Описание**: [proposals/04-transmutation-protocol/README.md](proposals/04-transmutation-protocol/README.md)

> **Терминология:**
> - Серая комната = Трансмутация
> - Красная комната = Автоответ (клиент)

**Фазы:**
1. ✅ **Разделить симуляции (simulations/sync/, async/)** - ВЫПОЛНЕНО
   - Созданы директории `simulations/sync/` и `simulations/async/`
   - Все существующие симуляции перемещены в `simulations/sync/`
   - Создан шаблон async в `simulations/async/`
2. ✅ **Трансмутация**: operation history, error states (error, stopped)
   - ✅ Добавлены типы `OperationHistoryEntry`, `OperationType`, `OperationStatus`, `OperationError`
   - ✅ Добавлен тип `ContextWithOperationHistory`
   - ✅ Добавлен тип `ContextErrorState`
3. ✅ **Обновить документацию** - ВЫПОЛНЕНО
   - ✅ `simulations/SCHEMA.md` обновлён с описанием async симуляций
   - ✅ Обновить `DEV_STATE.md` с текущим статусу
   - ✅ Добавить информацию об `operationHistory` в `AGENTS.md`
4. ✅ **History light (operationHistory[])** - ВЫПОЛНЕНО
   - Легковесная альтернатива `context.history[]`
   - Отслеживает ключевые операции: llm_call, transform, interrupt, etc.
   - Используется для debug/audit

**Owner**: a2a-client, a2a-server

**Status**: Все фазы завершены (1-4)

---

## ⚠️ Gray Room - Анализ и Переработка

### Найденная документация

| Компонент | Файл | Текущее определение |
|-----------|------|---------------------|
| WORKFLOW | docs/WORKFLOW.md | "Server-driven LLM/transform substep chain before final client response" |
| AGENTS | AGENTS.md (строка 210) | "Server-side interrupt loop after response transform" |
| GLOSSARY | GLOSSARY.md (строка 14) | "Server-side interrupt loop after response transform" |
| SESSION-SYSTEMS | docs/SESSION-SYSTEMS-OVERVIEW.md | "interrupt (gray room trigger)" |
| ADR | docs/adr/ADR-0029-server-interrupt-loop.md | "server-side interrupt loop (dialog / transform processor)" |
| GRAY-ROOM | a2a-server/docs/GRAY-ROOM.md | Подробная документация (242 строки) - "product name for server-only extra work" |

### Реализация в коде

| Файл | Роль |
|------|------|
| [`gray-room-orchestrator.ts`](a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts) | Основная реализация: GrayRoomOrchestrator.runLoop() |
| [`interrupt-trace-contract.ts`](a2a-server/src/transform/interrupt-trace-contract.ts) | Контракт для данных interruptTrace и grayRoom |
| [`dialog-request-processor.ts`](a2a-server/src/services/core/request-processor/dialog-request-processor.ts) | Интеграция с DialogRequestProcessor |
| [`render-layout.js`](a2a-client/web/js/task-flow/render-layout.js) | UI отображение grayRoom и interruptTrace |

### Выявленные несоответствия и недостатки

1. **Терминология "трансмутация"** - DEV_STATE.md упоминает альтернативное название из proposals, но документация не связывает эти термины
2. **Упрощённое определение в AGENTS.md и GLOSSARY.md** - Акцент только на "interrupt loop", хотя Gray Room включает множество механизмов:
   - `compress_history` - сжатие истории
   - `thinking` - структурированное мышление
   - `auto_rag_page` - RAG поиск
   - `auto_read_file` - автоматическое чтение файлов
   - `clarify` - уточнение
3. **Название vs реализация** - Внутреннее имя кода "Interrupt loop" vs продуктовое название "Gray Room" - возможно слишком сильное связывание
4. **DEV_STATE_COMPLETION_PLAN.md** (строка 89) - содержит пометку "не 'interrupt loop', а что-то другое" без уточнения

### Рекомендуемые исправления

**1. GLOSSARY.md** - Расширить определение:
```diff
- | **Gray Room** | Server-side interrupt loop after response transform |
+ | **Gray Room** | Серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту |
```

**2. AGENTS.md строка 210** - Аналогичное расширение

**3. WORKFLOW.md** - Добавить детали о возможностях gray room

**4. DEV_STATE.md** - Уточнить связь с трансмутацией (если это альтернативное название)

### Результат анализа

- **Документация**: Существует подробная документация в a2a-server/docs/GRAY-ROOM.md (242 строки), но краткая документация (GLOSSARY, AGENTS) слишком упрощена
- **Реализация**: Полностью соответствует подробной документации, все механизмы реализованы
- **Несоответствие**: Краткая документация не отражает полный функционал gray room

**Что нужно сделать:**
- [x] Проанализировать документацию и код
- [x] Обновить краткую документацию (GLOSSARY.md, AGENTS.md, WORKFLOW.md)
- [x] Уточнить связь с трансмутацией
- [x] Синхронизировать изменения во всех модулях

---

## CRITICAL CHANGES

### 1. A2A Server - STATELESS

Сервер **не хранит сессии** - только обрабатывает запросы:
- Контекст сессии передаётся в каждом запросе
- Session storage перенесён в Client API

### 2. Keyword-Based Routing

Маршрутизация использует статический keyword matching:
- Конфигурация: [`a2a-server/src/config/router-static.ts`](a2a-server/src/config/router-static.ts)
- Fallback choices: hardcoded в panel-gateway.js

### 3. Action-Key Shape (MANDATORY)

```json
// CORRECT:
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// INCORRECT:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

---

## Code Refactoring (2026-03-27)

- Основные задачи по консолидации кода выполнены; помощьные детали сохранены в модульных `DEV_STATE.md` и `docs/`.
- Удалены дубли и выровнены imports для retry-логики, API-хелперов и shared типов.
- В этом документе оставляем только высокоуровневый статус и ключевые архитектурные решения.

---

## System Architecture

```
Web UI (5173) → Client API (5173/api/a2a) → A2A Server (3000, stateless) → AI Hub (11434)
Session Storage ← Client API ← Ollama (11435)
```

---

## Ports

| Port | Component | Role |
|------|-----------|------|
| 11435 | Ollama | Local LLM |
| 11434 | AI Integration | Proxy to Ollama |
| 3000 | a2a-server | API server (stateless) |
| 5173 | Vite | Web UI + Client API |

---

## Environment Variables

```
SKIP_AUTH=1
ENCRYPTION_KEY=<32-char>
JWT_SECRET=<32-char-min>
DEFAULT_SYNC_MODE=1
A2A_CLIENT_PROJECTS_PATH=<path-to-projects-json>  # Внешние проекты
A2A_PROJECT_PATH=<path>  # Путь проекта для агента
```

---

## Quick Start

**Windows:** (re)start the live stack only via **`start-all.bat`** at repo root — not per-folder `npm run dev` (avoids zombie processes / port clashes / bad `.pids.txt`). See [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md), [`AGENTS.md`](AGENTS.md).

```bash
start-all.bat
curl http://localhost:3000/health
curl http://localhost:5173/api/a2a/projects
cd ai-integration && docker-compose up -d
```

---

## Subsystems

| Module | State | Docs |
|--------|-------|------|
| a2a-client | [DEV_STATE.md](a2a-client/DEV_STATE.md) | [docs/](a2a-client/docs/) |
| a2a-server | [DEV_STATE.md](a2a-server/DEV_STATE.md) | [docs/](a2a-server/docs/) |
| ai-integration | [DEV_STATE.md](ai-integration/DEV_STATE.md) | [docs/](ai-integration/docs/) |

---

## Work Locks

| Lock | Status | Note |
|------|--------|------|
| ai-integration execution | UNBLOCKED (2026-03-27) | a2a-client and a2a-server tasks CM-10, CM-11, S-10, S-11 completed |

---

## Health Checks

```bash
curl http://localhost:3000/health              # A2A Server
curl http://localhost:11434/health             # AI Integration
curl http://localhost:11435/api/tags           # Ollama
curl http://localhost:5173/api/a2a/projects    # Client API
```

---

## Testing

```bash
# Simulations
npm run sim:lint -- --all --json
npm run sim:validate -- --all --json

# Unit tests
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## References

| Document | Purpose |
|----------|---------|
| [AGENTS.md](AGENTS.md) | Agent rules, Operational Protocol |
| [DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md) | Doc standards |
| [simulations/SCHEMA.md](simulations/SCHEMA.md) | Simulation contract |
| [docs/ENV-MATRIX.md](docs/ENV-MATRIX.md) | Environment matrix |
| Module DEV_STATE | [a2a-client](a2a-client/DEV_STATE.md), [a2a-server](a2a-server/DEV_STATE.md), [ai-integration](ai-integration/DEV_STATE.md) |

---

## Известные проблемы

- `sim:validate` часто возвращает `valid` вместе с warning (`Optional file not found`) — это contract debt, не “clean” статус.
- [ИСПРАВЛЕНО] В таблице подсистем была ссылка на `ai-integration/DEV_STATE.md`, но файл отсутствовал - создан.
- [2026-03-27] Завершен блок `tasks/simulation-upgrade-plan.md` (docs/tests/code): добавлен `sim:workbench:validate`, обновлены `simulations/SCHEMA.md` и `simulations/README.md`, добавлены unit/integration checks в `a2a-client/tests/unit/*`.

---

## DEV_STATE Usage Rules

- **Source of truth:** каждый модуль ведет свой `DEV_STATE.md`; root фиксирует только кросс-модульные риски, решения и зависимости.
- **When to update:** обновлять в начале и в конце каждой рабочей сессии, плюс при любом изменении статуса риска/задачи.
- **Task quality:** каждая задача должна быть проверяемой (что сделать, где, как проверить), без общих формулировок.
- **Status model:** использовать два уровня качества для симуляций: `valid` (структурно) и `clean` (без warnings).
- **Ownership:** у каждой P0/P1 задачи должен быть владелец (модуль) и целевой этап (Phase / milestone).

---

## DEV_STATE Hygiene & Cleanup Requirements

- **Mandatory cleanup:** удалять устаревшие/дублирующие пункты после закрытия, не оставлять “мертвые” roadmap-элементы.
- **No contradiction:** нельзя одновременно держать “No active problems” и открытый технический долг в том же файле.
- **Link integrity:** каждая ссылка на модульный state-файл должна вести на существующий файл. Все DEV_STATE файлы должны быть пролинкованы между собой и с документацией (AGENTS.md, SCHEMA.md, docs/*).
- **Aging control:** задачи без обновления >14 дней переносить в отдельный backlog-блок с причиной блокировки.
- **Consistency check:** минимум раз в неделю сверять `DEV_STATE.md` ↔ `docs/DEV_STATE.md` ↔ `simulations/DEV_STATE.md`.

---

## Governance

**Responsibilities:**
- Update state after each significant action
- Mark complete, archive stale, lock decisions
- Closed-loop: analyze → execute → update → cleanup → plan → check readiness → repeat
- Document transitions with justification
- Sync parallel tracks (no logic conflicts)
- Track maturity: prototype → alpha → beta → release-candidate → production

**Strict Rules:**
- No abstract reasoning without state entry
- Every task has status
- Every completion is recorded
- Every uncertainty logged as risk/question

**Priority:**
1. Complete started work
2. Stabilize system
3. Prepare for production

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
- [x] **R-01 legacy-bridge-cleanup (2026-03-27)**: удалены legacy-bridges из CDM-05:
  - loadLegacySession в newSessions.js
  - LEGACY_SESSION_STATUS enum в types.js
  - POST /sessions/:id/steps endpoint
  - deprecated функции в action-handler.ts
- [x] **R-02 dead-export-cleanup (2026-03-27)**: удалены dead exports:
  - router-static-choices.json (не импортировался)
  - tester/ (неработающий функционал)
- [x] **R-03 duplicate-adapter-cleanup (2026-03-27)**: консолидированы cleanup скрипты

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
- [x] **CDM-01 scope-map**: Each module keeps a target list of folders for cleanup scans (hotspots only, no broad random search). Completed 2026-03-27 — see `CCP-C-01`, `CCP-S-01`, `CCP-AI-01` in module `DEV_STATE.md` files.
- [x] **CDM-02 signal-set**: Search signals зафиксированы в каждом модуле (`CCP-C-02`, `CCP-S-02`, `CCP-AI-02`): duplicate adapters, legacy compatibility bridges, dead exports, unused route branches, overlapping DTO builders (2026-03-27).
- [x] **CDM-03 evidence-format**: For every cleanup candidate, record: `path`, `why redundant`, `usage proof`, `safe removal check` — documented per module (2026-03-27).
- [x] **CDM-04 acceptance-gate**: Removal only after module tests + simulation checks stay green — enforced via `CCP-C-05`, `CCP-S-04`, `CCP-AI-05` in module `DEV_STATE.md` (2026-03-27).

### Module Task Sources (No Duplication in Root)
- Client execution backlog: [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md)
- Server execution backlog: [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md)
- AI integration execution backlog: [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md)
- **Atomic tasks:** see [`tasks/`](tasks/) directory for executable single-task documents

---

## 2026-03-27 Updates

- [x] **CDM-01** scope-map: all modules have `CCP-*-01 where-to-scan` in their `DEV_STATE.md`.
- [x] **CDM-02** signal-set: canonical five signals + module-specific ripgrep hints in `CCP-*-02` lines.
- [x] **CDM-03** evidence-format: four required fields per candidate in each module `DEV_STATE.md`.
- [x] **CDM-04** acceptance-gate: aligned with `CCP-*-05` / `CCP-S-04` safe-remove gates per module.
- [x] **LF-S-03** (`a2a-server`): `sim-validate` split into `scripts/sim-validate/{scanner,validators,reporters}.ts`; fixed repo-root paths for `simulations/` and `docs/…/json-schemas`.
- [x] **C-08** unified execute script API: public `execute.script` without `sandbox`; `result.script` includes `exitCode` in SDK handler paths (`a2a-client`).
- [x] Completed client task `C-03 sdk-http-limits` in `a2a-client` with standalone SDK defaults and env-overridable profile (CORS, rate-limit, file-cap) plus contract tests.
- [x] **CM-10**: Stabilize `session-index.json` and remove complex fallback in `newSessions.js` (Phase 2).
- [x] **CM-11**: Implement common Gray Room Orchestrator and move it out of specific processor.
- [x] **CM-12**: Add retention policy scripts for sessions and requests.
  
## Validation 2026-03-29  
- All simulations passed: valid=true, contractComplete=true, warningCount=0  
- System health: all services OK  
- Ready for agent tasks 
