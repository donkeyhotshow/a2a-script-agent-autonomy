# Пріоритети виконання

*Оновлено: 2026-01-27 (раунд 2, арка 2)*

| Пріоритет | Issue | Задача | Блокує | Складність |
|-----------|-------|--------|--------|------------|
| 🔴 1 | [02](issues/02-dialog-history.md) | Фікс dialog history | 03, 08, 09 | Low |
| 🟡 2 | [01](issues/01-router.md) | Перевірка роутера / action registry | 03, 07 | Low |
| 🟡 3 | [03](issues/03-coder-audit.md) | Аудит coder симуляції (логіка роутингу) | 08 | Medium |
| 🟡 4 | [07](issues/07-simulations-golden-standard.md) | fix-vue-imports: перевірка актуальності | — | Low |
| 🟢 5 | [04](issues/04-simulations-audit.md) | Аудит симуляцій — формат і fixtures (dialog, fix-vue-imports) | — | Medium |
| 🟢 6 | [09](issues/09-auto-ai.md) | Auto-AI: переробка симуляції → визначає стратегію context | 06, 05, 08 | High |
| 🟢 7 | [06](issues/06-context-optimization.md) | Context оптимізація — код (scratchpad + files) | 05, 08b | Medium |
| 🟢 8 | [08](issues/08-agent-mode.md) | Agent mode: system role + client execute + Web UI | — | High |
| 🟢 9 | [05](issues/05-coder-smart.md) | Coder-smart v2 симуляція | — | High |

## Залежності (граф)

```
02 (dialog fix) → 03, 08, 09  [НЕ блокує 01, 04, 07 — різні процесори]
01 (router) → 03, 07
03 (coder audit: роутинг) → 08
04 (sim audit: формат/fixtures) → незалежно  [НЕ перекривається з 03]
09 (auto-ai симуляція) → визначає стратегію для 06, 05, 08
06 (context: код) → залежить від 09 (стратегія), блокує 05 і 08b
08b (stepRoutes автоцикл) → виконувати ПІСЛЯ 06 (обидва змінюють stepRoutes.js)
05 (coder-smart) → залежить від 06, 09
08 (agent mode) → залежить від 03, 09
```

## Ключові рішення зафіксовані

- `docVirtual` замінено на `context.scratchpad` + `context.files`
- Tool use = ті самі `execute.<action>`, не новий тип
- ISSUE 4 не охоплює auto-ai і coder-smart (вони в окремих issues)
- ISSUE 4 не перекривається з ISSUE 3: ISSUE 3 = логіка роутингу, ISSUE 4 = формат файлів і fixtures
- ISSUE 7 перейменовано — це конкретна перевірка fix-vue-imports, не абстрактний принцип
- ISSUE 9 (симуляція) → ISSUE 6 (код), не навпаки: стратегія визначається в симуляції, потім реалізується
- ISSUE 6 і ISSUE 8b обидва змінюють `stepRoutes.js` — виконувати послідовно, не паралельно
- RAG пагінація: реалізується в ISSUE 9 (код в `protocol-rag-search.ts`), ISSUE 5 залежить від цього
