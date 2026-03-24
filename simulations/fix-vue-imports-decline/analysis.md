# Simulation: fix-vue-imports-decline

## Відмінності від fix-vue-imports

| Крок | Зміна                                                                                                  |
|------|--------------------------------------------------------------------------------------------------------|
| 4    | У `execute.form.choices` додано `fix-vue-imports-decline-router`                                       |
| 5    | Відповідь — знову повний router `execute.form`, `context.execution`: task/router, carryover-поля       |
| 6    | Запит: верхній рівень `task` + повний `context` з кроку 5; відповідь — router, `context.task` оновлено |

## Choice IDs

- `fix-vue-imports-decline-router` — вийти з fix-vue-imports у глобальний роутер без handoff у Coder.

Трансформи: `fix-vue-imports-decline-{1..6}-request.json`.
