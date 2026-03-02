# Coder Dialog - Client Simulation

> **Type: AI-Actions** (LLM-managed workflow)

> Валідація відповідей клієнта для симуляції coder

## Опис

Симуляція показує діалог з AI-асистентом (кодером), який може:
- Вести діалог з користувачем
- Шукати файли в проекті за натуральним запитом (RAG)
- Читати вміст файлів
- Записувати файли (звіт в Markdown)

## Поведінка клієнта

В **AI-Actions** режимі LLM керує послідовністю викликів. Клієнт:
1. Отримує результати виконання інструментів від сервера
2. Надсилає результати LLM для прийняття рішень
3. LLM визначає наступний інструмент для виклику

## Flow

| Крок | Server Response | Client Request |
|------|-----------------|----------------|
| 1 | actions + form (choice) | result.choice |
| 2 | form (message) | result.message |
| 3 | execute.rag-search | result.rag-search |
| 4 | execute.read-file | result.read-file |
| 5 | form (message) | result.message |
| 6 | result.completed + form | input.message |
| 7 | execute.write-file | result (success) |
| 8 | result.completed | - |

## Клієнтські правила

1. **context** - завжди повертається з останньої відповіді сервера
2. **result.choice** - коли сервер прислав form з choices
3. **result.message** - коли сервер прислав form з message
4. **result.rag-search** - коли сервер прислав execute.rag-search
5. **result.read-file** - коли сервер прислав execute.read-file
6. **result.write-file** - коли сервер прислав execute.write-file
7. **input.message** - коли сервер прислав form і потрібно ввести message

## Симуляції

- **fix-vue-imports** - form (choice) → script steps → finalResult
- **dialog** - actions → result.action; form (message) → result.message
- **coder** - form (message) → result.message; execute.rag-search → result.rag-search; execute.read-file → result.read-file; etc.
- **analyze-dialog** - form з choices (continue_search / save_report) → result.choice
