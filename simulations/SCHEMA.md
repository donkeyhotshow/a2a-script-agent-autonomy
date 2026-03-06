# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

> **Примечание о context:** Поля внутри `context` курируются системой и имеют свободный формат. Не проверять и не
> трогать. Сюда входят `history`, `execution`, `vite_config`, `aliases` и любые другие поля.

## File layout (per step)

Each step folder can contain up to **8** files, covering both **Web ↔ Client API** и **Client API ↔ Server ↔ LLM**:

| File                            | Direction            | Description                                                                                                               |
|---------------------------------|----------------------|---------------------------------------------------------------------------------------------------------------------------|
| `client.json`                   | Web → Client API     | What Web sends to Client API (e.g. `{ task, projectId }`, `{ sessionId, result }`).                                       |
| `request.json`                  | Client API → Server  | Payload from Client API to Server (context + result), already без `projectId`/`sessionId`.                               |
| `server-transforms-request.json`  | —                    | How the server processes `request.json` and builds the LLM input (transformation before calling LLM). Optional.           |
| `request.md`                    | Server → LLM         | Markdown sent to LLM (system prompt + current state).                                                                     |
| `response.md`                   | LLM → Server         | Expected LLM output (e.g. JSON with `message`, `action`).                                                                 |
| `server-transforms-response.json` | —                    | How the server processes `response.md` and builds the client payload (transformation before sending to client). Optional. |
| `response.json`                 | Server → Client API  | Payload sent to Client API (context + execute, etc.).                                                                     |
| `received.json`                 | Client API → Web     | What Client API returns to Web (e.g. `{ projectId, sessionId, execute }`).                                                |

**Order (полный pipeline):**

`client.json → request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json → received.json`.

Not every step has all 8 files: steps without LLM обычно имеют `client.json`, `request.json`, `server-transforms-request.json`,
`server-transforms-response.json`, `response.json`, `received.json`; steps with LLM add the `.md` files; transform docs
описывают серверную логику даже когда LLM не используется.

## Примеры Web ↔ Client API

| Файл | Направление | Что показывает |
|------|-------------|---------------|
| `simulations/dialog/1/client.json` | Web → Client API | UI отправляет начальный `task` с `projectId`, чтобы создать сессию и показывать прогресс. |
| `simulations/dialog/1/received.json` | Client API → Web | Клиент получает `execute.form` с выбором режимов (dialog, auto-ai, task-decomposition); это то, что рендерит интерфейс. |
| `simulations/dialog/2/client.json` | Web → Client API | После выбора опции web отправляет `result.choice` вместе с идентификаторами сессии/проекта. |
| `simulations/dialog/2/received.json` | Client API → Web | Клиент API отвечает формой с полем `message` для следующего шага диалога. |
| `simulations/coder/1/client.json` | Web → Client API | Начальный запрос на помощь с кодом. |
| `simulations/coder/1/received.json` | Client API → Web | Выбор типа действия (coder, auto-ai, task-decomposition). |
| `simulations/analyze/3/client.json` | Web → Client API | Результат RAG-поиска для анализа архитектуры. |
| `simulations/analyze/3/received.json` | Client API → Web | Форма с результатами анализа и вариантами продолжения. |

## Request

- **First request (server‑level симуляция)**: роутер‑шаг `task/new`:
  `{"context":{"execution":{"action":"task","step":"new"}},"result":{"message":"<user task>"}}`
  (как в `simulations/dialog/1/request.json`). На верхнем уровне системы этот шаг соответствует
  пользовательскому `{ "task": "..." }`.
- **Router / client choice (новый стандарт)**: сервер присылает `execute.form.choices`; клиент отвечает
  `result.choice` (ID выбранной опции). Пример: `{ "context": {...}, "result": { "choice": "fix-vue-imports" } }`.
- **Legacy actions[]**: только для старых симуляций: когда сервер прислал `actions[]`, можно использовать `result.action`
  (будет удаляться; новые симуляции должны опираться на `execute.form.choices` + `result.choice`).
