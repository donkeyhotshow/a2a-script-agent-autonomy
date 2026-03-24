# ISSUE 6 — Оптимізація context між запитами

**Статус:** стратегія визначена, потребує реалізації в симуляціях

## Проблема

При довгих агентних циклах `context.history` і великі `result` (read-file, execute-command) переповнюють контекст → токени і вартість.

## Обрана стратегія: scratchpad commands + working set

### 6a. Context.scratchpad — command-driven checklist

LLM не перезаписує scratchpad повністю — відправляє короткі команди в `context.scratchpad_ops`:
```json
{ "op": "check", "item": "read_app_js" }
{ "op": "add", "item": "health route written" }
{ "op": "remove", "item": "pending: read routes" }
```
Сервер застосовує команди до `context.scratchpad` через transform операцію `apply-scratchpad-ops`.
Мінімум токенів на виході LLM — тільки команди, не перезапис.

### 6b. Context.files — working set

Повний вміст прочитаних файлів зберігається в `context.files[path]`, не в history.
В history тільки стислий `system` запис:
```
result.read-file → history: { role: "system", message: "Read src/app.js (142 lines)" }
```
Transform вирішує які файли включити в prompt (не всі одразу).

### 6c. History — стислі system записи для tool results

Кожен tool result (rag-search, list-directory, execute-command) → один `system` рядок в history.
Повні дані не потрапляють в history — тільки в `context.files` або відкидаються після використання.

## Що НЕ використовуємо

- Sliding window — втрачає ранній контекст
- LLM-компресія history — дорого (вихідні токени)
- LLM-driven notes — збільшує вихідні токени

## Де реалізувати

1. `a2a-server/src/transform/operations.ts` — нова операція `apply-scratchpad-ops`
2. `a2a-server/src/transform/types.ts` — новий тип `ApplyScratchpadOpsOperation`
3. `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` — оновити фільтрацію context (~рядок 230): передавати `history`, `files`, `scratchpad` разом з `task` і `execution`. **Уточнення:** history може проходити через `previousContext` (не фільтрується), але не через `result.context` (фільтрується). Перед фіксом перевірити де сервер кладе history у відповідь (`ProcessResult.context` vs `result.context`).
4. Оновлення `server-transforms-*.json` в симуляціях

**Залежить від:** ISSUE 9 (стратегія визначається в симуляції, потім реалізується тут). ISSUE 6 і ISSUE 8b обидва змінюють `stepRoutes.js` — виконувати послідовно: спочатку ISSUE 6 (фільтрація context), потім ISSUE 8b (автоцикл).
