# Раунд 3 — Аналіз коду (арка 2)

*Дата: 2026-01-27*

Перевірка відповідності між реальним кодом і планами issues. Читались: `dialog-request-processor.ts`, `action-request-processor.ts`, `request-processor.service.ts`, `action-registry.ts`, `operations.ts`, `types.ts`, `stepRoutes.js`, `protocol-rag-search.ts`, `index.ts`, `app.ts`, симуляції `dialog/3-4`, `coder/2`, `auto-ai/3`.

---

## Знахідка 1: ISSUE 2 — `ctx` в `runResponseTransform` — неправильна структура

**Файл:** `dialog-request-processor.ts`, `doProcess` (~рядок 155)

`doProcess` викликає `runResponseTransform(promptsPath, schemaName, ctx, responseMd)` де `ctx = { ...context }` — тобто передається весь context запиту (`task`, `execution`, `history`...).

Але в `runResponseTransform` (~рядок 80):
```typescript
const ctxContext = ctx['context'] as Record<string, unknown> | undefined;
const existingHistory = (ctxContext?.history ?? []) as ...
```
`ctx['context']` = undefined тому що `ctx` вже є context. Баг підтверджений.

Але є ще: `ctx['result']` (~рядок 84) — `result` не є частиною context, він передається окремо в запиті. В `doProcess` `ctx = { ...context }` без `result`. Тобто `ctxResult?.message` завжди undefined → `userMessage` завжди undefined → user message ніколи не додається в history.

**Що треба додати в ISSUE 2:** `doProcess` повинен передавати і `result` в `runResponseTransform`, або `runResponseTransform` повинна приймати `result` окремим параметром.

---

## Знахідка 2: ISSUE 2 — дублювання логіки в `recoverDialogFromLlmPromise`

**Файл:** `dialog-request-processor.ts`, ~рядок 230-310

Та сама логіка history/message написана двічі — в `runResponseTransform` і в `recoverDialogFromLlmPromise`. Обидва мають однаковий баг `ctx['context']`. Фікс треба застосувати в обох місцях. ISSUE 2 не згадує `recoverDialogFromLlmPromise`.

**Що треба додати в ISSUE 2:** явно вказати що `recoverDialogFromLlmPromise` має той самий баг і потребує того самого фіксу.

---

## Знахідка 3: ISSUE 3 — `coder/2` не обробляється жодним процесором

**Файли:** `request-processor.service.ts` (`determineRequestType`), `simulations/coder/2/request.json`

`coder/2/request.json`:
```json
{ "context": { "task": "..." }, "result": { "choice": "coder" } }
```

`determineRequestType`:
- немає `execution.action` → не `dialog`
- немає `form_submission`/`selected_choice` → не `form`
- немає `step_result`/`approve_action` → не `action` (явно)
- падає в `return 'action'` (default)

`ActionRequestProcessor.canProcess`: перевіряє `getActionType` — `result.choice` не є жодним з `step_result`/`task_request`/`approve_action`. Повертає `false` для явних типів, але `canProcess` повертає `true` для `actionType === undefined` (default). Тобто `coder/2` потрапляє в `handleTaskRequest` — але там `parseTaskText` шукає `task` в context, а не `result.choice`. Тобто `result.choice = "coder"` ігнорується повністю.

**Підтверджено:** `coder/2` не обробляється правильно. Вибір `coder` з форми не призводить до ініціалізації coder action.

**Що треба додати в ISSUE 3:** конкретний фікс — в `determineRequestType` додати перевірку `result.choice` → роутити в `dialog` якщо `execution.action` вже встановлено в попередній відповіді, або додати окремий тип `choice` і обробник.

---

## Знахідка 4: ISSUE 1 — `actionRegistry` порожній при старті

**Файли:** `action-registry.ts`, `index.ts`

`actionRegistry = getActionRegistry()` — singleton створюється без виклику `loadFromDirectory()`. `index.ts` не викликає `loadFromDirectory`. Тобто при будь-якому запиті `actionRegistry.getAllActions()` повертає порожній Map → `actionsToUse.length === 0` → завжди `ROUTER_CHOICES` без LLM.

`fix-vue-imports`, `coder`, `coder-smart` — не зареєстровані при старті.

**Що треба додати в ISSUE 1:** перевірити де повинен викликатись `loadFromDirectory` — в `index.ts` при старті сервера, або lazy при першому запиті. Зараз не викликається ніде.

---

## Знахідка 5: ISSUE 9 — формат `execute.rag-search` в симуляції

**Файл:** `simulations/auto-ai/3/response.json`

```json
"execute": { "rag-search": { "query": "express app API routes entry point" } }
```

Ключ — `"rag-search"` (з дефісом), не `execute.ragSearch`. Це важливо для `stepRoutes.js` де треба перевіряти `execute["rag-search"]`, не `execute.ragSearch`. ISSUE 8b і ISSUE 9 не уточнюють ключ — треба зафіксувати.

---

## Знахідка 6: ISSUE 6 — подвійний шлях context в `stepRoutes.js`

**Файл:** `stepRoutes.js`, POST /next (~рядок 230-250)

Є два джерела context:
1. `previousContext = previousStepData?.context || {}` — береться весь context з `server-response.json` (не фільтрується)
2. `previousStepData.result.context` — фільтрується, залишається тільки `task` і `execution`

`mergedContext = { ...previousContext, ...filteredContext }` — тобто `history` може проходити через `previousContext` якщо `server-response.json` містить `context.history`. Але `result.context.history` відкидається.

Це непослідовно: якщо сервер повертає history в `context` (верхній рівень відповіді) — воно проходить. Якщо в `result.context` — відкидається. ISSUE 6 описує проблему як "history фільтрується" — але насправді залежить від того де сервер кладе history у відповідь.

**Що треба уточнити в ISSUE 6:** перевірити де саме сервер кладе history у відповідь (`ProcessResult.context` vs вкладений `result.context`) і відповідно виправити фільтрацію.

---

## Оновлення issues

| Issue | Що додати |
|-------|-----------|
| ISSUE 1 | `loadFromDirectory` не викликається при старті — реєстр порожній. Знайти де викликати (в `index.ts`) |
| ISSUE 2 | `doProcess` не передає `result` в `runResponseTransform` → `userMessage` завжди undefined. `recoverDialogFromLlmPromise` має той самий баг — фіксувати обидва місця |
| ISSUE 3 | `coder/2` (`result.choice`) не обробляється — підтверджено. Конкретний фікс: `determineRequestType` або новий обробник для `result.choice` |
| ISSUE 6 | Уточнити: history може проходити через `previousContext` (не фільтрується), але не через `result.context`. Перевірити де сервер кладе history у відповідь |
| ISSUE 8b | Ключ для перевірки в `stepRoutes.js`: `execute["rag-search"]`, не `execute.ragSearch` |
| ISSUE 9 | Зафіксувати формат ключа: `execute["rag-search"]` (з дефісом) |