- **Later steps**: `context` + `result` или `input` по схеме конкретного потока.
- **result for read-file**: use action-key shape so server has path + content. Good:
  `result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Bad: `result: { "content": "..." }` (path
  unknown).
- **result for rag-search**: use action-key shape so server can pass results to LLM as `ragResults`. Good:
  `result: { "rag-search": { "results": [ { "file": "...", "score": 0.95, "snippet": "..." } ], "files": ["path1", "path2"] } }`.
  Optional: `"query": "..."` for traceability. Bad: `result: { "results": [...], "files": [...] }` (no action key).

## Response (server)

- **First response**: either (1) `context`, `actions[]`, optionally `fallbackActions[]`; or (2) `context`,
  `execute.form` with `choices`. When using form: no-LLM actions first (higher priority), then fallbackActions merged
  into same choices; client replies with `result.choice`.
- **Two types of offerings in first response:** (1) **actions** — primary; hardcoded steps, server determines next step
  from `result`. (2) **ai-actions** — secondary (e.g. LLM dialog); steps are not a fixed sequence; server shows a list
  of *available* steps; next step is derived from LLM response; each step can be a separate request to LLM.
- **Action object**: `action`, `title`, `description`, `priority`; optional `matchScore`, `steps[]`, `repeatSteps[]`.
  For **actions**: `steps[]` are hardcoded so the server can advance; for **ai-actions**: `steps[]` (if present) are
  available steps for display only — LLM chooses next from its answer.
- **Step object**: `action`, `title`, `description`, `priority`; optional `input`, `output`.
- **fallbackActions** (when present): `mode`, `title`, `description`, `fallbackType`. Use same two entries: `auto-ai` (
  llm_generation), `task-decomposition` (manual).

### execute (canonical)

`execute` is an object where **each key is the action type**, value is params. No flat `"action": "<name>"` with params
as siblings.

- **Good**: `"execute": { "read-file": { "path": "src/auth.js" } }`,
  `"execute": { "write-file": { "path": "...", "content": "..." } }`, `"execute": { "rag-search": { "query": "..." } }`,
  `"execute": { "form": { "input": [...] } }`,
  `"execute": { "script": { "input": {}, "output": "...", "code": "..." } }`,
  `"execute": { "execute-command": { "command": "npm test" } }`.
- **Bad**: `"execute": { "action": "read-file", "file": "src/auth.js" }` (flat; param name can collide with `action`).
- **result for execute-command**: client returns
  `result: { "execute-command": { "command": "npm test", "exitCode": 0, "stdout": "...", "stderr": "" } }` (action-key
  shape). Server can pass to LLM for summary or next step.

**Правильная структура execute:**

```json
{
  "context": { ... },
  "execute": {
    "form": { ... },
    "script": { ... },
    "rag-search": { ... }
  }
}
```

- **Прямые ключи** (`form`, `script`, `rag-search`) в `execute` — это ПРАВИЛЬНО
- **`execute.message` с `role` и `content`** — НЕ НУЖНО, это избыточно

### result на верхнем уровне (только для финального шага)

Поле `result` на верхнем уровне `response.json` используется ТОЛЬКО для финального шага:

```json
{
  "context": { ... },
  "execute": {
    "form": {
      "title": "Готово",
      "choices": [{ "label": "OK", "value": "done" }]
    }
  },
  "result": {
    "completed": true,
    "fixed_count": 50
  }
}
```

Для промежуточных шагов `result` передаётся только в `request.json` (от клиента к серверу).

**execute.form with choices:** optional `form.title`, `form.choices` = `[{ "id": "...", "label": "..." }]` (e.g.
continue_search, save_report). Client sends `result.choice` + optional `result.message` / `result.path`. Save path
default: `.carrier/reports/` (e.g. `architecture-report.md`).

## Логика execute

**execute** - это команды, которые будут выполнены клиентом или веб-клиентом:

| Команда           | Транслируется на веб              | Обрабатывается клиентом |
|-------------------|-----------------------------------|-------------------------|
| `message`         | ✅ Да (показывает текст в диалоге) | ❌                       |
| `form`            | ✅ Да (показывает форму)           | ❌                       |
| `read-file`       | ❌ Нет                             | ✅ Да                    |
| `write-file`      | ❌ Нет                             | ✅ Да                    |
| `rag-search`      | ❌ Нет                             | ✅ Да                    |
| `execute-command` | ❌ Нет                             | ✅ Да                    |
| `script`          | ❌ Нет                             | ✅ Да                    |

**Практика:**

- Чтобы показать сообщение в диалоге на вебе - добавляй `message` в `execute`
- Команды для клиента (read-file, write-file и т.д.) не показываются на вебе
- `form` показывает UI форму на вебе

## Завершение задачи (финал)

Есть два типа симуляций:

### 1. AI-Actions (LLM выбирает следующий шаг)

Когда AI решает что задача завершена, он:

- Возвращает `message` с итоговым сообщением
- Указывает `completed: true` или `action: "complete"`

### 2. Actions (по алгоритму)

Когда алгоритм завершён — это автоматически конец. Дополнительный сигнал не требуется, но для клиента можно
использовать:

```json
{
  "message": "Задача завершена",
  "execute": {}
}
```

или

```json
{
  "execute": {
    "form": {
      "title": "Готово",
      "input": [],
      "choices": [{ "label": "OK", "value": "done" }]
    }
  }
}
```

### Правило:

- **AI-Actions**: AI явно указывает `completed` или следующий шаг
- **Actions**: Конец алгоритма = конец задачи. Клиент определяет завершение по отсутствию следующего шага.

## JSON

- No trailing commas. Valid JSON only.

## Reference sims

- **dialog**: базовый диалог с выбором типа действия; демонстрирует execute.form.choices
- **coder**: AI-асистент для работы с кодом; полный цикл от выбора действия до выполнения через LLM
- **coder-smart**: продвинутый кодер с документированием; создает task-документ, затем выполняет пункты
- **analyze**: анализ архитектуры проекта; AI ищет документацию и выявляет несоответствия
- **task-decomposition**: декомпозиция задач; прогрессивное разбиение задачи на подзадачи/шаги/действия
- **fix-vue-imports**: actions-based симуляция; исправление импортов в Vue файлах (алгоритмический подход)
- **fix-vue-imports-batched**: пакетная обработка; исправление импортов в нескольких файлах
- **phpunit-deprecations**: поиск устаревших PHPUnit методов
- **test-action-flow**: тест полного потока выбора действий
- **auto-ai**: полные возможности системы; все типы execute команд в одном сценарии
