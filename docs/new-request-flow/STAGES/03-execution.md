# Этап 3: Выполнение действия

## Описание

Основной этап протокола - выполнение действий сервером и возврат команд клиенту.

## Направление

**Bidirectional: Client ↔ Server ↔ LLM**

## Два типа действий

### 1. Actions (Deterministic)

Характеристики:
- Шаги захардкожены в definition действия
- Сервер сам переключает `execution.step` на основе `result`
- Предсказуемый, алгоритмический поток

Примеры:
- `fix-vue-imports` - исправление Vue импортов
- `phpunit-deprecations` - анализ deprecations

### 2. AI-Actions (LLM-Assisted)

Характеристики:
- Шаги не в фиксированной последовательности
- LLM предлагает следующий шаг
- Сервер интерпретирует и нормализует предложение

Примеры:
- `dialog` - диалог с пользователем
- `coder` - помощь с кодом
- `auto-ai` - AI генерация действий

## Action-Key Shape (ОБЯЗАТЕЛЬНО)

Все execute и result объекты должны использовать action-key shape:

```json
// ✅ Правильно:
{ "execute": { "read-file": { "path": "src/auth.js" } } }
{ "result": { "read-file": { "path": "src/auth.js", "content": "..." } } }

// ❌ Неправильно:
{ "execute": { "action": "read-file", "file": "src/auth.js" } }
```

## Типы действий (существующие)

| Action | Execute | Result |
|--------|---------|--------|
| `form` | `{ "form": { "input": [...], "choices": [...] } }` | `{ "result": { "message": "...", "choice": "..." } }` |
| `script` | `{ "script": { "input": {}, "output": "...", "code": "..." } }` | `{ "result": { "script": { "output": "..." } } }` |
| `rag-search` | `{ "rag-search": { "query": "..." } }` | `{ "result": { "rag-search": { "results": [...], "files": [...] } } }` |
| `read-file` | `{ "read-file": { "path": "..." } }` | `{ "result": { "read-file": { "path": "...", "content": "..." } } }` |
| `write-file` | `{ "write-file": { "path": "...", "content": "..." } }` | `{ "result": { "write-file": { "success": true } } }` |
| `execute-command` | `{ "execute-command": { "command": "npm test" } }` | `{ "result": { "execute-command": { "exitCode": 0, "stdout": "...", "stderr": "" } } }` |
| `message` | `{ "message": "..." }` | — (UI only) |

## Типы действий (запланированные)

| Action | Status |
|--------|--------|
| `list-directory` | 🔶 Частично реализовано |
| `grep-search` | ❌ Не реализовано |
| `file-exists` | ❌ Не реализовано |
| `scan-directory` | 🔶 Частично реализовано |
| `edit-patch` | ❌ Не реализовано |
| `run-script` | ❌ Не реализовано |

## Поток для AI-Actions

```
request.json → request.md (LLM prompt) → response.md (LLM output)
                                      ↓
response.json ← server-transforms-response.json
        ↓
(execute.message, execute.form, или execute.read-file/rag-search/...)
```

## Контекст выполнения

```json
{
  "context": {
    "task": "описание задачи",
    "execution": {
      "action": "coder",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "помоги с кодом"
      }
    ]
  }
}
```

## Следующий этап

После выполнения действия переходит к [Этап 4: Результат](04-result.md)

## References

- [PROTOCOL.md](../PROTOCOL.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md)
- [simulations/auto-ai/ACTIONS-MAP.md](../../simulations/auto-ai/ACTIONS-MAP.md)
- [server-invoke-response-execute.schema.json](../json-schemas/server-invoke-response-execute.schema.json)
