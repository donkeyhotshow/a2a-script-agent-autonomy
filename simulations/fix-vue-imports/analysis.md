# Simulation: fix-vue-imports

## Опис

Тестуємо екшен "Виправити зламані імпорти у Vue файлах".

## Workflow

```
1. Client → Server: { task: "виправити імпорти у vue компонентах" }
              ↓
2. Server → Client: { context, execute.form: choices [fix-vue-imports, auto-ai, task-decomposition] }  (no-LLM first, fallback merged)
              ↓
3. Client → Server: { context, result: { choice: "fix-vue-imports" } }
              ↓
4. Server → Client: { context, execute: { rag-search } } - internal step: vue-import-detect
              ↓
5. Client → Server: { context, result: { "rag-search": { results: [...] } } }
              ↓
6. Server → Client: { context, execute: { rag-search } } - internal step: vue-import-resolve
              ↓
7. Client → Server: { context, result: { "rag-search": { results: [...] } } }
              ↓
8. Server → Client: { context, execute: { write-file } } - internal step: vue-import-apply
              ↓
9. Client → Server: { context, result: { "write-file": { path: "...", success: true } } }
              ↓
10. Server → Client: { context, execute: { execute-command } } - internal step: vue-import-cleanup
              ↓
11. Client → Server: { context, result: { "execute-command": { exitCode: 0 } } }
              ↓
N. Server → Client: { context, finalResult }
```

## Internal Steps (server-side only)

These are internal identifiers used by the server to track progress. The actual client actions are:

1. **vue-import-detect** (internal) → executes `rag-search` on client
2. **vue-import-resolve** (internal) → executes `rag-search` on client
3. **vue-import-apply** (internal) → executes `write-file` on client
4. **vue-import-cleanup** (internal) → executes `execute-command` on client

## Actual Client Actions

- `rag-search` - для пошуку файлів та битих імпортів
- `write-file` - для запису виправлень
- `execute-command` - для запуску команд (очищення)

## Очікувані результати

- Сервер пропонує форму вибору: fix-vue-imports (без LLM, пріоритет), auto-ai, task-decomposition (fallback злиті в choices)
- Кожен крок повертає execute з відповідною дією клієнта
- Фінальний крок повертає finalResult

## Правила

1. **Context**: Сервер повністю керує context. Клієнт НЕ додає нічого до context.
2. **Result**: Результат клієнта завжди поза context.
3. **Context propagation**: У кожному новому запиті context такий самий як у попередній відповіді.
4. **Stateless server**: Сервер не зберігає sessionId/projectId - вони залишаються на боці клієнта.
