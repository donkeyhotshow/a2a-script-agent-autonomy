# ISSUE 2 — Dialog: збереження history/execute відповіді

**Статус:** КРИТИЧНО — треба впевнитися, що dialog history формуєтсья коректно

## Проблема

Симуляція `dialog` покаже, що повна історія (`context.history`) очевидно накопичується лише в `buildDialogProcessResultFromContext`. Якщо `runResponseTransform` і/або `recoverDialogFromLlmPromise` не передають актуальне `result.message`, то `history` залишатиметься порожнім у наступному запиті. Треба перевірити, що тут нема застарілих гіпотез про `ctx['context']` або дублювання user-рядків.

## Що перевірити

- `buildDialogProcessResultFromContext` (обидва виклики: звичайний `runResponseTransform` + `recoverDialogFromLlmPromise`) — викликом `getExistingDialogHistory(ctx)` використовується `ctx['history']`, а не `ctx['context']`. Тож треба підтвердити, що `ctx.history` потрапляє з попереднього response.
- У `doProcess` (рядки ~130-220) результат нормалізується: `result.message` доповнюється з `ctx.task`/`ctx.message` при потребі. Якщо `result` не передається, `history` не збагачується.
- `recoverDialogFromLlmPromise` (рядки ~270-330) повторює ті самі виклики `runPromptsTransform` → має використовувати однакову `buildDialogProcessResultFromContext`.
- У симуляції `simulations/dialog/3-4`, `server-transforms-request.json` не додає user message вручну — усе робить transform: треба переконатися, що після `runResponseTransform` user/assistant пара зберігається в `context.history`.

## Кодова прив'язка

- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts` — `buildDialogProcessResultFromContext` і `doProcess` формують `context.history` (лінії ~60-120, ~140-220); цим кодом фактично живе dialog flow.
- `runResponseTransform` та `recoverDialogFromLlmPromise` (рядки ~150-220 та ~270-330) пишуть file `response.md` і викликають transform. Якщо `ctx.history` пустий → потрібно поглянути на `responseTransformResult.output.execute`.
- `simulations/dialog/3/response.json`, `simulations/dialog/4/request.json` — golden standard, `/messages.json` у симуляції/клієнті повинні відповідати цим `context.history`.

## Додаткові кроки

1. Запустити `node a2a-server/scripts/run-simulation.ts dialog/3` і `dialog/4`, перевірити, що `server-response.json` містить `context.history` із останнім `user`/`assistant`.
2. У логах `DialogRequestProcessor` повинні бути повідомлення `[DialogRequestProcessor] Processing` → `[DialogRequestProcessor] Response transform completed` (в тому числі під час `recoverDialogFromLlmPromise`). Якщо `history` пустий — подивитися, чи `ctx['result']` було заповнено з `request.message`.
3. Перевірити `received.json` (simulations/dialog/2) та `response.json` (simulations/dialog/3)` — `context.history` має переходити в наступний `request`. Це і є референс.
4. Якщо `history` оновлюється в двох місцях — використовуйте єдину допоміжну функцію `buildDialogProcessResultFromContext` і намагайтесь не додавати `user` вручну з `server-transforms-request.json`.
