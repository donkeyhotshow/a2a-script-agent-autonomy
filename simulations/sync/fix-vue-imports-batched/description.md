# Fix Vue Imports Batched Simulation

## Тип: Actions

Це симуляція типу **Actions** - з захардкоженими кроками та пакетною обробкою файлів.

## Опис

Симуляція показує екшен "Виправити зламані імпорти у Vue файлах" з пакетною обробкою.

Full scripted chain reference: **`sync/script`** ([`../script/description.md`](../script/description.md)).
Відрізняється від звичайного fix-vue-imports тим, що файли обробляються по одному в циклі.

## Потік (сервер контролює переходи)

| Крок | Internal Step        | Клієнт виконує                     |
|------|----------------------|------------------------------------|
| 1    | request-files-to-fix | `script` - отримання списку файлів |
| 2-N  | search-exporter      | `rag-search` - пошук експортерів   |
| N+1  | vue-import-cleanup   | `script` - очищення та звіт        |

## Особливості Batched Actions (частина загального патерну)

Ця симуляція — **конкретний приклад** послідовної багатокрокової обробки з накопиченням даних у контексті. Той самий
патерн
(сервер керує порядком → клієнт віддає `result` → сервер зливає в `context` → наступний `execute`) потрібен і для інших
режимів: ланцюги `rag-search` / `read-file`, кроки з `form`, LLM-цикли, чеклисти. Див. розділ **Sequential multi-step
flows and accumulated context** у [`../SCHEMA.md`](../SCHEMA.md) для опису основних правил та прикладів.

- **Пакетна обробка файлів** — тут одиниці циклу — Vue-файли; інші сценарії можуть “пакувати” сторінки RAG, пункти плану
  тощо.
- **Progress tracking** — `context.execution.progress` (і крок `search-exporter`) показує прогрес по черзі.
- **Server-driven** — сервер вирішує наступний крок після кожного `result`.
- **Немає LLM на рішеннях переходів** — логіка переходів детермінована; але **інші** потоки можуть поєднувати той самий
  накопичувальний контекст з LLM.

Додатково дивіться таблицю **Planned batch-style flows (roadmap)** у тому ж [`../SCHEMA.md`](../SCHEMA.md) – вона
перелічує інші командні/послідовні потоки, які можна моделювати аналогічним способом: RAG-пагінація, черга `read-file`,
chunked scans тощо.

## Структура файлів

```
simulations/fix-vue-imports-batched/
├── description.md
├── analysis.md
├── 1/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 2/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 3/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 4/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 5/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 6/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 7/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
└── 8/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json
```

## Правила структури

- **Response** містить тільки `context` та `execute`
- **Прямі ключі в execute** - `form`, `script`, `rag-search` на одному рівні
- **Без `execute.message`** - не потрібен, це зайве
- **`result` на верхньому рівні** - тільки для фінального шагу
