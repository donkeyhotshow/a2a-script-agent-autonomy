# Формат файлов симуляций

## Обзор

Каждая симуляция в папке `simulations/` содержит пошаговое взаимодействие Client ↔ Server ↔ LLM.

## Структура

```
simulations/
├── dialog/                    # Диалог с LLM
├── coder-dialog/              # Диалог с RAG + запись файлов
├── fix-vue-imports/           # Исправление Vue импортов
├── analyze-architecture/
└── ...
```

## Типы файлов

| Файл | Направление | Описание |
|------|-------------|----------|
| `request.json` | Client → Server | Запрос от клиента |
| `request.md` | Server → LLM | **MARKDOWN** с system prompt! |
| `response.md` | LLM → Server | Ответ от LLM |
| `response.json` | Server → Client | Ответ клиенту |

**НЕ все шаги содержат все 4 файла!** Шаги с LLM содержат .md файлы, остальные только .json.

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
    "execution": { "action": "dialog", "step": "llm-request" },
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

**execute (canonical):** key = action type, value = params. No flat `"action": "<name>"`. Examples: `"read-file": { "path": "..." }`, `"write-file": { "path": "...", "content": "..." }`, `"rag-search": { "query": "..." }`, `"form": { "input": [...] }`, `"script": { "input", "output", "code" }`.

**result for read-file:** use action-key shape so server has path + content: `result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Not just `result: { "content": "..." }`.

Каноничная схема: **simulations/SCHEMA.md**. Примеры .md промптов: **simulations/dialog/3/request.md**, **simulations/dialog/3/response.md**.
