# ISSUE 4 — Тотальний аудит симуляцій

**Статус:** заплановано

## Проблема

В симуляціях є місця де дані були прості, потім стали складними (через LLM transforms), і тепер `server-transforms-response.json` містить операції типу `parse-json-from-md` які важко відтворити без нейронки.

## 4a. Відсутні `server-response.json` в dialog

`simulations/dialog/` не має `server-response.json` на рівні директорії (є тільки в підпапках).
`simulations/coder/server-response.json` є — це "загальний" приклад.

## 4b. `parse-json-from-md` залежить від LLM output

`dialog/3/server-transforms-response.json`:
```json
{ "op": "parse-json-from-md", "fromFile": "response.md" }
```
`response.md` генерується LLM → в тестах потрібен mock або fixture.

## 4c. Невідповідність форматів між старими і новими симуляціями

- Старі: `{ task: "..." }` без `context`
- Нові: `{ context: { execution: { action, step } }, result: {...} }`
- Деякі симуляції мають обидва формати в різних кроках

## Дії

1. Пройтись по всіх симуляціях і скласти таблицю: які кроки мають `server-transforms-*`, які ні
2. Для кроків з `parse-json-from-md` — додати fixture `response.md` в папку кроку
3. Перевірити `sim-validate.ts` — чи він перевіряє наявність fixtures
