# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

> **Примечание о context:** Поля внутри `context` курируются системой и имеют свободный формат. Не проверять и не
> трогать. Сюда входят `history`, `execution`, `vite_config`, `aliases` и любые другие поля.

## File layout (per step)

Each step folder can contain up to 6 files, in pipeline order:

| File                            | Direction       | Description                                                                                                               |
|---------------------------------|-----------------|---------------------------------------------------------------------------------------------------------------------------|
| `request.json`                  | Client → Server | Payload from client.                                                                                                      |
| `server-transforms-request.json`  | —               | How the server processes `request.json` and builds the LLM input (transformation before calling LLM). Optional.           |
| `request.md`                    | Server → LLM    | Markdown sent to LLM (system prompt + current state).                                                                     |
| `response.md`                   | LLM → Server    | Expected LLM output (e.g. JSON with `message`, `action`).                                                                 |
| `server-transforms-response.json` | —               | How the server processes `response.md` and builds the client payload (transformation before sending to client). Optional. |
| `response.json`                 | Server → Client | Payload sent to client (context + execute, etc.).                                                                         |

**Order:** request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json →
response.json.

Not every step has all 6 files: steps without LLM typically have `request.json`, `server-transforms-request.json`,
`server-transforms-response.json`, and `response.json`; steps with LLM add the .md files; transform docs describe server
logic even when no LLM is involved.

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

- fix-vue-imports: first response = execute.form with choices (no-LLM first, fallback merged); then script steps.
  fix-vue-imports-batched: batched variant.
- dialog: repeatSteps + fallbackActions + matchScore (aligned with coder).
- coder: single step + fallbackActions.
- coder-smart: steps user-request → rag-clarify → rag-research-plan → checklist → write-doc → execute-item; virtual
  doc (1→1+2→1+2+3→full), write to .carrier/tasks/; then loop (history = [doc], LLM do item, update doc).
- analyze: dialog like coder; AI searches arch docs (RAG), confirms facts or lists discrepancies; optional write-file
  report.
- auto-ai: full capabilities — form, rag-search, read-file, write-file, execute-command (command, exitCode, stdout,
  stderr); true end-to-end flow.