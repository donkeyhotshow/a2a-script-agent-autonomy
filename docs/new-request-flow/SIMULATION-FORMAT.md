# Формат файлов симуляций

## Обзор

Каждая симуляция в папке `simulations/` содержит пошаговое взаимодействие Client ↔ Server ↔ LLM.

## Структура

```
simulations/
├── dialog/                    # Диалог с LLM
├── coder/              # Диалог с RAG + запись файлов
├── fix-vue-imports/           # Исправление Vue импортов
├── analyze/
└── ...
```

## Типы файлов

| Файл                               | Направление     | Описание                                                                                          |
|------------------------------------|-----------------|---------------------------------------------------------------------------------------------------|
| `request.json`                     | Client → Server | Запрос от клиента.                                                                                |
| `server-transforms-request.json`   | —               | **JSON‑описание** трансформации `request.json` → `request.md` (JSONPath‑pipeline, per‑step). Опц. |
| `request.md`                       | Server → LLM    | **MARKDOWN** с system prompt и состоянием.                                                        |
| `response.md`                      | LLM → Server    | Ответ от LLM.                                                                                     |
| `server-transforms-response.json`  | —               | **JSON‑описание** трансформации `response.md` → `response.json` (JSONPath‑pipeline, per‑step). Опц.|
| `response.json`                    | Server → Client | Ответ клиенту.                                                                                    |

**Порядок (pipeline):**

```
request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json
```

**Визуально:**

```
Client              Server (transforms)       LLM
  │                   │                         │
  │ request.json      │                         │
  │──────────────────>│                         │
  │                   │ server-transforms-request.json → request.md
  │                   │─────────────────────────>│
  │                   │         response.md     │
  │                   │<─────────────────────────│
  │                   │ server-transforms-response.json → response.json
  │ response.json     │                         │
  │<──────────────────│                         │
```

**Когда какие файлы нужны:**

| Тип шага                  | Файлы                                                                                     |
|---------------------------|--------------------------------------------------------------------------------------------|
| Без LLM (только Actions)  | `request.json`, `response.json` (опционально: `server-transforms-*.json`)                |
| С LLM (AI-Actions)        | Все 6 файлов                                                                              |
| Transform-логика          | `server-transforms-request.json`, `server-transforms-response.json` (per‑step, опциональны) |

Не в каждом шаге есть все 6 файлов: шаги без LLM — обычно только `request.json` и `response.json`; шаги с LLM добавляют
`request.md`/`response.md`; transform‑файлы (`server-transforms-*.json`) опциональны і описывают конкретну per‑step
JSONPath‑pipeline (див. `json-schemas/server-transform.schema.json`).

---

## Скрипты batch‑запуска симуляций и выгрузки ответов

### sim:run — запуск симуляций и запись server-response.json

- **Команда**: `npm run sim:run <sim-name>` или `npm run sim:run-all`
- **Скрипт**: `a2a-server/scripts/sim-run.ts`
- **Назначение**: прогнать одну или все симуляции через реальный серверный `invoke()` и сохранить ответы сервера в файлы
  `server-response.json` в каждой папке шага.

**Что делает:**

- ищет директории вида `simulations/<name>/<step>/` с `request.json`;
- для каждой такой директории:
  - читает `request.json` (payload клиента);
  - вызывает `invoke('simulation-client', invokeInput)` на живом сервере;
  - по `promiseId` опрашивает `requestService.getResult(promiseId)` до статуса `"completed"`;
  - формирует объект с полным результатом (`status`, `context`, `message`, `result`, таймстемпы и т.п.);
  - записывает его в `server-response.json` рядом с `request.json`.

**Режимы:**

- `npm run sim:run <sim-name>` — запускает **одну** симуляцию (`simulations/<sim-name>/**/request.json`);
- `npm run sim:run-all` — находит **все** симуляции в `simulations/` и прогоняет по очереди, печатает краткий свод по
  “пройдено/провалено”.

> Примечание: при включённом `LLM_REPLAY_DIR` сервер может отвечать по зафиксированным `response.md`, что делает
> `sim:run` полностью детерминированным, без реального LLM.

### sim:compare — сравнение server-response.json с response.json

- **Команда**: `npm run sim:compare <sim-name> [--verbose] [--json] [--threshold=80]`
- **Скрипт**: `a2a-server/scripts/sim-compare.ts`
- **Назначение**: сравнить фактический ответ сервера (`server-response.json`) с “gold standard”
  (`response.json`) и посчитать similarity‑score.

**Что делает:**

- читает `server-response.json` и `response.json` в шаге симуляции;
- выделяет “полезные” данные (`response`, `data`, `result`);
- игнорирует заведомо нестабильные поля (`sessionId`, `promiseId`, timestamps и т.п.);
- делает глубокое сравнение структур и значений:
  - собирает список отличий (missing / extra / mismatch по путям);
  - считает `similarity` в процентах (`matchedKeys / totalKeys`);
