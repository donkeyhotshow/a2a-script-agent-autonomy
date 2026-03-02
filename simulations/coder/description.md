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

| Крок | Request                  | Response                                   |
|------|--------------------------|--------------------------------------------|
| 1    | task: "допомоги з кодом" | actions з llmPrompt + fileActions          |
| 2    | result.action: "coder"   | execute.form запитує message               |
| 3    | input.message            | LLM request → аналізує → виконує RAG пошук |
| 4    | result + execute         | LLM request → читає файл                   |
| 5    | input.message            | LLM відповідає + form                      |
| 6    | input.message            | "дякую!" → completed + form                |
| 7    | input.message            | "запиши звіт" → write-file                 |
| 8    | result                   | Файл записано → completed                  |

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
│   ├── request.json
│   └── response.json
├── 2/
│   ├── request.json
│   └── response.json
├── 3/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   └── response.md
├── 4/
│   ├── request.json
│   ├── server-transforms-request.md
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.md
│   └── response.json
├── 5/
│   ├── request.json
│   ├── server-transforms-request.md
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.md
│   └── response.json
├── 6/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   └── response.md
├── 7/
│   ├── request.json
│   ├── server-transforms-request.md
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.md
│   └── response.json
└── 8/
    ├── request.json
    ├── response.json
    ├── request.md
    └── response.md
```

> **Примітка:** Файли `server-transforms-request.md` та `server-transforms-response.md` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно. Деякі кроки можуть
> містити ці файли для демонстрації серверної обробки.
