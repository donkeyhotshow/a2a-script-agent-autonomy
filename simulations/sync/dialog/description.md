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
| 1   | result.message: "диалог"      | execute.form.choices (router; extended set — see `1/response.json` / `1/response.md`) |
| 2   | result.choice: "dialog"       | execute.form[message], execution.action = "dialog", step = "request" |
| 3   | result.message: "hello world" | LLM → history +1, execution.step = "request", execute.message + form.input |
| 4   | result.message: "Дякую!"      | execution.step = "completed", execute.message + form.input                 |

## История диалога

- Шаг 3: user: "hello world" → assistant: "hello world"
- Шаг 4: user: "Дякую!" → (завершення діалогу)

**Инвариант (сервер → клиент):** если `context.task` непустой и `context.history` уже содержит строки, в ней **обязательно** есть хотя бы одна запись `role: "user"`. История только из `assistant` при заданном `task` — невалидна (UI теряет «что написал пользователь»). Эталон: `3/response.json`, `4/response.json`; материализация `result.message` в историю: `a2a-server/src/transform/materialize-result-for-llm.ts`. Проверка сохранённых сессий: `npm run scan-session-responses`.

## Структура файлов

```
simulations/sync/dialog/
├── description.md
├── WORKFLOW.md
├── analysis.md
├── 1/                          # Без LLM: router form
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── response.json
│   └── received.json
├── 2/                          # Без LLM: після вибору dialog (див. WORKFLOW.md)
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

- Кроки 1–2 — без LLM у контури `request → server-transforms-request → response.json` (деталі — [`WORKFLOW.md`](WORKFLOW.md)); `request.md` / `response.md` — дзеркала та супутні артефакти для аудиту.
- Кроки 3–4 — з LLM: повний ланцюжок з `request.md` / `response.md`.