- опционально валидирует структуру через Zod‑схему (`ActionResultSchema`);
- выводит:
  - общий verdict (match / mismatch);
  - similarity‑score;
  - (в verbose‑режиме) список отличий по полям.

### sim:report — агрегированный отчёт по всем симуляциям

- **Команда**: `npm run sim:report [--status=failed|partial|passed|not-run|all] [--output=file] [--json] [--verbose]`
- **Скрипт**: `a2a-server/scripts/sim-report.ts`
- **Назначение**: собрать сводку по всем симуляциям: где есть `request.json`, `response.json`, `server-response.json`,
  насколько ответы совпадают с эталонами и есть ли структурные ошибки.

**Что делает:**

- сканирует `simulations/**/` и для каждого шага:
  - проверяет наличие `request.json`, `response.json`, `server-response.json`, `NOTES.md`;
  - читает `server-response.json`, валидирует по Zod‑схеме `ServerResponseSchema`;
  - при наличии `response.json`:
    - сравнивает фактический и эталонный ответы (как в `sim-compare.ts`);
    - считает similarity‑score и признак полного соответствия;
  - присваивает статус симуляции: `passed`, `partial`, `failed`, `not-run`;
- выводит:
  - суммарную таблицу симуляций со статусами и similarity;
  - при `--json` — JSON‑объект с подробной структурой;
  - при `--output` — записывает отчёт в указанный файл.

Вместе эти скрипты обеспечивают полный цикл:

1. **Создать** новую симуляцию (`sim:create`).
2. **Прогнать** её через сервер и получить фактический `server-response.json` (`sim:run` / `sim:run-all`).
3. **Сравнить** фактический и эталонный ответы (`sim:compare`).
4. **Построить отчёт** по всем симуляциям (`sim:report`).

## ВАЖНО: request.md - это MARKDOWN!

**НЕ** используй формат:

```json
{
  "model": "qwen3:8b",
  "messages": [...]
}
```

**ИСПОЛЬЗУЙ** формат (MARKDOWN!):

```markdown
## System Prompt

продолжи диалог в json . ответь обновленным json 

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      }
    ]
  }
}
```

```

## Правила

1. **request.md = MARKDOWN с system prompt** - LLM должен ответить JSON
2. **Client отправляет content без role** - сервер добавляет role
3. **response.md = context с history** - что будет отправлено LLM в следующем шаге
4. **response.json = response.md + execute** - добавляется форма или результат

## Пример: Dialog Simulation

### Шаг 1: request.json (Client → Server)
```json
{ "task": "диалог" }
```

### Шаг 2: request.json (выбор действия)

```json
{
  "context": { "task": "диалог" },
  "result": { "action": "dialog" }
}
```

### Шаг 3: request.json (сообщение пользователя)

```json
{
  "context": { "task": "диалог", "execution": { "action": "dialog", "step": "request" } },
  "result": { "message": "hello world" }
}
```

### Шаг 3: request.md (Server → LLM)

```markdown
## System Prompt

продолжи диалог в json . ответь обновленным json 

```json
{
  "context": {
    "task": "dialog",
    "history": [{ "role": "user", "message": "hello" }]
  }
}
```

```

### Шаг 3: response.md (LLM → Server)
```json
{
  "context": {
    "task": "dialog",
    "history": [
      { "role": "user", "message": "hello" },
      { "role": "assistant", "message": "hi there!" }
    ]
  }
}
```

### Шаг 3: response.json (Server → Client)

```json
{
  "context": {
    "task": "dialog",
    "execution": { "action": "dialog" },
    "history": [
      { "role": "user", "message": "hello" },
      { "role": "assistant", "message": "hi there!" }
    ]
  },
  "execute": {
    "form": {
      "input": [{ "name": "message", "type": "text", "label": "Повідомлення", "required": true }]
    }
  }
}
```

**execute (canonical):** key = action type, value = params. No flat `"action": "<name>"`. Examples:
`"read-file": { "path": "..." }`, `"write-file": { "path": "...", "content": "..." }`,
`"rag-search": { "query": "..." }`, `"form": { "input": [...] }`, `"script": { "input", "output", "code" }`,
`"execute-command": { "command": "npm test" }`.

**result for read-file:** use action-key shape so server has path + content:
`result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Not just `result: { "content": "..." }`.

**result for rag-search:** use action-key shape so server can pass to LLM as `ragResults`:
`result: { "rag-search": { "results": [ { "file", "score", "snippet" } ], "files": ["path1", ...] } }`. Optional
`"query"`. Not flat `result: { "results", "files" }`.

**result for execute-command:** use action-key shape:
`result: { "execute-command": { "command": "npm test", "exitCode": 0, "stdout": "...", "stderr": "" } }`. Server can
pass to LLM for summary or next step.

