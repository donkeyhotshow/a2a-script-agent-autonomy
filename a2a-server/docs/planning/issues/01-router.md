# ISSUE 1 — Роутер: перевірка реальних даних

**Статус:** потребує перевірки

## Проблема

Симуляція `fix-vue-imports` колись працювала. Зараз невідомо, чи `ActionRequestProcessor.handleTaskRequest` отримує непорожній реєстр дій і повертає не `ROUTER_CHOICES`, а справжні `execute.form.choices` із `fix-vue-imports`, `coder` або `coder-smart`.

## Що перевірити

- `ActionRequestProcessor.handleTaskRequest` → при `actionsToUse.length === 0` повертає тільки статичний `ROUTER_CHOICES`, тож треба переконатися, що `actionRegistry` наповнений
- `ActionRegistry.loadFromDirectory` викликається із `a2a-server/src/actions/action-service.ts`, тож якщо реєстр порожній — перевірити лог `[ActionRegistry] Loaded … actions`
- `fix-vue-imports`, `coder`, `coder-smart` існують у `action-registry.ts` → підтвердити `getAllActions()`
- Симуляція має `context.execution.step = "router"` та `execute.form.choices`, як у `simulations/dialog/1/response.json`; нові `execute` повинні збігатися

## Кодова прив'язка та статус

- `a2a-server/src/actions/action-service.ts` (рядки ~30-80) — при імпорті `actionService` викликає `loadFromDirectory` і логгування. Якщо `fix-vue-imports` не знайдено, підключення симуляції не ініціюється.
- `a2a-server/src/services/core/request-processor/action-request-processor.ts` (рядки ~214-340) — додає `availableActions` та передає `transformSchema: 'router'`, тому дані для `dialog` трансформів походять саме з цього контексту.
- `a2a-server/src/actions/action-registry.ts` — реєстр зберігає `ActionDefinition`, тому для діагностики достатньо викликати `actionRegistry.getAllActions()` після `loadFromDirectory`.

## Додаткові кроки

1. Запуск симуляції роутера: з кореня репозиторію `npx tsx a2a-server/scripts/run-simulation.ts simulations/dialog/1` (аргумент — **папка кроку** з `request.json`, не ім’я сценарію) і порівняння з файлами в [`simulations/dialog/1/`](../../../../simulations/dialog/1/). У логах має бути `[ActionRequestProcessor] Processing task_request` → `[ActionRequestProcessor] Router transform completed`. Окремо можна прогнати `fix-vue-imports` для регресії Actions.
2. Перевірка логів реєстру: після старту `node a2a-server/src/app.ts` або з `actionService.initialize()` знайти рядок `[ActionRegistry] Loaded X actions` і підтвердити наявність `fix-vue-imports`, `coder`, `coder-smart`.
3. Локальний тест: `node - <<'NODE' ... actionRegistry.loadFromDirectory()` (як описано у попередньому PLAN_REVIEW) — впевнитись, що `getAllActions().map(a => a.id)` містить потрібні action.
4. Якщо реєстр порожній — додати `console.log` після `await this.registry.loadFromDirectory()` у `action-service.ts` та переконатися, що `ActionRequestProcessor` чекає завершення ініціалізації перед викликом `DialogRequestProcessor`.
