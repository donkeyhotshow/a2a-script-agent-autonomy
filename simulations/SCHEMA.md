# Simulations schema (canonical)

Align all simulations to avoid redundant or conflicting values.

## SDK / client golden (`@a2a/sdk`)

Simulations are the **contract tests** for the Web + Client API: `received.json` is what the UI should render;
`response.json` is what the SDK merges into session state.

- **Ideal shapes** (forms, execute keys, `context.files` / `scratchpad`, SDK gaps): [
  `CLIENT-SDK-IDEAL.md`](CLIENT-SDK-IDEAL.md).
- **Evolving LLM actions / tools / RAG:** [
  `a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](../a2a-server/docs/EXTENDING-LLM-ACTIONS.md).
- **SDK merge logic:** `a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts`
- **Action dispatch:** `a2a-client/packages/sdk/src/action-handler.ts` (single execute key; includes workspace tools
  such as `list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`).

When improving the client, upgrade the matching `received.json` / `response.json` first, then align code.

## Scope: simulations vs runtime

**Simulations do NOT cover** promise-related flows and async infrastructure:

- `execute.wait` — loading/wait indicator while server processes
- `promiseId` — async request polling
- Polling, retries, timeout handling

Simulations describe the **sync request-response contract** (client.json → received.json). Runtime systems add promise
handling on top; that logic is outside simulation scope.

> **Примечание о context:** Поля внутри `context` курируются системой. Стандартные поля: `execution`, `history`,
> `files`, `scratchpad`, `scratchpad_ops`, `workbench`. Остальные (`vite_config`, `aliases` и т.д.) — свободный формат.

## File layout (per step)

Each step folder has up to **8 canonical** files (the sync pipeline below). You may add **`interrupt.md`** as *
*supplementary documentation** only — it is not part of that pipeline and is **not** required by `sim-lint` ([
`sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) only reads `*.json` in step dirs).

Canonical files (Web ↔ Client API и Client API ↔ Server ↔ LLM):

| File                              | Direction           | Description                                                                                                               |
|-----------------------------------|---------------------|---------------------------------------------------------------------------------------------------------------------------|
| `client.json`                     | Web → Client API    | What Web sends to Client API (e.g. `{ task, projectId }`, `{ sessionId, result }`).                                       |
| `request.json`                    | Client API → Server | Payload from Client API to Server (context + result), already без `projectId`/`sessionId`.                                |
| `server-transforms-request.json`  | —                   | Transforms applied before LLM call. Per-step overrides live here; base transforms in `a2a-server/prompts/transforms/`.    |
| `request.md`                      | Server → LLM        | Markdown sent to LLM (system prompt + current state).                                                                     |
| `response.md`                     | LLM → Server        | Expected LLM output (e.g. JSON with `message`, `action`).                                                                 |
| `server-transforms-response.json` | —                   | Transforms applied after LLM response. Per-step overrides live here; base transforms in `a2a-server/prompts/transforms/`. |
| `response.json`                   | Server → Client API | Payload sent to Client API (context + execute, etc.).                                                                     |
| `received.json`                   | Client API → Web    | **Web execute DTO** after sanitization (see below).                                                                       |

**Order (полный pipeline):**

`client.json → request.json → server-transforms-request.json → request.md → response.md → server-transforms-response.json → response.json → received.json`.

### `received.json` vs `response.json` (`execute`)

- **`response.json`** — Server → Client API: canonical **single action key** under `execute` (`rag-search`, `read-file`,
  `form`, …). Used for chaining, SDK merge, and RAG/script automation.
- **`received.json`** — Client API → Web: **sanitized** `execute` for the UI. Client-only actions are removed (including
  `list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`); the Web layer exposes `message`, optional
  `llmMessage`, optional `attachments` (`readFiles`, `writtenFiles`, `ragQuery`, `shellCommand`, `listDirectoryPath`,
  grep fields, `fileExistsPath`, `editPatchPath`, `runScriptId`, `pendingClientAction`), and keeps `form` when present.
  Implementation: `a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js` (`buildWebExecute`), SDK
  `packages/sdk/src/server/lib/web-execute-dto.ts`. Debug: `GET /sessions/:id?includeContext=1` returns unsanitized
  session data.

