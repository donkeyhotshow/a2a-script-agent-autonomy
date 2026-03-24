# Раунд 2 — Аналіз коду vs план

*Дата: 2026-01-27*

Цей документ фіксує розбіжності між планом (issues/) і реальним кодом знайдені при аналізі дерева проекту.

---

## Знахідки

### 1. Transform operations — `apply-scratchpad-ops` не існує

**Файл:** `a2a-server/src/transform/operations.ts`

Реалізовані операції: `copy`, `set`, `append-to-array`, `parse-json-from-md`, `render-markdown`, `switch`.

`apply-scratchpad-ops` — відсутня. ISSUE 6 і ISSUE 9 планують її використовувати, але вона не реалізована і не описана в типах (`types.ts`).

**Що треба:** додати в план явний крок — реалізувати `apply-scratchpad-ops` в `operations.ts` і `types.ts` перед тим як писати симуляції які її використовують.

---

### 2. RAG — пагінація відсутня в протоколі

**Файл:** `a2a-client/packages/rag/src/protocol-rag-search.ts`

RAG повертає `{ results, files, query }`. Пагінації (`page`, `hasMore`, `total`) немає ні в інтерфейсі `RagSearchProtocolResult`, ні в `toRagSearchResult`. Є `maxResults` і `maxFiles` як policy limits, але це не пагінація.

**Що треба:** ISSUE 5 і ISSUE 9 планують `page`/`hasMore` — це потребує змін в `protocol-rag-search.ts` і відповідного `execute.rag-search` параметру `pageSize`. Зафіксувати як окремий крок в ISSUE 9.

---

### 3. Client — `execute.rag-search` не обробляється автоматично

**Файл:** `a2a-client/vite-plugin-a2a/routes/stepRoutes.js`

`POST /next` відправляє запит на сервер і зберігає відповідь. Але немає логіки яка б перехоплювала `execute.rag-search` з відповіді сервера і автоматично виконувала пошук перед поверненням клієнту.

Зараз клієнт обробляє тільки `execute.form` (через Web UI) і `execute.script` (через окремий механізм). `execute.rag-search`, `execute.read-file`, `execute.write-file`, `execute.execute-command` — не обробляються.

**Що треба:** ISSUE 8b це вже фіксує, але не вказує де саме в коді додавати — це `stepRoutes.js` після отримання відповіді від сервера, перед поверненням клієнту.

---

### 4. Context передача — `history` фільтрується неправильно

**Файл:** `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` (~рядок 180-195)

```js
const filteredContext = {};
if (previousStepData.result.context.task) filteredContext.task = ...
if (previousStepData.result.context.execution) filteredContext.execution = ...
```

Клієнт фільтрує context і передає тільки `task` і `execution`. `history`, `files`, `scratchpad` — відкидаються. Це означає що нова стратегія контексту (ISSUE 6) не буде працювати без змін в цьому місці.

**Що треба:** додати в ISSUE 6 явний крок — оновити фільтрацію context в `stepRoutes.js` щоб передавати `history`, `files`, `scratchpad`.

---

### 5. `a2a-server/src/services/rag/` — порожня директорія

RAG на сервері відсутній. Весь RAG живе в `a2a-client/packages/rag/`. Це означає що server-side RAG (який планується в ISSUE 8c як server-side tool) потребує або нової реалізації, або проксування до клієнта.

**Що треба:** уточнити в ISSUE 8 — server-side `rag-search` неможливий без реалізації або проксі. Або залишити RAG як client-side назавжди.

---

### 6. `handlePostStep` в `step-handlers.js` — заглушка

```js
export function handlePostStep(sessionId, body, cwd) {
    // ... full post logic extracted
    // (stub for now, full extract in next edits)
    return { success: true };
}
```

Реальна логіка POST /steps живе в `stepRoutes.js`, а `handlePostStep` — заглушка. Це технічний борг але не блокує поточні issues.

---

## Оновлення issues

| Issue | Що додати |
|-------|-----------|
| ISSUE 6 | Крок: оновити фільтрацію context в `stepRoutes.js` (додати `history`, `files`, `scratchpad`) |
| ISSUE 8 | Уточнити: RAG залишається client-side, server-side неможливий без окремої реалізації |
| ISSUE 8b | Уточнити де в коді: `stepRoutes.js` після отримання відповіді від сервера |
| ISSUE 9 | Додати крок: реалізувати `apply-scratchpad-ops` в `operations.ts` перед симуляцією |
| ISSUE 9 | Додати крок: додати пагінацію в `protocol-rag-search.ts` |