Каноничная схема: **simulations/SCHEMA.md**. Примеры .md промптов: **simulations/dialog/3/request.md**,
**simulations/dialog/3/response.md**.

---

## Naming Conventions

### Директории симуляций

- **kebab-case** для имён директорий
- **Описательные**, отражающие суть сценария
- **Примеры:** `fix-vue-imports`, `phpunit-deprecations`, `task-decomposition`, `coder-smart`

### Шаги (steps) внутри директорий

- Нумерация: `1/`, `2/`, `3/` и т.д.
- Последовательная, без пропусков
- Каждый шаг — отдельная директория с файлами

### Идентификаторы actions

- **kebab-case** для имён действий
- **Формат:** `<domain>-<operation>` или `<domain>-<operation>-<suboperation>`
- **Примеры:**
  - `fix-vue-imports` (домен: vue, операция: fix imports)
  - `vue-import-detect` (домен: vue-import, операция: detect)
  - `scan-phpunit` (домен: scan, операция: phpunit)
  - `dialog` (простое действие)

### Идентификаторы form choices

- **snake_case** для ID выборов
- **Примеры:** `continue_search`, `save_report`, `skip_step`, `start_over`

### Имена файлов

| Файл | Паттерн | Пример |
|------|---------|--------|
| Request | `request.json` | `simulations/coder/3/request.json` |
| Server transform (request) | `server-transforms-request.json` | `simulations/coder/3/server-transforms-request.json` |
| LLM request | `request.md` | `simulations/coder/3/request.md` |
| LLM response | `response.md` | `simulations/coder/3/response.md` |
| Server transform (response) | `server-transforms-response.json` | `simulations/coder/3/server-transforms-response.json` |
| Response | `response.json` | `simulations/coder/3/response.json` |

---

## Context поля (system-managed)

Поля внутри `context` курируются системой и имеют свободный формат. Не проверять и не изменять вручную.

### Обязательные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `context.task` | string | Исходная задача пользователя |
| `context.execution.action` | string | ID текущего действия |
| `context.execution.step` | string | ID текущего шага |
| `context.execution.status` | string | `"completed"` для финального шага |

### System-managed поля

| Поле | Тип | Описание |
|------|-----|----------|
| `context.history` | array | История взаимодействия (user ↔ assistant) |
| `context.execution` | object | Состояние выполнения (action, step, progress) |
| `context.docVirtual` | object | Виртуальный документ (для сложных AI-Actions) |
| `context.aliases` | object | Алиасы путей (например, `{ "@": "resources/js" }`) |
| `context.vite_config` | object | Конфигурация Vite (если применимо) |

**Важно:** Эти поля управляются системой автоматически. При создании симуляций копируйте их из предыдущих шагов без изменений.

---

## Action-key shape в симуляциях

Всегда используйте action-key shape для `result` и `execute`:

### Правильно (✅)

```json
// request.json (result от клиента)
{
  "context": { ... },
  "result": {
    "script": {
      "broken_imports": [...]
    }
  }
}

// response.json (execute от сервера)
{
  "context": { ... },
  "execute": {
    "read-file": {
      "path": "src/auth.js"
    }
  }
}
```

### Неправильно (❌)

```json
// request.json — нет action-key
{
  "context": { ... },
  "result": {
    "content": "..."  // непонятно, от какого действия
  }
}

// response.json — flat action
{
  "context": { ... },
  "execute": {
    "action": "read-file",  // коллизия имён!
    "file": "src/auth.js"
  }
}
```

---

## Типы execute

| Тип | Обрабатывается | Описание |
|-----|----------------|----------|
| `message` | Web UI only | Показывает текстовое сообщение пользователю |
| `form` | Web UI only | Показывает форму ввода (choices или input) |
| `script` | Client only | Выполняет DSL-скрипт на клиенте |
| `rag-search` | Client only | Выполняет RAG-поиск |
| `read-file` | Client only | Читает файл |
| `write-file` | Client only | Записывает файл |
| `execute-command` | Client only | Выполняет shell-команду |

**Разделение ответственности:**
- `message`, `form` — отображаются в Web UI
- `script`, `rag-search`, `read-file`, `write-file`, `execute-command` — выполняются Client API

---

## Перекрёстные ссылки

- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) — Каноничная схема симуляций
- [DATA-FLOW.md](DATA-FLOW.md) — Полная диаграмма потока данных
- [ARCHITECTURE.md](ARCHITECTURE.md) — Общая архитектура системы
- [PROTOCOL.md](PROTOCOL.md) — Протокол взаимодействия
- [WEB-UI.md](WEB-UI.md) — Web UI документация
- [API-SERVER.md](API-SERVER.md) — Client API Server документация
- [API-CLIENT.md](API-CLIENT.md) — API Client документация
