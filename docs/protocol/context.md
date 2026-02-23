# Структура context

**Назад:** [README.md](README.md)

---

## Описание

`context` — поле JSON-запроса, которое **циркулирует** между клиентом и сервером. Сервер возвращает context, клиент передаёт его обратно в следующем запросе.

**Важно:** Все поля context сохраняются между итерациями. Задача (`new_task`) НЕ теряется!

---

## Поля context

| Поле | Тип | Описание |
|------|-----|----------|
| `new_task` | string[] | Задача пользователя. **Циркулирует всегда!** |
| `graph` | object | Граф знаний (entities, relations) |
| `request_files` | string[] | Файлы, которые сервер хочет получить |
| `questions` | string[] | Вопросы сервера |
| `frameworks` | object | Извлечённые фреймворки |

---

## Примеры

### Первый запрос (от клиента):

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

### Ответ сервера:

```json
{
  "outcome": "graph_incomplete",
  "context": {
    "tasks":[
      {
        "title": "Добавить валидацию email",
        "graph": {
      "entities": [],
      "relations": []
    ,},
    "request_files": ["Какая модель хранит пользователей?"],}],
    
    
    "frameworks": {
      "laravel": "11.x",
      "vue": "3.5.x"
    }
  }
}
```

### Следующий запрос (от клиента):

```json
{
  "context": {
    "new_task": ["Добавить валидацию email"],
    "graph": {
      "entities": [],
      "relations": []
    },
    "frameworks": {
      "laravel": "11.x",
      "vue": "3.5.x"
    }
  },
  "codeBlocks": [
    { "path": "app/Models/User.php", "content": "..." }
  ]
}
```

**Клиент не отправляет обратно:**
- `questions` — это только запрос от сервера
- `request_files` — это только запрос от сервера

**Клиент отправляет обратно:**
- `new_task` — **ВСЕГДА!**
- `graph` — если есть
- `frameworks` — если есть

---

## Граф знаний

```json
{
  "graph": {
    "entities": [
      { "id": "model-user", "type": "MODEL", "name": "User", "path": "app/Models/User.php" }
    ],
    "relations": [
      { "from": "model-user", "to": "model-post", "type": "hasMany" }
    ]
  }
}
```

---

## Далее

- [codeblocks.md](codeblocks.md) — структура codeBlocks
- [flow.md](flow.md) — жизненный цикл