Not every step has all 8 files: steps without LLM **always require** `server-transforms-*.json` (or fallback to base transforms from `prompts/transforms/`); steps with LLM add the `.md` files; transform docs describe server logic even when LLM is not used.

> **Critical:** Even when `response.md` is absent (no LLM call), the server **must** apply transforms. The pipeline is:
> 
> - With LLM: `request.json → transforms → request.md → LLM → response.md → transforms → response.json`
> - Without LLM: `request.json → server-transforms-request.json → response.json`
> 
> **Important:** For steps without LLM:
> - **Always require** `server-transforms-request.json` — server transforms the request to build execute
> - **Never require** `server-transforms-response.json` — server builds response directly from transformed request (no LLM to parse)
> 
> This ensures simulation captures server logic deterministically, not just recorded results.

### Supplementary: server interrupt loop (optional)

| File                    | Purpose                                                                                                                                                                                                                                                                                                                                                                             |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `interrupt.md`          | **Documentation only.** Describes how [**gray room**](../a2a-server/docs/GRAY-ROOM.md) (server `interrupt` chain) could apply at this step: sample LLM JSON with `interrupt`, compress output, transform snippet. **Not** part of the client sync pipeline; `sim-lint` does not require it.                                                                                           |
| **`N-sub-M/`** (folder) | **Sister folder next to step `N/`** (`M` = 1,2,3,…). **Server interrupt-loop** goldens only: `request.*` / `response.*` + server-transforms. The Web client does **not** see substeps — one user invoke → server may run several internal LLM/transform turns → **one** outbound payload (step `N` `response.json` / `received.json`). Substeps document internal request/response shapes and **`response.json`** `context.workbench.slots.interruptTrace`. Pattern: `^\d+-sub-\d+$`. **No** `client.json` / `received.json`. `sim-lint` checks JSON syntax and execute rules; `sim-validate` does not treat substeps as standalone simulations. |

Examples: [`agent-auto-ai/6/interrupt.md`](agent-auto-ai/6/interrupt.md); substeps: [
`6-sub-1/`](agent-auto-ai/6-sub-1/) … [`6-sub-4/`](agent-auto-ai/6-sub-4/).

## Примеры Web ↔ Client API

| Файл                                        | Направление      | Что показывает                                                                                              |
|---------------------------------------------|------------------|-------------------------------------------------------------------------------------------------------------|
| `simulations/agent/1/client.json`           | Web → Client API | UI отправляет начальный `task` с `projectId`, чтобы создать сессию и показывать прогресс.                   |
| `simulations/agent/1/received.json`         | Client API → Web | Клиент получает `execute.form.choices` (роутер: dialog, agent, task-decomposition, fix-vue-imports и т.д.). |
| `simulations/agent-coder/2/client.json`     | Web → Client API | После выбора режима агента web отправляет `result.choice` / идентификаторы сессии.                          |
| `simulations/agent-coder/2/received.json`   | Client API → Web | Следующий шаг agent-coder (например форма `message`).                                                       |
| `simulations/agent-coder/1/client.json`     | Web → Client API | Начальный запрос на помощь с кодом (роутер).                                                                |
| `simulations/agent-coder/1/received.json`   | Client API → Web | Ответ роутера с выбором режимов.                                                                            |
| `simulations/agent-analyze/3/client.json`   | Web → Client API | Результат RAG-поиска для анализа архитектуры.                                                               |
| `simulations/agent-analyze/3/received.json` | Client API → Web | Форма с результатами анализа и вариантами продолжения.                                                      |

## Request

- **First request (server‑level симуляция)**: роутер‑шаг `task/new`:
  `{"context":{"execution":{"action":"task","step":"new"}},"result":{"message":"<user task>"}}`
  (как в `simulations/agent/1/request.json`). На верхнем уровне системы этот шаг соответствует
  пользовательскому `{ "task": "..." }`.
- **Router / client choice (новый стандарт)**: сервер присылает `execute.form.choices`; клиент отвечает
  `result.choice` (ID выбранной опции). Пример: `{ "context": {...}, "result": { "choice": "fix-vue-imports" } }`.
- **Legacy actions[]**: только для старых симуляций: когда сервер прислал `actions[]`, можно использовать
  `result.action`
  (будет удаляться; новые симуляции должны опираться на `execute.form.choices` + `result.choice`).
