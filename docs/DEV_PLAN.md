# DEV PLAN

*Дата: 2026-01-27*

Детальні issues і пріоритети: **[docs/planning/](docs/planning/README.md)**

## Поточний стан системи

- ✅ Dialog — працює end-to-end (але є баг в context.history — ISSUE 2)
- ✅ fix-vue-imports — повинен працювати, потребує перевірки роутера (ISSUE 1)
- ⏳ Coder — частково, потребує аудиту симуляції (ISSUE 3)
- ⏳ Coder-smart — потребує переробки концепту (ISSUE 5)
- ⏳ Auto-AI — симуляція є, потребує переробки під нову стратегію контексту (ISSUE 9)

## Пріоритети (коротко)

| Пріоритет | Issue | Задача |
|-----------|-------|--------|
| 🔴 1 | [02](docs/planning/issues/02-dialog-history.md) | Фікс dialog history — КРИТИЧНО |
| 🟡 2 | [01](docs/planning/issues/01-router.md) | Перевірка роутера |
| 🟡 3 | [03](docs/planning/issues/03-coder-audit.md) | Аудит coder симуляції |
| 🟢 4 | [04](docs/planning/issues/04-simulations-audit.md) | Аудит всіх симуляцій |
| 🟢 5 | [05](docs/planning/issues/05-coder-smart.md) | Coder-smart v2 |
| 🟢 6 | [06](docs/planning/issues/06-context-optimization.md) | Context оптимізація |
| 🟢 7 | [08](docs/planning/issues/08-agent-mode.md) | Agent mode |
| 🟢 8 | [09](docs/planning/issues/09-auto-ai.md) | Auto-AI переробка |

Повна таблиця з блокуваннями і складністю: [docs/planning/PRIORITIES.md](docs/planning/PRIORITIES.md)
