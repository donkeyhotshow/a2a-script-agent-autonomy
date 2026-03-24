# Dialog Simulation - AI-Actions

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Описание

Симуляция показывает диалог с AI (action: dialog).

> **Scope:** Симуляции не описывают работу с промисами (`execute.wait`, `promiseId`, polling). См.
`simulations/SCHEMA.md` — "Scope: simulations vs runtime".

## Поток

| Шаг | Request                       | Response                                                                   |
|-----|-------------------------------|----------------------------------------------------------------------------|
| 1   | result.message: "диалог"      | execute.form.choices (router: dialog / agent / task-decomposition)         |
| 2   | result.choice: "dialog"       | execute.form.input[message], execution.action = "dialog", step = "request" |
| 3   | result.message: "hello world" | LLM → history +1, execution.step = "request", execute.message + form.input |
| 4   | result.message: "Дякую!"      | execution.step = "completed", execute.message + form.input                 |

## История диалога

- Шаг 3: user: "hello world" → assistant: "hello world"
- Шаг 4: user: "Дякую!" → (завершення діалогу)

## Структура файлов

```
simulations/dialog/
├── description.md
├── WORKFLOW.md
├── analysis.md
├── 1/
│   ├── request.json
│   ├── response.json
│   ├── client.json
│   ├── received.json
│   ├── server-response.json
│   └── server-transforms-request.json (опціонально)
├── 2/
│   ├── request.json
│   ├── response.json
│   ├── client.json
│   ├── received.json
│   ├── server-response.json
│   └── server-transforms-response.json (опціонально)
├── 3/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   ├── response.md
│   ├── server-response.json
│   ├── server-transforms-request.json
│   └── server-transforms-response.json
├── 4/
│   ├── request.json
│   ├── response.json
│   ├── request.md
│   ├── response.md
│   ├── server-response.json
│   ├── server-transforms-request.json
│   └── server-transforms-response.json
```

> **Примітка:** Файли `server-transforms-request.json` та `server-transforms-response.json` є опціональними і показують
> трансформацію даних на сервері перед відправкою до LLM та після отримання відповіді відповідно. Деякі кроки можуть
> містити ці файли для демонстрації серверної обробки.
