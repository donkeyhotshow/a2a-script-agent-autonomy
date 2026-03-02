# Simulation: fix-vue-imports-batched

## Опис

Тестуємо екшен "Виправити зламані імпорти у Vue файлах" з пакетною обробкою.

## Workflow

```
1. Client → Server: { task: "виправити імпорти у vue компонентах" }
              ↓
2. Server → Client: { context, execute.form: choices [fix-vue-imports-batched, auto-ai, task-decomposition] }
              ↓
3. Client → Server: { context, result: { choice: "fix-vue-imports-batched" } }
              ↓
4. Server → Client: { context, execute: { script } } - internal step: request-files-to-fix
              ↓
5. Client → Server: { context, result: { script: { broken_imports_count: 50, ... } } }
              ↓
6. Server → Client: { context, execute: { rag-search } } - step: search-exporter, file 1
              ↓
7. Client → Server: { context, result: { "rag-search": { results: [...] } } }
              ↓
8. Server → Client: { context, execute: { rag-search } } - step: search-exporter, file 2
              ↓
... (повторюється для кожного файлу)
              ↓
N. Server → Client: { context, execute: { script } } - step: vue-import-cleanup
              ↓
N+1. Client → Server: { context, result: { script: { cleanup_count: 50 } } }
              ↓
N+2. Server → Client: { context, execute: { form } } - фінальна форма з звітом
```

## Internal Steps (server-side only)

1. **request-files-to-fix** (internal) → executes `script` на клієнті
2. **search-exporter** (internal) → executes `rag-search` на клієнті (в циклі для кожного файлу)
3. **vue-import-cleanup** (internal) → executes `script` на клієнті

## Правила Response структури

```json
{
  "context": { ... },
  "execute": {
    "form": { ... },
    "script": { ... },
    "rag-search": { ... }
  }
}
```

- Прямі ключі (`form`, `script`, `rag-search`) в `execute` - це ПРАВИЛЬНО
- Поле `result` на верхньому рівні ТІЛЬКИ для фінального шагу
- `execute.message` з `role` і `content` - НЕ ПОТРІБНО

## Context

Поля внутри `context` курируются системой и имеют свободный формат:

- `context.execution` - сервер керує кроками
- `context.history` - історія виконання
- `context.vite_config`, `context.aliases` - конфігурація проекту
