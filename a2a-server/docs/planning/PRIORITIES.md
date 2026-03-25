# Пріоритети виконання

*Оновлено: 2026-03-06 (context optimization завершено)*

| Пріоритет | Issue | Задача | Блокує | Складність | Статус |
|-----------|-------|--------|--------|------------|--------|
| ✅ | [06](issues/06-context-optimization.md) | Context оптимізація — 9 нових ops, switch по step | 05, 08 | Medium | **Done** |
| 🔴 1 | [02](issues/02-dialog-history.md) | Фікс dialog history | 03, 08, 09 | Low | Open |
| 🟡 2 | [01](issues/01-router.md) | Перевірка роутера / action registry | 03, 07 | Low | Open |
| 🟡 3 | [03](issues/03-coder-audit.md) | Аудит coder симуляції (логіка роутингу) | 08 | Medium | Open |
| 🟡 4 | [07](issues/07-simulations-golden-standard.md) | fix-vue-imports: перевірка актуальності | — | Low | Open |
| 🟢 5 | [04](issues/04-simulations-audit.md) | Аудит симуляцій — формат і fixtures | — | Medium | Open |
| 🟢 6 | [09](issues/09-auto-ai.md) | Auto-AI: переробка симуляції → визначає стратегію context | 05, 08 | High | Open |
| 🟢 7 | [08](issues/08-agent-mode.md) | Agent mode: system role + client execute + Web UI | — | High | Open |
| 🟢 8 | [05](issues/05-coder-smart.md) | Coder-smart v2 симуляція | — | High | Open |
| 🟢 9 | — | stepRoutes.js: передавати `history`, `files`, `scratchpad` через `previousContext` | — | Low | After 08 |

## Залежності (граф)

```
02 (dialog fix) → 03, 08, 09  [НЕ блокує 01, 04, 07 — різні процесори]
01 (router) → 03, 07
03 (coder audit: роутинг) → 08
04 (sim audit: формат/fixtures) → незалежно  [НЕ перекривається з 03]
09 (auto-ai симуляція) → визначає стратегію для 06, 05, 08
06 (context: код) → залежить від 09 (стратегія), блокує 05 і 08 (auto-cycle)
08 (agent mode / auto-cycle) → виконувати ПІСЛЯ 06 (обидва змінюють stepRoutes.js)
05 (coder-smart) → залежить від 06, 09
08 (agent mode) → залежить від 03, 09
```

## Ключові рішення зафіксовані

- Робочий стан у `context.workbench` (+ `scratchpad` / `files` за потреби), не в застарілих окремих полях під документи
- Tool use = ті самі `execute.<action>`, не новий тип
- ISSUE 4 не охоплює auto-ai і coder-smart (вони в окремих issues)
- ISSUE 4 не перекривається з ISSUE 3: ISSUE 3 = логіка роутингу, ISSUE 4 = формат файлів і fixtures
- ISSUE 7 перейменовано — це конкретна перевірка fix-vue-imports, не абстрактний принцип
- ISSUE 9 (симуляція) → ISSUE 6 (код), не навпаки: стратегія визначається в симуляції, потім реалізується
- ISSUE 6 і авто-цикл Issue 8 обидва змінюють `stepRoutes.js` — виконувати послідовно, не паралельно
- RAG пагінація: реалізується в ISSUE 9 (код в `protocol-rag-search.ts`), ISSUE 5 залежить від цього
