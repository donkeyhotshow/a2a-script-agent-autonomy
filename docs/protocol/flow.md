# Жизненный цикл сессии

**Назад:** [README.md](README.md)

---

## Диаграмма

```
┌──────────────┐                              ┌──────────────┐
│    КЛИЕНТ    │                              │    СЕРВЕР    │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │  context: { new_task }                      │
       │  codeBlocks: [package.json, composer.json] │
       │ ──────────────────────────────────────────►│
       │                                             │
       │                    outcome: "graph_incomplete"
       │                    context: { new_task, graph, questions, request_files }
       │ ◄──────────────────────────────────────────│
       │                                             │
       │  RAG-поиск по questions                     │
       │  Чтение файлов                              │
       │                                             │
       │  context: { new_task, graph }               │
       │  codeBlocks: [найденные файлы]              │
       │ ──────────────────────────────────────────►│
       │                                             │
       │                    outcome: "graph_incomplete" или "completed"
       │                    context: { new_task, graph, ... }
       │ ◄──────────────────────────────────────────│
       │                                             │
       │  ... повторять пока outcome: "completed"    │
       ▼                                             ▼
```

**Важно:** `new_task` циркулирует в context на всех итерациях!

---

## Шаги

### 1. Инициализация

Клиент отправляет задачу + package.json + composer.json:

```json
{
  "context": {
    "new_task": ["Добавить валидацию email"]
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "composer.json", "content": "..." }
  ]
}
```

### 2. Первый ответ сервера

Сервер определяет фреймворки, активирует нейроны, генерирует вопросы:

```json
{
  "outcome": "graph_incomplete",
  "context": {
    "new_task": ["Добавить валидацию email"],
    "graph": { "entities": [], "relations": [] },
    "questions": ["Какая модель хранит пользователей?"],
    "request_files": ["app/Models/User.php"],
    "frameworks": { "laravel": "11.x" }
  }
}
```

### 3. RAG-поиск

Клиент ищет файлы по questions:

```javascript
const results = await rag.searcher.search('User model', { limit: 5 });
// → [{ filePath: 'app/Models/User.php', ... }]
```

### 4. Отправка найденных файлов

```json
{
  "context": {
    "new_task": ["Добавить валидацию email"],
    "graph": { "entities": [], "relations": [] },
    "frameworks": { "laravel": "11.x" }
  },
  "codeBlocks": [
    { "path": "app/Models/User.php", "content": "..." }
  ]
}
```

### 5. Обработка сервером

Сервер:
- Распознаёт сущности (Model, Controller, Service, Vue)
- Обновляет граф
- Активирует нейроны
- Генерирует новые вопросы или завершает

### 6. Завершение

Когда `outcome: "completed"`:

```json
{
  "outcome": "completed",
  "context": {
    "new_task": ["Добавить валидацию email"],
    "graph": {
      "entities": [
        { "id": "model-user", "type": "MODEL", "name": "User", "path": "..." }
      ],
      "relations": []
    },
    "frameworks": { "laravel": "11.x" }
  }
}
```

---

## Коды outcome

| Значение | Описание |
|----------|----------|
| `graph_incomplete` | Нужно больше файлов |
| `completed` | Задача завершена |
| `failed` | Ошибка обработки |

---

## Принципы

- **Сервер НЕ хранит состояние** — context передаётся в каждом запросе
- **new_task ВСЕГДА циркулирует** — задача не теряется между итерациями
- **Клиент отправляет context + codeBlocks** — ничего больше
- **Цикл повторяется** пока сервер не вернёт `outcome: "completed"`

---

## Далее

- [overview.md](overview.md) — обзор протокола
- [first-request.md](first-request.md) — первый запрос
