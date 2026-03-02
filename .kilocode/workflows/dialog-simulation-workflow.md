# Dialog Simulation — workflow

Посилання на канон: `simulations/SCHEMA.md` та `simulations/dialog/description.md`. Dialog — **ai-action**: кроки не захардкоджені; наступний крок з відповіді LLM, можливі окремі запити на крок.

## Файли кроку

| Файл | Напрямок | Опис |
|------|----------|------|
| `request.json` | Client → Server | Запит клієнта (task, context, result) |
| `request.md` | Server → LLM | **MARKDOWN**: system prompt + формат відповіді + блок поточного стану (JSON) |
| `response.md` | LLM → Server | Очікуваний вивід LLM (напр. `{ "message": "..." }`) |
| `response.json` | Server → Client | context + history + execute.form |

## Важливо

- **request.md — не** JSON з `model`/`messages`. Це MARKDOWN з system prompt і поточним станом у код-блоці.
- Клієнт надсилає повідомлення в `result.message` (кроки з діалогом).
- Вибір дії — у `result.action`.

Детальний опис кроків і форматів: `.kilocode/workflows/SIMULATION-WORKFLOW.md`.
