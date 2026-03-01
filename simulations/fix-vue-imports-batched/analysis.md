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
4. Server → Client: { context, execute: { script } } - search-vite-file
              ↓
5. Client → Server: { context, result: { files: ["vite.config.js", ...] } }
              ↓
6. Server → Client: { context, execute: { script } } - request-vite-file
              ↓
7. Client → Server: { context, result: { file: "vite.config.js", content: "..." } }
              ↓
8. Server → Client: { context, execute: { script } } - request-files-to-fix
              ↓
9. Client → Server: { context, result: { files: many, saved_locally: true } }
              ↓
... цикл для кожного файлу (50 файлів):
10. Server → Client: { context, execute: { script: search-exporter }, 
                       result: { totalFiles: 50, currentFile: 1 } }
              ↓
11. Client → Server: { context, result: { file: "...", fixed: true } }
              ↓
... повторюється для всіх файлів
              ↓
N. Server → Client: { context, finalResult }
```

## Steps

1. **search-vite-file** - шукає файли конфігурації vite
2. **request-vite-file** - запитує конкретний файл vite, зберігає aliases в контекст
3. **request-files-to-fix** - запитує файли для виправлення
4. **search-exporter** - для одного файлу, шукає хто експортує клас з помилки
5. **apply-fix** - застосовує виправлення до одного файлу
6. **vue-import-cleanup** - очищує тимчасові файли

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
