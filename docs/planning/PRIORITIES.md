# Пріоритети виконання

*Оновлено: 2026-01-27 (раунд 2)*

| Пріоритет | Issue | Задача | Блокує | Складність |
|-----------|-------|--------|--------|------------|
| 🔴 1 | [02](issues/02-dialog-history.md) | Фікс dialog history | все | Low |
| 🟡 2 | [01](issues/01-router.md) | Перевірка роутера / action registry | 3, 7 | Low |
| 🟡 3 | [03](issues/03-coder-audit.md) | Аудит coder симуляції | 8 | Medium |
| 🟡 4 | [07](issues/07-simulations-golden-standard.md) | fix-vue-imports: перевірка актуальності | — | Low |
| 🟢 5 | [04](issues/04-simulations-audit.md) | Аудит симуляцій (dialog, coder, fix-vue-imports) | — | Medium |
| 🟢 6 | [09](issues/09-auto-ai.md) | Auto-AI: переробка симуляції (reference для стратегії) | 5, 6, 8 | High |
| 🟢 7 | [06](issues/06-context-optimization.md) | Context оптимізація (scratchpad + files) | 6 | Medium |
| 🟢 8 | [05](issues/05-coder-smart.md) | Coder-smart v2 симуляція | 6, 7 | High |
| 🟢 9 | [08](issues/08-agent-mode.md) | Agent mode: system role + client execute + Web UI | 3, 6 | High |

## Залежності (граф)

```
02 (dialog fix) → все
01 (router) → 03, 07
03 (coder audit) → 08
04 (sim audit) → незалежно
09 (auto-ai) → визначає стратегію для 06, 05, 08
06 (context) → залежить від 09
05 (coder-smart) → залежить від 06, 09
08 (agent mode) → залежить від 03, 09
```

## Ключові рішення зафіксовані

- `docVirtual` замінено на `context.scratchpad` + `context.files`
- Tool use = ті самі `execute.<action>`, не новий тип
- ISSUE 4 не охоплює auto-ai і coder-smart (вони в окремих issues)
- ISSUE 7 перейменовано — це конкретна перевірка fix-vue-imports, не абстрактний принцип
