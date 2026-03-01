# Simulation: fix-vue-imports-batched

## Опис

Тестуємо екшен "Виправити зламані імпорти у Vue файлах" з покроковим виконанням (batched).

## Workflow

```
1. Client → Server: { task: "виправити імпорти у vue компонентах" }
              ↓
2. Server → Client: { context, actions: [fix-vue-imports-batched з 6 steps] }
              ↓
3. Client → Server: { context, result: { actionId: "fix-vue-imports-batched" } }
              ↓
4. Server → Client: { context, execute: { rag-search } } - internal step: search-vite-file
              ↓
5. Client → Server: { context, result: { "rag-search": { results: [...] } } }
              ↓
6. Server → Client: { context, execute: { read-file } } - internal step: request-vite-file
              ↓
7. Client → Server: { context, result: { "read-file": { path: "...", content: "..." } } }
              ↓
8. Server → Client: { context, execute: { rag-search } } - internal step: request-files-to-fix
              ↓
9. Client → Server: { context, result: { "rag-search": { results: [...] } } }
              ↓
... цикл для кожного файлу (50 файлів):
10. Server → Client: { context, execute: { rag-search } }, 
                       result: { totalFiles: 50, currentFile: 1 }
              ↓
11. Client → Server: { context, result: { ... } }
              ↓
... повторюється для всіх файлів
              ↓
N. Server → Client: { context, finalResult }
```

## Internal Steps (server-side only)

These are internal identifiers used by the server to track progress. The actual client actions are:

1. **search-vite-file** (internal) → executes `rag-search` on client
2. **request-vite-file** (internal) → executes `read-file` on client
3. **request-files-to-fix** (internal) → executes `rag-search` on client
4. **search-exporter** (internal) → executes `rag-search` on client
5. **apply-fix** (internal) → executes `write-file` on client
6. **vue-import-cleanup** (internal) → executes `execute-command` on client

## Actual Client Actions

- `rag-search` - для пошуку файлів (використовує параметр `pattern`)
- `read-file` - для читання вмісту файлів
- `write-file` - для запису виправлень
- `execute-command` - для запуску команд (наприклад, для очищення)

## Ключові зміни

1. Сервер спочатку шукає vite файл → виводить результати
2. Клієнт відповідає конкретним файлом
3. Сервер записує аліаси до контексту
4. Сервер запитує файли на фікс
5. Клієнт каже "файлів дофіга" → зберігає список локально
6. Сервер в result пише: скільки всього файлів і який поточний
7. Для кожного файлу: сервер робить search з помилки → шукає хто експортує клас

## Очікувані результати

- Сервер пропонує екшен fix-vue-imports-batched з 6 steps
- Покрокове виконання (batched) для великої кількості файлів
- Клієнт зберігає список файлів локально
- Сервер відстежує прогрес (totalFiles, currentFile)

## Правила

1. **Context**: Сервер повністю керує context. Клієнт НЕ додає нічого до context.
2. **Result**: Результат клієнта завжди поза context.
3. **Context propagation**: У кожному новому запиті context такий самий як у попередній відповіді.
4. **Stateless server**: Сервер не зберігає sessionId/projectId - вони залишаються на боці клієнта.
5. **Batched processing**: Сервер обробляє по одному файлу, клієнт зберігає повний список локально.
