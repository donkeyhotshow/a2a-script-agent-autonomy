# Протокол A2A — JSON API

**Индекс:** [docs/README.md](README.md)

**Документация протокола:** [docs/protocol/README.md](protocol/README.md)

---

## Формат: JSON REST API

**Base URL:** `http://localhost:3000/api/v1`

**Auth:** `Bearer a2a_dev_password`

---

## Структура запроса

```json
POST /api/v1/requests
{
  "context": {
    "new_task": ["Текст задачи"]
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "composer.json", "content": "..." }
  ]
}
```

---

## Структура ответа

```json
{
  "success": true,
  "data": {
    "promiseId": "clx123abc",
    "status": "pending"
  }
}
```

### Polling результата:

```
GET /api/v1/requests/:promiseId/result
```

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "outcome": "graph_incomplete",
    
    "context": {
      "new_task": ["Текст задачи"],
      "graph": { "entities": [], "relations": [] },
      "questions": ["Какая модель хранит пользователей?"],
      "request_files": ["app/Models/User.php"],
      "frameworks": {
        "laravel": "11.x",
        "vue": "3.5.x"
      }
    }
  }
}
```

---

## Жизненный цикл

```
1. Клиент: POST /requests
   → context: { new_task: [...] }
   → codeBlocks: [package.json, composer.json]
   
2. Сервер: Определяет фреймворки
   → Активирует нейроны
   → Генерирует questions
   → Возвращает outcome: "graph_incomplete"
   → context содержит new_task!

3. Клиент: RAG-поиск по questions
   → Читает найденные файлы

4. Клиент: POST /requests
   → context: { new_task: [...], graph: {...} }
   → codeBlocks: [найденные файлы]

5. Сервер: Распознаёт сущности
   → Обновляет граф
   → Возвращает outcome: "completed" или новые questions
   → context ВСЕГДА содержит new_task!

6. Повторять пока outcome: "completed"
```

**Важно:** `new_task` циркулирует в context на всех итерациях!

---

## Документы протокола

| Документ | Описание |
|----------|----------|
| [protocol/overview.md](protocol/overview.md) | Обзор протокола |
| [protocol/context.md](protocol/context.md) | Структура context |
| [protocol/codeblocks.md](protocol/codeblocks.md) | Структура codeBlocks |
| [protocol/first-request.md](protocol/first-request.md) | Первый запрос |
| [protocol/flow.md](protocol/flow.md) | Жизненный цикл |

---

## Коды outcome

| Значение | Описание |
|----------|----------|
| `completed` | Задача завершена |
| `graph_incomplete` | Нужно больше файлов |
| `failed` | Ошибка обработки |
