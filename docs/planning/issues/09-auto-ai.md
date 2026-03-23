# ISSUE 9 — Auto-AI: переробка симуляції під нову стратегію контексту

**Статус:** потребує переробки симуляції разом з ISSUE 5+6+8

## Симуляція

`simulations/auto-ai/` — 16 кроків, повний агентний цикл (rag-search, list-directory, read-file ×3, write-file ×4, grep-search, execute-command ×2, completed).

## Рішення

Реалізувати разом з ISSUE 5+6+8 — всі вирішують одну проблему передачі великих результатів між кроками. Auto-ai стає reference симуляцією для нової стратегії контексту.

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
    { "role": "assistant", "message": "Writing health route.", "action": "write-file" }
  ]
}
```

## LLM команди для scratchpad (мінімум вихідних токенів)

```json
"scratchpad_ops": [
  { "op": "check", "item": "read_app_js" },
  { "op": "add", "item": "health_route_written" }
]
```

## RAG — відкрите питання

Невідомий рівень готовності і гнучкості RAG системи. Перед переробкою симуляції потрібен аудит:
- Які параметри підтримує (фільтри, re-ranking, кількість результатів)
- Чи підтримує пагінацію
- Як LLM може краще формулювати queries для повного покриття задачі

## Дії

1. Аудит RAG системи — визначити можливості і обмеження
2. Переробити `simulations/auto-ai/` кроки 3-15: `context.files`, стислі `system` в history, `scratchpad_ops`
3. Додати нову transform операцію `apply-scratchpad-ops` в схему
4. Визначити які файли передавати в prompt через transform (не всі з `context.files` одразу)
5. Реалізувати після фіналізації симуляції (ISSUE 7)
