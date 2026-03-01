# Coder Dialog Simulation

## Опис

Симуляція показує діалог з AI-асистентом (кодером), який може:
- Вести діалог з користувачем
- Шукати файли в проекті за натуральним запитом (RAG)
- Читати вміст файлів
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

| Крок | Request | Response |
|-----|---------|----------|
| 1 | task: "допоможи з кодом" | actions з llmPrompt + fileActions |
| 2 | result.action: "coder-dialog" | execute.form запитує message |
| 3 | input.message | LLM request → аналізує → виконує action |
| 4 | result + execute | LLM request → продовжує діалог |
| 5-... | input.message | Повторює кроки 3-4 |

## Можливі дії

1. **dialog** - діалог з LLM
2. **rag-search** - пошук за натуральним запитом (використовує @a2a/rag)
3. **read-file** - читання вмісту файлу
4. **execute-command** - виконання команди

## Структура файлів

```
simulations/coder-dialog/
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
│   ├── response.json
│   ├── request.md
│   └── response.md
└── ...
```
