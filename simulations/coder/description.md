# Coder Dialog Simulation

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Опис

Симуляція показує діалог з AI-асистентом (кодером), який може:

- Вести діалог з користувачем
- Шукати файли в проекті за натуральним запитом (RAG)
- Читати вміст файлів
- Записувати файли (звіт в Markdown)
- Виконувати команди

Це комбінована симуляція, яка поєднує:

- `dialog` - LLM-діалог
- `fix-vue-imports-batched` - файлові операції
- `@a2a/rag` - пошук за натуральним запитом

## RAG можливості

На клієнті доступний пакет `@a2a/rag` з:

- **BM25/TF-IDF** - точний пошук коду
- **Semantic search** - семантичний пошук з Ollama
- **Hybrid search** - гібридний пошук
- **Query understanding** - розуміння запиту
- **Search suggestions** - підказки автодоповнення

## Потік

| Крок | Client (Web→Client)      | Server Response (Server→Client)            | Received (Client→Web) |
|------|---------------------------|--------------------------------------------|-----------------------|
| 1    | task: "допомоги з кодом"  | execute.form з вибором дій                 | execute.form          |
| 2    | result.choice: "coder"    | execute.form запитує message               | execute.form          |
| 3    | result.message            | LLM request → аналізує → виконує RAG пошук | execute + message     |
| 4    | result["rag-search"]      | LLM request → читає файл                   | execute.read-file     |
| 5    | result["read-file"]       | LLM відповідає + form                      | execute.form + message|
| 6    | result.message            | "дякую!" → completed + form                | execute.form          |
| 7    | result.message            | "запиши звіт" → write-file                 | execute.write-file    |
| 8    | result["write-file"]      | Файл записано → completed                  | result.completed      |
| 9    | result.message (новий)    | LLM відповідає                              | execute.form          |
| 10   | result.message            | Кінець діалогу                             | result.completed      |

## Можливі дії

1. **dialog** - діалог з LLM
2. **rag-search** - пошук за натуральним запитом (використовує @a2a/rag)
3. **read-file** - читання вмісту файлу
4. **write-file** - запис файлу (створення звітів, документації)
5. **execute-command** - виконання команди

## Структура файлів

```
simulations/coder/
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
│   ├── received.json
│   ├── request.md
│   └── response.md
├── 4/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 5/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 6/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   ├── received.json
│   ├── request.md
│   └── response.md
├── 7/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 8/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   ├── received.json
│   ├── request.md
│   └── response.md
├── 9/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   ├── received.json
│   ├── request.md
│   └── response.md
└── 10/
    ├── client.json
    ├── request.json
    ├── response.json
    ├── received.json
    ├── request.md
    └── response.md
```

> **Примітка:** Файли `server-transforms-request.json` та `server-transforms-response.json` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно. Деякі кроки можуть
> містити ці файли для демонстрації серверної обробки.
