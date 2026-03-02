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
  │                   │ server-transforms-request.md → request.md
  │                   │─────────────────────────>│
  │                   │         response.md     │
  │                   │<─────────────────────────│
  │                   │ server-transforms-response.md → response.json
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
| Server transform (request) | `server-transforms-request.md` | `simulations/coder/3/server-transforms-request.md` |
| LLM request | `request.md` | `simulations/coder/3/request.md` |
| LLM response | `response.md` | `simulations/coder/3/response.md` |
| Server transform (response) | `server-transforms-response.md` | `simulations/coder/3/server-transforms-response.md` |
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
