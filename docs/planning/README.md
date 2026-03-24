# Planning

Робочі документи по плануванню розробки. Щоб не відходити від поточної архітектури та стандартизованих `execute`/`result` форматів, тут дотримуємося правил, описаних у [`AGENTS.md`](../AGENTS.md): action-type ключі, transform pipeline та прив’язки context. Перед будь-яким оновленням планів оновіть AGENTS.md або вказуйте, який розділ там змінюється.

## Структура

- [WORKFLOW.md](WORKFLOW.md) — процес роботи над планом через агента (reasoning workflow)
- [PRIORITIES.md](PRIORITIES.md) — таблиця пріоритетів виконання
- [issues/](issues/) — окремий файл на кожен issue

## Issues

| # | Файл | Назва | Статус |
|---|------|-------|--------|
| 1 | [01-router.md](issues/01-router.md) | Роутер: перевірка реальних даних | потребує перевірки |
| 2 | [02-dialog-history.md](issues/02-dialog-history.md) | Dialog: зламаний context.history | КРИТИЧНО |
| 3 | [03-coder-audit.md](issues/03-coder-audit.md) | Coder: перевірка формату симуляції | потребує аудиту |
| 4 | [04-simulations-audit.md](issues/04-simulations-audit.md) | Тотальний аудит симуляцій | заплановано |
| 5 | [05-coder-smart.md](issues/05-coder-smart.md) | Coder Smart: переробка концепту | потребує переробки |
| 6 | [06-context-optimization.md](issues/06-context-optimization.md) | Оптимізація context між запитами | стратегія визначена |
| 7 | [07-simulations-golden-standard.md](issues/07-simulations-golden-standard.md) | Симуляції як golden standard | постійна задача |
| 8 | [08-agent-mode.md](issues/08-agent-mode.md) | Agent mode: system role і tool use | заплановано |
| 9 | [09-auto-ai.md](issues/09-auto-ai.md) | Auto-AI: переробка симуляції | потребує переробки |
