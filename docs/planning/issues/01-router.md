# ISSUE 1 — Роутер: перевірка реальних даних

**Статус:** потребує перевірки

## Проблема

Симуляція `fix-vue-imports` колись працювала. Зараз невідомо чи роутер (`action-request-processor.ts`) повертає реальні дані і чи дозволяє вибрати режим.

## Що перевірити

- `ActionRequestProcessor.handleTaskRequest` → шлях `actionsToUse.length === 0` → повертає статичний `ROUTER_CHOICES` (hardcoded)
- Якщо `actionRegistry` порожній — LLM не викликається, повертається fallback
- `fix-vue-imports` як action зареєстрований в реєстрі? → перевірити `action-registry.ts`
- Відповідь роутера: `context.execution.step = "router"` + `execute.form.choices` — відповідає `dialog/1/response.json` ✓

## Дії

1. Перевірити `actionRegistry.getAllActions()` — чи є там `fix-vue-imports`, `coder`, `coder-smart`
2. Якщо немає — зареєструвати або перевірити де реєстрація відбувається
3. Запустити симуляцію `fix-vue-imports/1` і порівняти з `response.json`