- **Later steps**: `context` + `result` или `input` по схеме конкретного потока.
- **result for read-file**: use action-key shape so server has path + content. Good:
  `result: { "read-file": { "path": "src/auth.js", "content": "..." } }`. Bad: `result: { "content": "..." }` (path
  unknown).
- **result for rag-search**: action-key shape with pagination. Good:
  `result: { "rag-search": { "query": "...", "results": [...], "files": [...], "page": 1, "hasMore": false } }`.
  Bad: `result: { "results": [...] }` (no action key, no pagination).

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

**Правильная структура execute (один action-key за шаг):**

```json
{
  "context": { ... },
  "execute": {
    "form": { ... }
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

**Completion:** Use a single signal — `result.completed: true` on the final step (and/or `context.execution.status === "completed"` where applicable).

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
| `list-directory`  | ❌ Нет                             | ✅ Да                    |
| `grep-search`     | ❌ Нет                             | ✅ Да                    |
| `file-exists`     | ❌ Нет                             | ✅ Да                    |
| `edit-patch`      | ❌ Нет                             | ✅ Да                    |
| `run-script`      | ❌ Нет                             | ✅ Да                    |

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

## Transform operations (server-transforms-request.json)

All operations run in pipeline order on `$out` (copy of input). The goal is to send only the data relevant to the
current `action/step` to the LLM.

| op                            | Purpose                                                                                                                                                      | Key params                          |
|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|
| `copy`                        | Copy full input to `$out`                                                                                                                                    | `from`, `to`                        |
| `set`                         | Set literal or JSONPath value                                                                                                                                | `path`, `value` / `valueFrom`       |
| `append-to-array`             | Append entry to array                                                                                                                                        | `to`, `value`                       |
| `truncate-section`            | Cap string length in field or object                                                                                                                         | `path`, `maxChars`                  |
| `apply-scratchpad-ops`        | Merge LLM `scratchpad_ops` into `context.scratchpad`                                                                                                         | `from`                              |
| `merge-workbench-sections`    | Shallow-merge `llm.workbench.sections` → `context.workbench.sections`                                                                                        | `from`, `to`                        |
| `apply-workbench-section-ops` | Apply LLM `workbench_ops` (set/append/remove; short `o`,`k`,`v`,`t`)                                                                                         | `from`, `sectionsPath?`             |
| `pick-context`                | **Keep only listed fields** under `context`, drop the rest. Use `"history"` / `"history:all"` / `"history:0"` for full history, or `"history:N"` for last N. | `include: string[]`                 |
| `drop`                        | Delete a JSONPath from `$out`                                                                                                                                | `path`                              |
| `truncate-history`            | Keep only last N history entries                                                                                                                             | `keep: number`                      |
| `include-if`                  | Drop `path` when `condition` is falsy                                                                                                                        | `path`, `condition`                 |
| `pick-files`                  | Keep only specific paths in `context.files`. Use `"$result"` to auto-pick from result action key.                                                            | `paths: string[] \| "$result"`      |
| `merge-files-to-context`      | Fold `result["read-file"]` / `result["write-file"]` → `context.files[path]`. Merges into existing files.                                                     | `from?: string[]`                   |
| `summarize-files`             | Truncate `context.files` values to first N lines. `only` prefix filter.                                                                                      | `maxLines?`, `only?: string[]`      |
| `for-each`                    | Run sub-pipeline per element of an array. Injects element as `as` variable.                                                                                  | `arrayPath`, `as`, `steps`          |
| `render-markdown`             | Render prompt template → `request.md`                                                                                                                        | `templateRef`, `data`, `outputFile` |
| `parse-json-from-md`          | Extract JSON from markdown file                                                                                                                              | `fromFile`, `to`                    |
| `switch`                      | Conditional branch by discriminator value                                                                                                                    | `discriminator`, `cases`            |

### Context optimization patterns by step type

| Step type                  | `pick-context` include                                      | Extra ops                             |
|----------------------------|-------------------------------------------------------------|---------------------------------------|
| RAG search result          | `execution`, `task`, `history:3`                            | `set ragResults from result`          |
| Read file result           | `execution`, `task`, `history:3`, `files`                   | `pick-files: $result`                 |
| Execute item (coder-smart) | `execution`, `task`, `history:2`, `workbench`, `scratchpad` | `truncate-section workbench.sections` |
| Analyze / summarize        | `execution`, `task`, `history:5`, `workbench`               | `truncate-section workbench.sections` |
| Dialog / form              | `execution`, `task`, `history:5`                            | —                                     |

**Rule:** always start with `copy` then `pick-context`. Only add back what the LLM actually needs for this step.

## JSON

- No trailing commas. Valid JSON only.

## Context fields (canonical)

| Field                     | Type   | Description                                                                                                                                                           |
|---------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `execution`               | object | `{ action, step? }` — current action and optional step label                                                                                                          |
| `history`                 | array  | `[{ role, message, action? }]` — стислі записи. `role`: `user`, `assistant`, `system`. Tool results → один `system` рядок, не повний вміст                            |
| `files`                   | object | `{ "path": "<full content>" }` — working set прочитаних файлів. Не в history                                                                                          |
| `scratchpad`              | object | `{ "item_key": true/false }` — checklist стану задачі. Оновлюється через `scratchpad_ops`                                                                             |
| `scratchpad_ops`          | array  | Команди від LLM: `[{ "op": "check"                                                                                                                                    |"add"|"remove", "item": "..." }]`. Сервер застосовує і видаляє поле |
| `workbench` (in LLM JSON) | object | Optional top-level у відповіді моделі: **`sections`** — shallow-merge у `context.workbench.sections` (див. `merge-workbench-sections` у response transform).          |
| `workbench_ops`           | array  | Інкрементальні правки `sections`: `set`/`append`/`remove` (коротко `o`/`k`/`v`/`t`). Застосовуються **після** merge. Деталі: `a2a-server/prompts/auto-ai-request.md`. |
| `workbench` (in context)  | object | **`sections`** — named text chunks; optional **`batch`**, **`slots`**. Накопичувач багатокрокових flow.                                                               |

**Правило history:** великі дані (вміст файлів, stdout команд) не потрапляють в history. Тільки стислий `system` запис:

```json
{ "role": "system", "message": "Read src/app.js (142 lines)" }
```

Повний вміст — в `context.files[path]`.

## Sequential multi-step flows and accumulated context

**“Batch” is not only `script` iterating a file list.** The same idea applies whenever the product must **process units
in sequence** (files, RAG pages, checklist rows, subtasks, form gates) and **carry outcomes forward** for the next
server decision.

### Pattern (all modes)

1. **Server-driven ordering** — `context.execution` (`action`, `step`, optional `progress`) selects the next unit of
   work. The client returns **`result`** in **action-key** shape; the server chooses the following `execute`.
2. **Accumulation** — each `result` is merged into context (via server logic / transforms / session merge) so the next
   `request.json` is **not** stateless:
    - **`context.history`** — short `user` / `assistant` / `system` lines (no full file bodies in history).
    - **`context.files`** — read contents keyed by path; tool summaries as system lines + payloads here when needed.
    - **`context.scratchpad` / `scratchpad_ops`** — checklist and structured flags.
    - **`context.workbench`** — structured state: `sections` (draft doc), optional `batch`, `slots`; оновлюється з LLM
      через `workbench.sections` merge + `workbench_ops` (див. base `*-response.json` для auto-ai / coder / analyze).
    - **Flow-specific fields** — e.g. `broken_uses`, `patches`, scan state; document them in the sim; prefer mapping
      into the canonical fields above when possible.
3. **Mixed `execute` types** — a sequence may alternate **`script`**, **`rag-search`**, **`read-file`**, **`form`** (
   human confirmation), **`message`**, **`write-file`**, **`execute-command`**, and LLM-chosen steps. The contract is
   always: **one active `execute` key** → client runs → **`result`** → context update → next step.
4. **LLM flows** — AI-Actions use the same accumulation idea: each round updates `history` / `execution` / `workbench`;
   “batch” can mean **many tool or LLM rounds**, not a single client script loop.

### Golden simulations (by mechanism)

| Simulation                        | What is “batched” / sequential                                 | Where data accumulates                                                    |
|-----------------------------------|----------------------------------------------------------------|---------------------------------------------------------------------------|
| `fix-vue-imports-batched`         | Many files: inventory → `rag-search` per file → apply `script` | `execution.progress`, `result` chains between steps                       |
| `fix-laravel-namespaces-and-uses` | Pipeline of `script` steps                                     | Structured `result` passed forward (detect → resolve → apply)             |
| `coder-smart-v2`                  | Checklist / execute-item loop                                  | `workbench.sections`, task file on disk; history reset per item by design |
| `coder` / `analyze`               | RAG → read-file / forms                                        | `history`, `files`, forms as gates                                        |
| `task-decomposition`              | Progressive breakdown                                          | `history`, execution step labels                                          |

### Planned batch-style flows (roadmap)

Use this table to **prioritize simulations and server behavior** before implementation. Status: **golden** = has
step-by-step `simulations/<name>/`; **partial** = one path only or undocumented accumulation; **gap** = design TBD.

| Flow                         | Units in sequence                     | Accumulation target                                           | Status      | Notes                                                                            |
|------------------------------|---------------------------------------|---------------------------------------------------------------|-------------|----------------------------------------------------------------------------------|
| Vue imports (batched)        | Files × (`script` → `rag-search` → …) | `execution.progress`, prior `result`                          | **golden**  | `fix-vue-imports-batched`                                                        |
| Laravel use/namespace fix    | Stages (detect → resolve → apply)     | Structured `result` between `script` steps                    | **golden**  | `fix-laravel-namespaces-and-uses`                                                |
| Coder smart v2 checklist     | Checklist items / execute-item        | `workbench.sections`, task file; history reset per item       | **golden**  | By design                                                                        |
| RAG **paginated** drain      | Pages until `hasMore: false`          | Merge hits into `history` + optional `files` / summary object | **gap**     | Contract: fold pages in transforms; sim for 2+ pages                             |
| Multi **`read-file` queue**  | Paths from plan or script             | `context.files`, short system lines                           | **gap**     | Same pattern as batched RAG; explicit `execution` cursor                         |
| Large repo **chunked scan**  | Chunks of paths (checkpoint/resume)   | `scan_state` or equivalent in context                         | **gap**     | See batch2 sketch in planning docs                                               |
| **Auto-AI v2** tool loop     | LLM turns + tools                     | `files`, `scratchpad`, history                                | **partial** | Formalize max steps, failure mid-batch, single `execute` per round               |
| **Human gate** every N units | Batch size N then `form`              | User choice merges into `result` → server continues queue     | **gap**     | UI + sim: “approve next chunk”                                                   |
| **Parallel** client work     | Multiple paths in one `script`        | Single `result` blob (array) vs sequential                    | **design**  | Prefer sequential goldens first; parallel = one `execute` returning many results |

**Planning order (suggested):** (1) **RAG pagination** sim — smallest extension to existing `rag-search` contract. (2) *
*read-file queue** — mirrors file batch without LLM. (3) **Chunked scan** — only when real repos exceed client
timeouts. (4) **Human gate** — product/UX dependent.

### Authoring checklist

- State explicitly **where** each step’s `result` is folded (history vs `files` vs scratchpad vs custom).
- Keep **one top-level key under `execute`** per step ([`CLIENT-SDK-IDEAL.md`](CLIENT-SDK-IDEAL.md)).
- If the flow loops, define **termination** (last index, empty queue, `completed` in `execution`, or final `form`).

## Reference sims

- **agent**: базовый сеанс с выбором типа действия; демонстрирует execute.form.choices
- **coder**: AI-асистент для работы с кодом; полный цикл от выбора действия до выполнения через LLM
- **coder-smart**: продвинутый кодер с документированием; создает task-документ, затем выполняет пункты
- **analyze**: анализ архитектуры проекта; AI ищет документацию и выявляет несоответствия
- **task-decomposition**: декомпозиция задач; прогрессивное разбиение задачи на подзадачи/шаги/действия
- **fix-vue-imports**: actions-based симуляция; исправление импортов в Vue файлах (алгоритмический подход)
- **fix-vue-imports-batched**: sequential multi-step flow (script → repeated rag-search → script); see **Sequential
  multi-step flows** above
- **phpunit-deprecations**: поиск устаревших PHPUnit методов
- **test-action-flow**: тест полного потока выбора действий
- **auto-ai**: полные возможности системы; все типы execute команд в одном сценарии
