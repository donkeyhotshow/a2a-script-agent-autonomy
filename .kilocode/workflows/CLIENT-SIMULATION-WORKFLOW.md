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
├── coder/        # Діалог + RAG + файли
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
| `coder` | form (message) → result.message; execute.rag-search → result.rag-search; execute.read-file → result.read-file |
| `auto-ai` | form, rag-search, read-file, write-file, execute-command → result.execute-command (command, exitCode, stdout, stderr) |
| `analyze-dialog` | form з choices (continue_search / save_report) → result.choice |

## Правила для двох типів дій

Клієнт повинен обробляти відповіді сервера по-різному залежно від типу дії:

### 1. Actions (заздалегідь визначені кроки)

**Типові приклади:** `fix-vue-imports`, `fix-vue-imports-batched`

**Поведінка клієнта:**
1. Отримує `execute.script` з інструкцією
2. Виконує script
3. Повертає `result.script` з виводом
4. Сервер автоматично перемикає `execution.step`

**Що очікувати від сервера:**
- `context.execution.step` — назва поточного кроку (з definition)
- `execute` — конкретна дія для виконання
- Наступний крок не потребує рішення від клієнта

**Приклад:**
```json
// Сервер → Клієнт
{
  "context": {
    "execution": { "action": "fix-vue-imports", "step": "collect-files" }
  },
  "execute": {
    "script": { "input": "Знайти всі .vue файли", "output": "..." }
  }
}

// Клієнт → Сервер
{
  "context": { ... },
  "result": { "script": { "output": "[\"src/App.vue\", ...]" } }
}
```

### 2. AI-Actions (діалог з LLM)

**Типові приклади:** `dialog`, `coder`, `coder-smart`

**Поведінка клієнта:**
1. Отримує `execute.form` або `execute.message` або `execute.llm`
2. Для form: показує форму користувачу
3. Для message: показує повідомлення
4. Для llm: чекає продовження
5. Повертає відповідь (`result.message`, `result.choice`, тощо)
6. Сервер відправляє контекст до LLM

**Що очікувати від сервера:**
- `context.execution.step` = "llm" (або динамічний)
- `execute.form` — очікування вводу
- `execute.message` — повідомлення для відображення
- `execute.llm` — продовження діалогу з LLM
- `execute.rag-search`, `execute.read-file`, `execute.write-file`, `execute.execute-command` — конкретні дії

**Формати execute для AI-Actions:**

| execute | Клієнт → result |
|---------|------------------|
| `execute.form.input` | `result.message` |
| `execute.form.choices` | `result.choice` |
| `execute.rag-search` | `result.rag-search` |
| `execute.read-file` | `result.read-file` |
| `execute.write-file` | `result.write-file` |
| `execute.execute-command` | `result.execute-command` |

**Приклад діалогу:**
```json
// Сервер → Клієнт
{
  "context": { "execution": { "action": "dialog", "step": "llm" } },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text" }] }
  }
}

// Клієнт → Сервер (після вводу користувача)
{
  "context": { ... },
  "result": { "message": "як працює авторизація?" }
}

// Сервер → Клієнт (після LLM)
{
  "context": { "execution": { "action": "dialog", "step": "llm" } },
  "execute": {
    "message": "Система авторизації використовує JWT токени...",
    "form": { "input": [{ "name": "message", "type": "text" }] }
  }
}
```

### Різниця в обробці

| Аспект | Actions | AI-Actions |
|--------|---------|------------|
| Перехід між кроками | Автоматичний (сервер) | Через LLM |
| Очікування вводу | Ні (execute.script) | Так (execute.form) |
| Повідомлення | Ні | Так (execute.message) |
| result | script output | message / choice / action result |
