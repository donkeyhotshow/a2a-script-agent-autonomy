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

## Потенційний баг

`result.choice = "coder"` не обробляється як dialog step — немає `execution.action` в request, тому `determineRequestType` не розпізнає як `dialog`.

## Дії

1. Перевірити `a2a-server/prompts/transforms/` структуру
2. Порівняти `coder/2/response.json` з тим що реально повертає сервер при `result.choice="coder"`
3. Крок `coder/2` — сервер повинен повернути форму, але зараз `determineRequestType` для `result.choice` → йде в `action` процесор, не в `dialog`
