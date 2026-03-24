# ISSUE 9 — Auto-AI: переробка симуляції під нову стратегію контексту

**Статус:** потребує переробки симуляції разом з ISSUE 5+6+8

## Симуляція

`simulations/auto-ai/` — 16 кроків, повний агентний цикл (rag-search, list-directory, read-file ×3, write-file ×4, grep-search, execute-command ×2, completed).

## Рішення

ISSUE 9 визначає стратегію context через симуляцію. ISSUE 6 (код) і ISSUE 5 (симуляція coder-smart) залежать від ISSUE 9, не навпаки. Auto-ai стає reference симуляцією для нової стратегії контексту.

## Поточні проблеми симуляції

- `result.read-file` з повним вмістом файлів передається в наступний крок — нереалістично
- History скорочується між кроками без явної стратегії (step 4→5 вже менша)
- `system` role вже використовується для tool results — правильно, але не систематизовано
- RAG: немає пагінації, немає контролю над кількістю результатів, невідомий рівень готовності RAG системи

## Нова структура context (по стратегії ISSUE 6)

```json
"context": {
  "task": "...",
  "execution": { "action": "auto-ai" },
  "files": { "src/app.js": "<full content>" },
  "scratchpad": { "read_app_js": true, "health_route_written": true },
  "history": [
    { "role": "system", "message": "Read src/app.js (142 lines)" },
    { "role": "system", "message": "Wrote health route (write-file)" }
  ]
}
```

History entries should stay short, system-level descriptions of tool results (see ISSUE 6). Assistant messages with full payloads should not be kept in history, only in `context.files` or other tool-specific fields.

## LLM команди для scratchpad (мінімум вихідних токенів)

```json
"scratchpad_ops": [
  { "op": "check", "item": "read_app_js" },
  { "op": "add", "item": "health_route_written" }
]
```

## RAG — прийняте рішення

Пишемо симуляцію з припущеннями про RAG (пагінація є, базові фільтри є). Якщо після аудиту виявиться що щось не підтримується — коригуємо симуляцію. Аудит RAG не блокує переробку.

Симуляція використовує ключ `execute["rag-search"]` (з дефісом), тож клієнт має перевіряти саме цей стиль ключа при реалізації автоматичного циклу (ISSUE 8b / ROUND3).

## Дії

1. Реалізувати `apply-scratchpad-ops` в `a2a-server/src/transform/operations.ts` і `types.ts` — блокує всі симуляції з scratchpad
2. Додати пагінацію в `a2a-client/packages/rag/src/protocol-rag-search.ts`: `page`, `pageSize`, `hasMore`, `total` в `RagSearchProtocolResult`. **ISSUE 5 залежить від цього кроку.**
3. Переробити `simulations/auto-ai/` кроки 3-15: `context.files`, стислі `system` в history, `scratchpad_ops`
4. Визначити які файли з `context.files` передавати в prompt через transform (не всі одразу)
5. Після фіналізації симуляції — оновити `stepRoutes.js`: фільтрація context повинна передавати `history`, `files`, `scratchpad`
