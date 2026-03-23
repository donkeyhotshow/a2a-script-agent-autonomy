# Пріоритети виконання

*Оновлено: 2026-01-27*

| # | Issue | Задача | Блокує | Складність |
|---|-------|--------|--------|------------|
| 1 | [02](issues/02-dialog-history.md) | Фікс dialog history (ctx['context'] баг) | все | Low |
| 2 | [01](issues/01-router.md) | Перевірка роутера / action registry | coder, coder-smart | Low |
| 3 | [03](issues/03-coder-audit.md) | Аудит coder симуляції | coder покриття | Medium |
| 4 | [04](issues/04-simulations-audit.md) | Аудит всіх симуляцій | — | High |
| 5 | [05](issues/05-coder-smart.md) | Coder-smart переробка симуляції (v2) | — | High |
| 6 | [06](issues/06-context-optimization.md) | Context оптимізація | 5, 9 | Medium |
| 7 | [08](issues/08-agent-mode.md) | Agent mode: system role + tool use + client | coder, coder-smart | High |
| 8 | [09](issues/09-auto-ai.md) | Auto-AI: оновити симуляцію + context strategy | 5, 6, 8 | High |

**Починати з ISSUE 2** — критичний баг який ламає весь dialog flow.
