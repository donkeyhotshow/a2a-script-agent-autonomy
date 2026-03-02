# Fix Vue Imports Batched Simulation

## Тип: Actions

Це симуляція типу **Actions** - з захардкоженими кроками, які сервер перемикає автоматично на основі результатів
виконання.

## Опис

Симуляція показує екшен "Виправити зламані імпорти у Vue файлах" з покроковим (batched) виконанням для великої кількості
файлів.

## Потік (сервер контролює переходи)

| Крок | Internal Step        | Клієнт виконує                                    |
|------|----------------------|---------------------------------------------------|
| 1    | search-vite-file     | `rag-search` - шукає vite файл                    |
| 2    | request-vite-file    | `read-file` - читає vite конфіг                   |
| 3    | request-files-to-fix | `rag-search` - шукає файли для фіксу              |
| 4-8  | apply-fix            | `write-file` - запис виправлень для кожного файлу |
| N    | vue-import-cleanup   | `execute-command` - очищення                      |

## Особливості Actions

- **step в execution** - сервер автоматично змінює `step` на основі `result`
- **Захардкожені кроки** - всі кроки визначені заздалегідь у action definition
- **Server-driven** - сервер вирішує який наступний крок виконати
- **Batched processing** - обробка по одному файлу, клієнт зберігає список локально
- **Немає LLM** - рішення приймає сервер на основі результатів

## Ключові особливості batched версії

1. Сервер спочатку шукає vite файл → виводить результати
2. Клієнт відповідає конкретним файлом
3. Сервер записує аліаси до контексту
4. Сервер запитує файли на фікс
5. Клієнт каже "файлів дофіга" → зберігає список локально
6. Сервер в result пише: скільки всього файлів і який поточний
7. Для кожного файлу: сервер робить search з помилки → шукає хто експортує клас

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

> **Примітка:** Файли `server-transforms-request.md` та `server-transforms-response.md` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно.
