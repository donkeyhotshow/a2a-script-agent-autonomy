# ISSUE 3 — Coder: валідація routing/result.choice

**Статус:** потребує аудиту та уточнення форматів

## Проблема

Симуляція `coder` спирається на те, що вибір з форми роутера (`result.choice`) лягає в `dialog` pipeline. Якщо `determineRequestType` або `ActionRequestProcessor` ігнорують `result.choice`, то запит пропускається в `action` поток і симуляція не може пройти до `coder` transforms (технічно крок 2). Без цього `context.execution.action` ніколи не стає `coder`, і `runPromptsTransform` для `coder` не викликається.

## Що перевірити

- `request-processor.service.ts` (`determineRequestType`, рядки ~30-80) — треба включити перевірку: якщо `result.choice` є і входить до `llmActions`, то типовий `dialog` шлях повинен зберігатися.
- `ACTION_TO_SCHEMA` у `dialog-request-processor.ts` — `coder` має відповідну схему (рядки ~90-110). Якщо `result.choice` не прокситься до `ctx.execution.action`, `determineRequestType` нічого не бачить.
- `simulations/coder/2/request.json` → `result.choice` має бути тією ж строкою, що `coder` action; `server-response.json` повинне містити `context.execution.action = "coder"`.
- `prompts/transforms/coder/` — файли `request.json` / `response.json` повинні відповідати поточній `runPromptsTransform` (використовувати `context.execution`, `result`, `execute` як новий формат).

## Кодова прив'язка

- `a2a-server/src/services/core/request-processor/request-processor.service.ts` — `determineRequestType` фіналізує `RequestType`. Слід додати логіку перед `return 'dialog'`: `if (result?.choice && determine LLM action list includes result.choice)` → повернути `'dialog'`.
- `a2a-server/src/services/core/request-processor/action-request-processor.ts` (рядки ~200-280) — контекст `result.choice` передається як `task`/`message`, але якщо `determineRequestType` вже не бачить `action`, до `dialog` pipeline не потрапляє.
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts` — `ACTION_TO_SCHEMA['coder'] = 'coder'` і `runPromptsTransform` викликає `prompts/transforms/coder/request.json` (суфікс `server-transforms-*`).

## Додаткові кроки

1. Запустити `node a2a-server/scripts/run-simulation.ts coder` і підтвердити, що `response.json` розбивається на `server-transforms-request/response` без `fallback action` (тобто `determineRequestType` повертає `'dialog'`).
2. Додати unit-лог в `determineRequestType`, щоб логування включало `result.choice` і кінцевий `requestType`. Переконатися, що при симуляції `result.choice = "coder"` повертає `'dialog'`.
3. Якщо логіка лишається в `action` потокі, розширити `ActionRequestProcessor.handleTaskRequest` або `handleTaskResult`, щоб при наявності `result.choice` з-переднього кроку створювати `transformSchema = 'coder'` у новому `ctx`.
4. Перевірити `runPromptsTransform` (`prompts/transforms/coder/*`) — чи відповідає новому `context.execution`/`result` формату; якщо ні, оновити файли на зразок `dialog/` і переконатися, що `response.json` містить `execute.form`.
