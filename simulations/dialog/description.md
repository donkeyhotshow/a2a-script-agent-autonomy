# Dialog Simulation - AI-Actions

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Описание

Симуляция показывает диалог с AI (action: dialog).

> **Scope:** Симуляции не описывают работу с промисами (`execute.wait`, `promiseId`, polling). См.
`simulations/SCHEMA.md` — "Scope: simulations vs runtime".

## Pipeline логіка

### Кроки з LLM (3, 4)
```
request.json → server-transforms-request.json → request.md → LLM → response.md → server-transforms-response.json → response.json
```

### Кроки без LLM (1, 2)
```
request.json → server-transforms-request.json → response.json
```
- Сервер трансформує запит у execute
- `server-transforms-response.json` НЕ потрібен — сервер сам формує відповідь без LLM

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
├── 1/                          # Без LLM: router form
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── response.json
│   └── received.json
├── 2/                          # З LLM
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 3/                          # З LLM
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
└── 4/                          # З LLM
    ├── client.json
    ├── request.json
    ├── server-transforms-request.json
    ├── request.md
    ├── response.md
    ├── server-transforms-response.json
    ├── response.json
    └── received.json
```

## Нотатки

- Крок 1 — без LLM, має тільки `server-transforms-request.json`
- Кроки 2, 3, 4 — з LLM, мають повний пайпайн з request.md/response.md
