# ISSUE 6 — Оптимізація context між запитами

**Статус:** ✅ реалізовано

## Реалізовано

### Операції в `a2a-server/src/transform/`

| Операція | Файл | Призначення |
|----------|------|-------------|
| `apply-scratchpad-ops` | `operations.ts` | Merge LLM `scratchpad_ops` → `context.scratchpad` |
| `merge-workbench-sections` | `operations.ts` | Shallow-merge `llm.workbench.sections` → `context.workbench.sections` |
| `apply-workbench-section-ops` | `operations.ts` | Застосувати `workbench_ops` (set/append/remove) до `sections` |
| `pick-context` | `operations.ts` | Залишити тільки потрібні поля context |
| `drop` | `operations.ts` | Видалити конкретний JSONPath з `$out` |
| `truncate-history` | `operations.ts` | Залишити останні N записів history |
| `include-if` | `operations.ts` | Умовне включення поля |
| `pick-files` | `operations.ts` | Залишити тільки потрібні файли в `context.files` |
| `merge-files-to-context` | `operations.ts` | `result["read-file"]` → `context.files[path]` |
| `summarize-files` | `operations.ts` | Обрізати файли до N рядків |
| `for-each` | `operations.ts` | Sub-pipeline для кожного елемента масиву |

### Base transforms з `switch` по `execution.step`

- `prompts/transforms/coder-request.json` — switch по step; **`history`** (повна) + **`workbench`** у профілях; response: merge + `workbench_ops`
- `prompts/transforms/auto-ai-request.json` — усі кроки включають **`workbench`** у `pick-context`; response: merge + `workbench_ops`

### Матриця context по шагах

Детально: [`TRANSFORM-OPS.md`](../TRANSFORM-OPS.md#context-optimization-matrix-by-step)

### Тести

`tests/transform-runtime.test.ts` — усі зареєстровані `op`, включно з workbench merge/ops.

## Стратегія (залишається актуальною)

### 6a. Context.scratchpad — command-driven checklist

LLM не перезаписує scratchpad повністю — відправляє короткі команди в `scratchpad_ops`:
```json
{ "op": "check", "item": "read_app_js" }
{ "op": "add", "item": "health route written" }
{ "op": "remove", "item": "pending: read routes" }
```
Сервер застосовує через `apply-scratchpad-ops`. Мінімум вихідних токенів.

### 6b. Context.files — working set

Повний вміст файлів в `context.files[path]`, не в history. В history тільки стислий `system` запис:
```
result.read-file → history: { role: "system", message: "Read src/app.js (142 lines)" }
```
`merge-files-to-context` автоматично переносить `result["read-file"]` → `context.files`.
`summarize-files` обрізає до N рядків перед відправкою в LLM.

### 6c. History — стислі system записи

Кожен tool result → один `system` рядок. Повні дані не в history.
`pick-context` з `history:N` обмежує кількість записів по шагу.

## Що НЕ використовуємо

- Sliding window — втрачає ранній контекст
- LLM-компресія history — дорого (вихідні токени)
- LLM-driven notes — збільшує вихідні токени

## Залишилось

- `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` — перевірити що `history`, `files`, `scratchpad` передаються через `previousContext` (не фільтруються). Виконувати після ISSUE 8b (обидва змінюють `stepRoutes.js`).
- Оновити response transforms симуляцій: додати `apply-scratchpad-ops` де є `scratchpad`.
