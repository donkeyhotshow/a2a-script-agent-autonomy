# Analyze Architecture Simulation

## Опис

Симуляція діалогу з AI для аналізу архітектури проекту. AI:
- Постійно шукає документи по архітектурі (RAG)
- Підтверджує факти з документації або з коду
- Виписує розбіжності (де код не відповідає опису, застарілі документи)
- Може записати звіт (write-file)

Структура як у **coder-dialog**: один екшен з діалогом, RAG, read-file, write-file.

## Потік

| Крок | Request | Response |
|------|---------|----------|
| 1 | task: "проаналізуй архітектуру проекту" | actions [analyze-architecture] |
| 2 | result.action: "analyze-architecture" | execute.form (message) |
| 3 | result.message: "опиши архітектуру бекенду" | LLM → rag-search (арх. документи) |
| 4 | result + ragResults | LLM → підтверджені факти + розбіжності, form (продовжити пошук \| зберегти) |
| 5 | result.choice: "continue_search", result.message | execute.rag-search (другий пошук) |
| 6 | result["rag-search"] (другі результати) | LLM → оновлені факти + розбіжності, form знову |
| 7 | result.choice: "save_report", result.path | LLM → write-file в .carrier/reports/ |
| 8 | result["write-file"] success | completed + form |

## Дії

- **rag-search** — пошук документів по архітектурі (ARCHITECTURE.md, docs/, ADR, тощо)
- **read-file** — читання знайденого файлу
- **continue** — продовжити діалог (підсумок фактів/розбіжностей)
- **write-file** — запис звіту
- **completed** — завершити

## Структура файлів

```
simulations/analyze-dialog/
├── description.md
├── 1/ request.json, response.json
├── 2/ request.json, response.json
├── 3/ request.json, request.md, response.md, response.json
├── 4/ request.json, request.md, response.md, response.json
├── 5/ request.json, response.json
├── 6/ request.json, request.md, response.md, response.json
├── 7/ request.json, request.md, response.md, response.json
└── 8/ request.json, response.json
```
