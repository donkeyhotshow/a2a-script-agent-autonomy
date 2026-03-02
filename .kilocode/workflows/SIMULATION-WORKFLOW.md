# Simulation Workflow

## Overview

Симуляции в `simulations/`. Каждый шаг — Client → Server → (LLM) → Server → Client. Каноничная схема: `simulations/SCHEMA.md`.

## Structure

```
simulations/
├── dialog/              # Діалог з LLM
│   ├── 1/ request.json, response.json
│   ├── 2/ request.json, response.json
│   ├── 3/ request.json, request.md, response.json, response.md
│   ├── 4/ request.json, request.md, response.json, response.md  (+ optional server-transforms-*.md)
├── coder/        # Діалог + RAG + файли
├── fix-vue-imports/
├── fix-vue-imports-batched/
└── ...
```

## File Types

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | Запит клієнта. |
| `server-transforms-request.md` | — | Обробка `request.json`, трансформація перед запитом у LLM. Опційно. |
| `request.md` | Server → LLM | MARKDOWN: system prompt + поточний стан (JSON у блоці). |
| `response.md` | LLM → Server | Очікуваний вивід LLM (наприклад `{ "message": "..." }`). |
| `server-transforms-response.md` | — | Обробка `response.md`, трансформація перед поверненням клієнту. Опційно. |
| `response.json` | Server → Client | Відповідь клієнту (context + execute). |

**Порядок:** request.json → server-transforms-request.md → request.md → response.md → server-transforms-response.md → response.json.

У кроках з LLM є .md; інші — лише .json; transform-файли опційні.

## Flow

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

## Dialog: формати

### Крок 1 — request.json (Client → Server)

```json
{
  "task": "диалог"
}
```

### Крок 2 — request.json (вибір дії)

```json
{
  "context": { "task": "диалог" },
  "result": { "action": "dialog" }
}
```

### Крок 3 — request.json (повідомлення користувача)

```json
{
  "context": {
    "task": "диалог",
    "execution": { "action": "dialog", "step": "request" }
  },
  "result": { "message": "hello world" }
}
```

### request.md (Server → LLM)

MARKDOWN: секція **System Prompt**, опис формату відповіді (JSON з полем `message`), потім секція **Поточний стан** з JSON контексту та історії. Приклад структури — у `simulations/dialog/3/request.md`.

### response.md (LLM → Server)

Тільки вивід LLM:

```json
{
  "message": "hello world"
}
```

### response.json (Server → Client)

context + history + **execute** (canonical: key = action type, value = params). No flat `"action": "<name>"`.

```json
{
  "context": {
    "task": "dialog",
    "execution": { "action": "dialog" },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "execute": {
    "form": {
      "input": [{ "name": "message", "type": "text", "label": "Повідомлення", "required": true }]
    }
  }
}
```

Execute format: `execute.<action-type> = params`, e.g. `"read-file": { "path": "..." }`, `"write-file": { "path": "...", "content": "..." }`, `"rag-search": { "query": "..." }`, `"form": { "input": [...] }`, `"script": { "input", "output", "code" }`, `"execute-command": { "command": "npm test" }`. Client returns `result["execute-command"]` with `command`, `exitCode`, `stdout`, `stderr`.

## Два типи дій

Система підтримує два типи дій, які відрізняються за способом визначення кроків:

### 1. Actions (заздалегідь визначені кроки)

- **Характеристики:**
  - Кроки визначені заздалегідь в action definition
  - Сервер сам перемикає кроки на основі `result`
  - Приклад: [`fix-vue-imports`](../a2a-client/simulations/fix-vue-imports/description.md)

- **Структура `execution`:**
  ```json
  {
    "action": "fix-vue-imports",
    "step": "collect-files"
  }
  ```

- **Поведінка:**
  - У `response.json`: `execution.step` змінюється сервером автоматично
  - `context.execution` містить `{ action, step }`
  - Клієнт лише повертає результат виконання кроку (`result`)

- **Приклад потоку:**
  ```
  Крок 1: request.json → { "result": { "choice": "fix-vue-imports" } }
  Крок 2: response.json → { "execute": { "script": { "input": "..." } }, "context": { "execution": { "action": "fix-vue-imports", "step": "collect-files" } } }
  Крок 3: request.json → { "result": { "script": { "output": "..." } } }
  Крок 4: response.json → { "execute": { "script": { "input": "..." } }, "context": { "execution": { "action": "fix-vue-imports", "step": "process-files" } } }
  ```

### 2. AI-Actions (діалог з LLM)

- **Характеристики:**
  - Кроки визначаються LLM динамічно
  - Сервер відображає список доступних кроків, але вибір робить LLM
  - Кожен крок може бути окремим запитом до LLM
  - Приклади: [`dialog`](../a2a-client/simulations/dialog/description.md), [`coder`](../a2a-client/simulations/coder/description.md), `coder-smart`

- **Структура `execution`:**
  ```json
  {
    "action": "coder",
    "step": "llm"
  }
  ```

- **Поведінка:**
  - У `response.json`: може бути `execute.message` + `form` для продовження
  - Або `execute.llm` з `purpose` для генерації наступного кроку
  - LLM вирішує, який action виконати наступним

- **Формати відповідей:**
  - `execute.form` — очікує ввід від користувача
  - `execute.message` — повідомлення від LLM
  - `execute.llm` — інструкція для LLM продовжити роботу
    ```json
    {
      "execute": {
        "llm": {
          "purpose": "Проаналізувати файл і запропонувати виправлення"
        }
      }
    }
    ```

- **Приклад потоку:**
  ```
  Крок 1: request.json → { "task": "напиши код" }
  Крок 2: response.json → { "actions": [{ "action": "coder", "title": "Coder" }], "context": { "execution": { "action": "coder", "step": "init" } } }
  Крок 3: request.json → { "result": { "action": "coder" }, "context": { "execution": { "action": "coder", "step": "init" } } }
  Крок 4: response.json → { "execute": { "form": { "input": [...] } }, "context": { "execution": { "action": "coder", "step": "llm" } } }
  Крок 5: request.json → { "result": { "message": "напиши функцію авторизації" }, "context": { "execution": { "action": "coder", "step": "llm" } } }
  Крок 6: response.json → { "execute": { "llm": { "purpose": "Згенерувати код" } }, "context": { "execution": { "action": "coder", "step": "llm" } } }
  ```

### Порівняння

| Характеристика | Actions | AI-Actions |
|----------------|---------|------------|
| Визначення кроків | Заздалегідь в definition | Динамічно LLM |
| Перемикання кроків | Сервер на основі result | LLM вирішує |
| Приклади | fix-vue-imports | dialog, coder, coder-smart |
| execution.step | Змінюється сервером | "llm" або визначається LLM |
| response формат | execute з конкретним action | execute.message/form або execute.llm |

## Правила

1. **Перший запит** — лише `{ "task": "..." }`.
2. **Вибір дії** — `result.action` (не actionId).
3. **Результат rag-search** — клієнт повертає `result: { "rag-search": { "results": [...], "files": [...] } }` (action-key), не плоский `result.results`/`result.files`.
4. **request.md** — завжди MARKDOWN (system prompt + стан), не чистий JSON з model/messages.
5. **response.md** — лише очікуваний вивід LLM (наприклад один об’єкт з `message`).
6. **response.json** = контекст із сервера + execute (form або result).
