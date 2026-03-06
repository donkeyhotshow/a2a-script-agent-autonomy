# Fix Vue Imports Simulation

## Тип: Actions

Це симуляція типу **Actions** - з захардкоженими кроками, які сервер перемикає автоматично на основі результатів
виконання.

## Опис

Симуляція показує екшен "Виправити зламані імпорти у Vue файлах" з послідовним виконанням кроків.

## Потік (сервер контролює переходи)

| Крок | Internal Step      | Клієнт виконує                      |
|------|--------------------|-------------------------------------|
| 1    | vue-import-detect  | `rag-search` - пошук битих імпортів |
| 2    | vue-import-resolve | `rag-search` - пошук експортерів    |
| 3    | vue-import-apply   | `write-file` - запис виправлень     |
| 4    | vue-import-cleanup | `execute-command` - очищення        |

## Особливості Actions

- **step в execution** - сервер автоматично змінює `step` на основі `result`
- **Захардкожені кроки** - всі кроки визначені заздалегідь у action definition
- **Server-driven** - сервер вирішує який наступний крок виконати
- **Немає LLM** - рішення приймає сервер на основі результатів

## Структура файлів

```
simulations/fix-vue-imports/
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
└── 5/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json
```

> **Примітка:** Файли `server-transforms-request.json` та `server-transforms-response.json` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно.
