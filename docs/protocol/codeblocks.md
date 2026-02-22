# Структура codeBlocks

**Назад:** [README.md](README.md)

---

## Описание

`codeBlocks` — массив файлов, которые клиент отправляет серверу. Содержит путь и содержимое каждого файла.

---

## Структура

```json
{
  "codeBlocks": [
    {
      "path": "relative/path/to/file.php",
      "content": "full file content here"
    }
  ]
}
```

---

## Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `path` | string | Относительный путь к файлу |
| `content` | string | Полное содержимое файла |

---

## Примеры

### Первый запрос (package.json + composer.json):

```json
{
  "context": {
    "new_task": ["Анализ проекта"]
  },
  "codeBlocks": [
    {
      "path": "package.json",
      "content": "{ \"dependencies\": { \"vue\": \"^3.5.0\" } }"
    },
    {
      "path": "composer.json",
      "content": "{ \"require\": { \"laravel/framework\": \"^11.0\" } }"
    }
  ]
}
```

### Последующий запрос (запрошенные файлы):

```json
{
  "context": {
    "graph": { "entities": [], "relations": [] }
  },
  "codeBlocks": [
    {
      "path": "app/Models/User.php",
      "content": "<?php\n\nnamespace App\\Models;\n\nclass User extends Model\n{\n    ...\n}"
    },
    {
      "path": "app/Http/Controllers/UserController.php",
      "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nclass UserController extends Controller\n{\n    ...\n}"
    }
  ]
}
```

---

## RAG-поиск

Клиент использует RAG для поиска файлов по `questions`:

```javascript
// Получили questions от сервера
const questions = ["Какая модель хранит пользователей?"];

// Ищем через RAG
const results = await rag.searcher.search('User model', { limit: 5 });
// → [{ filePath: 'app/Models/User.php', ... }]

// Читаем файл и отправляем
const content = await fs.readFile('app/Models/User.php', 'utf-8');
```

---

## Далее

- [first-request.md](first-request.md) — первый запрос сессии
- [context.md](context.md) — структура context
