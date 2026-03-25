# Analyze Architecture Simulation

## Pipeline логіка

### Кроки з LLM (3, 4, 6, 7)
```
request.json → server-transforms-request.json → request.md → LLM → response.md → server-transforms-response.json → response.json
```

### Кроки без LLM (1, 2, 5, 8)
```
request.json → server-transforms-request.json → response.json
```
- Сервер трансформує запит у execute
- `server-transforms-response.json` НЕ потрібен — сервер сам формує відповідь без LLM

## Опис

Симуляція діалогу з AI для аналізу архітектури проекту. AI:

- Постійно шукає документи по архітектурі (RAG)
- Підтверджує факти з документації або з коду
- Виписує розбіжності (де код не відповідає опису, застарілі документи)
- Може записати звіт (write-file)

Структура як у **coder**: один екшен з діалогом, RAG, read-file, write-file.

## Потік

| Крок | Client (Web→Client)                         | Server Response (Server→Client)                                             | Received (Client→Web)  |
|------|---------------------------------------------|-----------------------------------------------------------------------------|------------------------|
| 1    | task: "проаналізуй архітектуру проекту"     | execute.form з вибором дій                                                  | execute.form           |
| 2    | result.choice: "agent"                      | execute.form (message)                                                      | execute.form           |
| 3    | result.message: "опиши архітектуру бекенду" | LLM → rag-search (арх. документи)                                           | execute.rag-search     |
| 4    | result["rag-search"]                        | LLM → підтверджені факти + розбіжності, form (продовжити пошук \| зберегти) | execute.form + message |
| 5    | result.choice: "continue_search"            | execute.rag-search (другий пошук)                                           | execute.rag-search     |
| 6    | result["rag-search"] (другі результати)     | LLM → оновлені факти + розбіжності, form знову                              | execute.form + message |
| 7    | result.choice: "save_report"                | LLM → write-file в .carrier/reports/                                        | execute.write-file     |
| 8    | result["write-file"] success                | completed + form                                                            | result.completed       |

## Дії

- **rag-search** — пошук документів по архітектурі (ARCHITECTURE.md, docs/, ADR, тощо)
- **read-file** — читання знайденого файлу
- **continue** — продовжити діалог (підсумок фактів/розбіжностей)
- **write-file** — запис звіту
- **completed** — завершити

## Структура файлів

```
simulations/agent-analyze/
├── description.md
├── analysis.md
├── 1/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 2/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 3/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 4/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 5/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 6/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 7/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
└── 8/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json

