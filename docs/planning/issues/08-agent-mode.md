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

Схема: `execute.tool-call` → клієнт виконує → `result.tool-result`

**Рішення:**
- Server-side tools для file operations (не потребують клієнта)
- Client-side tools тільки для того що сервер не може зробити (browser, UI interaction)
- Web UI: мінімальна панель для відображення agent steps

## Дії

1. Додати `system` в coder transforms і перевірити на симуляції
2. Визначити які execute команди клієнт повинен обробляти автоматично (без user input)
3. Спроектувати tool use схему в симуляції перед реалізацією
4. Web UI: мінімальне відображення agent steps (не блокує основний flow)
