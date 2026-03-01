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
│   ├── 4/ request.json, request.md, response.json, response.md
├── coder-dialog/        # Діалог + RAG + файли
├── fix-vue-imports/
├── fix-vue-imports-batched/
└── ...
```

## File Types

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | Запрос клієнта |
| `request.md` | Server → LLM | MARKDOWN: system prompt + поточний стан (JSON у блоці) |
| `response.md` | LLM → Server | Очікуваний вивід LLM (наприклад `{ "message": "..." }`) |
| `response.json` | Server → Client | Відповідь клієнту (context + execute) |

У кроках з LLM є .md; інші — лише .json.

## Flow

```
Client              Server              LLM
  │                   │                   │
  │ request.json      │                   │
  │──────────────────>│                   │
  │                   │ request.md        │
  │                   │──────────────────>│
  │                   │    response.md    │
  │                   │<──────────────────│
  │ response.json     │                   │
  │<──────────────────│                   │
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
    "execution": { "action": "dialog", "step": "llm-request" },
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

Execute format: `execute.<action-type> = params`, e.g. `"read-file": { "path": "..." }`, `"write-file": { "path": "...", "content": "..." }`, `"rag-search": { "query": "..." }`, `"form": { "input": [...] }`, `"script": { "input", "output", "code" }`.

## Правила

1. **Перший запит** — лише `{ "task": "..." }`.
2. **Вибір дії** — `result.action` (не actionId).
3. **request.md** — завжди MARKDOWN (system prompt + стан), не чистий JSON з model/messages.
4. **response.md** — лише очікуваний вивід LLM (наприклад один об’єкт з `message`).
5. **response.json** = контекст із сервера + execute (form або result).
