# ISSUE 8 — Agent mode: system role і tool use

**Статус:** заплановано

## Проблема

Dialog реалізований, але для повноцінного агентного режиму (coder, coder-smart) не вистачає:
1. `system` повідомлення не передається в LLM для coder — тільки user/assistant history
2. `a2a-client` і Web UI не адаптовані до повного agent mode: немає відображення tool calls, немає обробки проміжних `execute` команд крім `form`
3. Dialog не використовує tools (function calling)

## 8a. System role для coder

Coder потребує system prompt з інструкціями (роль, обмеження, формат відповіді).
Зараз system не передається → LLM не знає контексту агента.
- Додати `system` поле в transform schema для coder
- Передавати через `buildMessages([{role:"system", content}, ...history])`

## 8b. a2a-client і Web UI — agent mode

Поточний стан: клієнт обробляє `execute.form` і `execute.script`.
Не обробляється:
- `execute.rag-search` — клієнт повинен виконати пошук і повернути результати
- `execute.write-file` — запис файлу
- Проміжні кроки агента без user interaction (автоматичний цикл)

Web UI не показує tool calls і проміжні відповіді агента.

## 8c. Tool use (function calling)

Dialog зараз: user → LLM → assistant text → відповідь.
Потрібно: LLM викликає tool → сервер виконує → результат повертається в LLM → фінальна відповідь.

**Важливо:** tool use не вводить новий тип `execute`. Tools = ті самі команди які вже є: `execute.read-file`, `execute.write-file`, `execute.rag-search`. Різниця тільки в тому хто виконує — сервер або клієнт.

**Рішення:**
- RAG залишається client-side назавжди — `a2a-server/src/services/rag/` порожня, server-side RAG неможливий без окремої реалізації
- Server-side: `read-file`, `write-file`, `grep-search`, `list-directory` — сервер виконує сам (потребує реалізації)
- Client-side: `rag-search`, `execute-command` — клієнт виконує і повертає результат
- Схема не змінюється — той самий `execute.<action>` / `result.<action>`

## Дії

1. Додати `system` в `prompts/transforms/coder/request.json` і перевірити на симуляції `agent-coder` (ISSUE 3 повинен бути закритий перед)
2. `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` — додати автоматичний цикл після отримання відповіді сервера: якщо `execute["rag-search"]` (ключ з дефісом) — виконати пошук і повернути результат без user input. **Виконувати ПІСЛЯ ISSUE 6** (обидва змінюють `stepRoutes.js`)
3. Tool use схема визначається в `simulations/agent-auto-ai/` (ISSUE 9) — цей issue реалізується після
4. Web UI: мінімальний показ agent steps — не блокує основний flow
