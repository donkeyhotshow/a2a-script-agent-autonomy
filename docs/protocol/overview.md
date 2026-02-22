# Обзор протокола

**Назад:** [README.md](README.md)

---

## Формат

**JSON REST API**

- Base URL: `http://localhost:3000/api/v1`
- Auth: `Bearer a2a_dev_password`

---

## Ключевые принципы

### 1. Сервер НЕ хранит состояние

Сервер обрабатывает запросы без сохранения состояния сессии. Все данные передаются в каждом запросе.

### 2. context — поле JSON

`context` — это поле в JSON-запросе, а не markdown-блок. Клиент отправляет context, сервер возвращает обновлённый context.

### 3. new_task ВСЕГДА циркулирует

Задача (`new_task`) передаётся в context на каждой итерации. Сервер возвращает new_task в context, клиент отправляет его обратно.

```
Клиент → context: { new_task, ... } + codeBlocks
Сервер → context: { new_task, graph, questions, request_files }
Клиент → context: { new_task, graph, ... } + codeBlocks
Сервер → context: { new_task, graph, ... }
...пока outcome: "completed"
```

### 4. Итеративный обмен

```
Клиент → context + codeBlocks
Сервер → context + request_files + questions
Клиент → context + codeBlocks (запрошенные файлы)
Сервер → context + ...
...пока outcome: "completed"
```

### 5. questions не возвращаются

Если клиент получил `questions` от сервера, то в следующем запросе:
- `context` — из предыдущего ответа сервера (БЕЗ questions)
- `codeBlocks` — запрошенные файлы
- `questions` не отправляются обратно

---

## Структура запроса

```json
{
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { ... },
    "frameworks": { ... }
  },
  "codeBlocks": [ ... ]
}
```

## Структура ответа

```json
{
  "outcome": "graph_incomplete" | "completed" | "failed",
  "context": {
    "new_task": ["Задача пользователя"],
    "graph": { ... },
    "questions": [ ... ],
    "request_files": [ ... ],
    "frameworks": { ... }
  }
}
```

---

## Далее

- [context.md](context.md) — структура поля context
- [codeblocks.md](codeblocks.md) — структура codeBlocks
- [first-request.md](first-request.md) — первый запрос сессии
