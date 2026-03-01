# Client Simulation Workflow

> Симуляції в `a2a-client/simulations/` - валідація відповідей **клієнта**

## Огляд

Ці симуляції перевіряють: якщо сервер відповідає так, то клієнт має відповісти ось так.

Канон: `a2a-client/simulations/SCHEMA.md`.

Source of truth: `simulations/` в корені. Client симуляції - похідні для валідації на боці клієнта.

## Структура

```
a2a-client/simulations/
├── dialog/              # Діалог з LLM
│   ├── 1/ server-response.json, client-request.json
│   ├── 2/ server-response.json, client-request.json
├── coder-dialog/        # Діалог + RAG + файли
│   ├── 1/ server-response.json, client-request.json
│   ├── ...
├── fix-vue-imports/
└── ...
```

## Типи файлів

| File | Description |
|------|-------------|
| `server-response.json` | Що сервер відправляє (те саме що `simulations/<sim>/<step>/response.json`). |
| `client-request.json` | Правильна відповідь клієнта для валідації (те саме що `simulations/<sim>/<step+1>/request.json`). |

## Правила для клієнта

1. **context** — завжди повертається з останньої відповіді сервера ( unchanged).
2. **result.choice** — коли сервер прислав form з choices.
3. **result.message** — коли сервер прислав form з message.
4. **result.action** — коли сервер прислав actions (legacy).
5. **result.rag-search** — коли сервер прислав execute.rag-search.
6. **result.read-file** — коли сервер прислав execute.read-file.
7. **result.write-file** — коли сервер прислав execute.write-file.
8. **result.execute-command** — коли сервер прислав execute.execute-command (command, exitCode, stdout, stderr).
9. **input.message** — коли сервер прислав form і потрібно ввести message.

## Приклади

### Крок 1: Сервер прислав form з choices

**server-response.json:**
```json
{
  "context": { "task": "..." },
  "execute": {
    "form": {
      "title": "Оберіть спосіб",
      "choices": [
        { "id": "dialog", "label": "Діалог" },
        { "id": "fix-vue-imports", "label": "Виправити імпорти" }
      ]
    }
  }
}
```

**client-request.json:**
```json
{
  "context": { "task": "..." },
  "result": { "choice": "dialog" }
}
```

### Крок 2: Сервер прислав form з message

**server-response.json:**
```json
{
  "context": { "task": "...", "execution": { "action": "dialog", "step": "dialog" } },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text", "required": true }] }
  }
}
```

**client-request.json:**
```json
{
  "context": { "task": "...", "execution": { "action": "dialog", "step": "dialog" } },
  "result": { "message": "як працює авторизація?" }
}
```

### Крок 3: Сервер прислав execute.rag-search

**server-response.json:**
```json
{
  "context": { ... },
  "execute": {
    "rag-search": { "query": "система авторизації JWT" }
  }
}
```

**client-request.json:**
```json
{
  "context": { ... },
  "result": {
    "rag-search": {
      "results": [{ "file": "src/auth.js", "score": 0.95, "snippet": "..." }],
      "files": ["src/auth.js"]
    }
  }
}
```

## Симуляції

| Симуляція | Опис |
|-----------|------|
| `fix-vue-imports` | form (choice) → script steps → finalResult |
| `dialog` | actions → result.action; form (message) → result.message |
| `coder-dialog` | form (message) → result.message; execute.rag-search → result.rag-search; execute.read-file → result.read-file |
| `auto-ai` | form, rag-search, read-file, write-file, execute-command → result.execute-command (command, exitCode, stdout, stderr) |
| `analyze-dialog` | form з choices (continue_search / save_report) → result.choice |
