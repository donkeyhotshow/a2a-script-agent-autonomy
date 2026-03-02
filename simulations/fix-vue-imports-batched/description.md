# Fix Vue Imports Batched Simulation

## Тип: Actions

Це симуляція типу **Actions** - з захардкоженими кроками та пакетною обробкою файлів.

## Опис

Симуляція показує екшен "Виправити зламані імпорти у Vue файлах" з пакетною обробкою.
Відрізняється від звичайного fix-vue-imports тим, що файли обробляються по одному в циклі.

## Потік (сервер контролює переходи)

| Крок | Internal Step        | Клієнт виконує                     |
|------|----------------------|------------------------------------|
| 1    | request-files-to-fix | `script` - отримання списку файлів |
| 2-N  | search-exporter      | `rag-search` - пошук експортерів   |
| N+1  | vue-import-cleanup   | `script` - очищення та звіт        |

## Особливості Batched Actions

- **Пакетна обробка** - файли обробляються по одному в циклі
- **Progress tracking** - відстеження прогресу через `context.execution.progress`
- **Server-driven** - сервер вирішує який наступний крок виконати
- **Немає LLM** - рішення приймає сервер на основі результатів

## Структура файлів

```
simulations/fix-vue-imports-batched/
├── description.md
├── analysis.md
├── 1/ request.json, response.json
├── 2/ request.json, response.json
├── 3/ request.json, response.json
├── 4/ request.json, response.json
├── 5/ request.json, response.json
├── 6/ request.json, response.json
├── 7/ request.json, response.json
└── 8/ request.json, response.json   # завершення
```

## Правила структури

- **Response** містить тільки `context` та `execute`
- **Прямі ключі в execute** - `form`, `script`, `rag-search` на одному рівні
- **Без `execute.message`** - не потрібен, це зайве
- **`result` на верхньому рівні** - тільки для фінального шагу
