# ISSUE 3 — Coder: перевірка формату симуляції

**Статус:** потребує аудиту

## Проблема

Симуляція `coder` може мати застарілий формат.

## Спостереження по симуляції

- `coder/1`: `{ task: "..." }` → відповідь з `execute.form.choices` (router) ✓
- `coder/2`: `{ context, result.choice: "coder" }` → відповідь з `context.execution.action="coder"` + `execute.form` ✓
- `coder/3+`: містять `server-transforms-request.json` — потребує перевірки

## Що перевірити

- `ACTION_TO_SCHEMA` в `dialog-request-processor.ts` містить `coder: 'coder'` ✓
- Чи є `prompts/transforms/coder/` директорія з `request.json` і `response.json`
- Чи відповідає формат transforms поточному `runPromptsTransform`

## Потенційний баг (підтверджено в арці 3)

`result.choice = "coder"` не обробляється як dialog step — підтверджено.

`determineRequestType` для `coder/2/request.json`:
- немає `execution.action` → не `dialog`
- немає `form_submission`/`selected_choice` → не `form`
- падає в default `return 'action'`

`ActionRequestProcessor` отримує запит, але `result.choice` ігнорується → `handleTaskRequest` шукає `task` в context, не `result.choice`.

**Конкретний фікс:** в `determineRequestType` додати перевірку:
```typescript
// result.choice → це вибір action з форми роутера
if (result?.choice && llmActions.includes(result.choice as string)) {
    return 'dialog';
}
```
Або в `ActionRequestProcessor` обробляти `result.choice` як ініціалізацію action.

## Дії

1. Перевірити `a2a-server/prompts/transforms/` — чи є папка `coder/`
2. Запустити `node a2a-server/scripts/run-simulation.ts coder` і порівняти output з `response.json`
3. Якщо `determineRequestType` не розпізнає `result.choice` як dialog — додати перевірку: якщо `context.execution.action` вже встановлено в попередній відповіді — роутити в dialog процесор
4. Якщо `prompts/transforms/coder/` немає — створити за зразком `dialog/` як базового
