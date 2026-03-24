# ISSUE 7 — fix-vue-imports: перевірка актуальності

**Статус:** потребує перевірки

**Примітка:** Принцип "simulation = golden standard" зафіксований в WORKFLOW.md і REFERENCE.md. Цей issue — про конкретну перевірку `fix-vue-imports`.

## Проблема

`fix-vue-imports` — єдина робоча actions-based симуляція. Після рефакторингу невідомо чи вона відповідає поточному коду.

## Дії

1. Запустити `node a2a-server/scripts/run-simulation.ts fix-vue-imports`
2. Порівняти output з `response.json` кожного кроку
3. Якщо розходиться — визначити чи оновлюється симуляція або код
4. Залежить від ISSUE 1 (роутер) — виконувати після
