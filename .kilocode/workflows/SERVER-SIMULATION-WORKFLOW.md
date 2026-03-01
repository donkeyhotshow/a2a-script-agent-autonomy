# Server Simulation Workflow

> Симуляції в `simulations/` - валідація відповідей **сервера**

## Огляд

Кожен крок — Client → Server → (LLM) → Server → Client.

Канон: `simulations/SCHEMA.md`.

## Структура

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

## Типи файлів

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

## Перший запит

```json
{ "task": "допоможи розібратись з кодом" }
```

## Варіанти відповідей сервера

### З actions

```json
{
  "context": { "task": "..." },
  "actions": [
    { "action": "dialog", "title": "Діалог", ... }
  ],
  "fallbackActions": [...]
}
```

### З execute.form

```json
{
  "context": { "task": "...", "execution": {...} },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text", ... }] }
  }
}
```

### З execute (для дій)

```json
{
  "context": {...},
  "execute": {
    "rag-search": { "query": "..." },
    "read-file": { "path": "..." },
    "write-file": { "path": "...", "content": "..." }
  }
}
```

## Правила

1. **Перший запит** — лише `{ "task": "..." }`.
2. **Вибір дії** — `result.action` (не actionId).
3. **request.md** — завжди MARKDOWN (system prompt + стан), не чистий JSON.
4. **response.md** — лише очікуваний вивід LLM.
5. **response.json** = контекст із сервера + execute (form або result).
