# Dialog Simulation - AI-Actions

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Описание

Симуляция показывает диалог с AI (action: dialog).

## Поток

| Шаг | Request                                      | Response                                                                 |
|-----|----------------------------------------------|--------------------------------------------------------------------------|
| 1   | result.message: "диалог"                     | execute.form.choices (router: dialog / auto-ai / task-decomposition)    |
| 2   | result.choice: "dialog"                      | execute.form.input[message], execution.action = "dialog", step = "request" |
| 3   | result.message: "hello world"                | LLM → history +1, execution.step = "llm-request", execute.message + form.input |
| 4   | result.message: "Дякую!"                     | LLM → history +1, execution.step = "completed", execute.message + form.input  |

## История диалога

- 3: user: "hello world" → assistant: "hello world"
- 4: user: "Дякую!" → assistant: "Будь ласка! Звертайся ще."
- 5: completed

## Структура файлов

```
simulations/dialog/
├── description.md
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
├── 5/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   └── response.md
├── 6/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   └── response.md
└── steps/
    └── ai-analyze-prompt.md
```

> **Примітка:** Файли `server-transforms-request.json` та `server-transforms-response.json` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно. Деякі кроки можуть
> містити ці файли для демонстрації серверної обробки.
