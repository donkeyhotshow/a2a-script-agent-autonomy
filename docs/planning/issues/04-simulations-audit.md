# ISSUE 4 — Аудит симуляцій (формат і fixtures)

**Статус:** заплановано

**Scope:** тільки симуляції які НЕ заплановані на переробку. `auto-ai` (ISSUE 9) і `coder-smart` (ISSUE 5) виключені.

## Проблема

`server-transforms-response.json` містить операції типу `parse-json-from-md` які залежать від LLM output — в тестах потрібні fixtures. Також є невідповідність форматів між старими і новими симуляціями.

## 4a. `parse-json-from-md` залежить від LLM output

`dialog/3/server-transforms-response.json`:
```json
{ "op": "parse-json-from-md", "fromFile": "response.md" }
```
`response.md` генерується LLM → в тестах потрібен fixture.

## 4b. Невідповідність форматів

- Старі: `{ task: "..." }` без `context`
- Нові: `{ context: { execution: { action, step } }, result: {...} }`
- Деякі симуляції мають обидва формати в різних кроках

## Симуляції для аудиту

`dialog`, `coder`, `fix-vue-imports` — перевірити формат і наявність fixtures.

## Дії

1. Скласти таблицю: які кроки мають `server-transforms-*`, які ні
2. Для кроків з `parse-json-from-md` — додати fixture `response.md`
3. Перевірити `sim-validate.ts` — чи він перевіряє наявність fixtures
4. Невідповідності формату — виправити під новий стандарт (`context.execution`, `result`)
