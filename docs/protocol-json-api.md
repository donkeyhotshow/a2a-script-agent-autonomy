# Протокол A2A — JSON API

**Индекс:** [docs/README.md](README.md)

---

## Формат: JSON REST API

Протокол использует JSON для всех запросов и ответов.

---

## Первый запрос сессии (Root Context)

### Что отправляет клиент:

```json
POST /api/v1/requests
{
  "context": {
    "project_path": "C:/workspace/project",
    "session_id": "uuid-here",
    "new_task": ["Implement user registration"]
  },
  "codeBlocks": [
    {
      "path": "package.json",
      "content": "{ \"dependencies\": { \"vue\": \"^3.5.0\", \"inertiajs\": \"^2.2.18\" } }"
    },
    {
      "path": "composer.json",
      "content": "{ \"require\": { \"laravel/framework\": \"^11.0\" } }"
    }
  ]
}
```

### Зачем package.json и composer.json:

| Файл | Что извлекает сервер |
|------|----------------------|
| `package.json` | Vue версия, Inertia, Tailwind, тесты (Vitest, Playwright) |
| `composer.json` | Laravel версия, PHP версия, пакеты |

### Что сервер определяет из них:

```json
{
  "frameworks": {
    "frontend": ["vue@3.5.0", "inertia@2.2.18", "tailwind@3.4.0"],
    "backend": ["laravel@11.0"],
    "testing": ["vitest@4.0.18", "playwright@1.58.1"]
  },
  "libraries": {
    "vue": ["pinia", "vue-router", "@inertiajs/vue3"],
    "php": ["laravel/sanctum", "laravel/tinker"]
  }
}
```

---

## Ответ сервера

### Успешный ответ:

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
    "outcome": "completed",
    
    "context": {
      "project_path": "C:/workspace/project",
      "request_files": ["app/Models/User.php", "app/Http/Controllers/AuthController.php"]
    },
    
    "graph": {
      "entities": [
        { "id": "model-user", "type": "MODEL", "name": "User", "path": "app/Models/User.php" }
      ],
      "relations": []
    },
    
    "activated_neuron_ids": ["neuron-detect-n1-queries"],
    "injected_content": "## Detect N1 Queries...",
    
    "questions": [],
    "missing": []
  }
}
```

---

## Неполный граф (graph_incomplete)

Если серверу нужно больше файлов:

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "outcome": "graph_incomplete",
    
    "graph": {
      "entities": [...],
      "relations": [...]
    },
    
    "questions": [
      "Which controller handles User CRUD operations?",
      "Is there a FormRequest for validation?"
    ],
    
    "missing": [
      "Missing Controller for CRUD operation",
      "Missing Request for form handling"
    ]
  }
}
```

**Важно:** Сервер НЕ указывает какие файлы запрашивать. Клиент сам использует RAG для поиска по questions.

---

## Следующий запрос (итерация)

Клиент отправляет запрошенные файлы:

```json
POST /api/v1/requests
{
  "context": {
    "project_path": "C:/workspace/project",
    "session_id": "uuid-here",
    "graph": {
      "entities": [...],
      "relations": [...]
    }
  },
  "codeBlocks": [
    {
      "path": "app/Http/Controllers/UserController.php",
      "content": "<?php ..."
    },
    {
      "path": "app/Http/Requests/UserRequest.php",
      "content": "<?php ..."
    }
  ]
}
```

---

## Структура context

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `project_path` | Да | Путь к проекту на клиенте |
| `session_id` | Нет | UUID сессии |
| `new_task` | Нет | Массив [текст задачи, подсказки] |
| `graph` | Нет | Граф знаний от предыдущей итерации |
| `request_files` | Нет | Запрошенные файлы (в ответе) |
| `architectural_features` | Нет | Особенности структуры проекта |

---

## Структура codeBlocks

```json
"codeBlocks": [
  {
    "path": "relative/path/to/file.php",
    "content": "full file content here"
  }
]
```

---

## Жизненный цикл сессии

```
1. Клиент: POST /requests
   → package.json + composer.json
   
2. Сервер: Определяет фреймворки
   → Активирует нейроны по триггерам фреймворков
   → Генерирует questions
   → Возвращает graph_incomplete + questions

3. Клиент: Получает questions
   → Использует RAG.search() для поиска файлов
   → Читает найденные файлы

4. Клиент: POST /requests
   → codeBlocks с найденными файлами
   → graph из предыдущего ответа

5. Сервер: Распознаёт сущности
   → Обновляет граф
   → Возвращает completed или новые questions

6. Повторять пока outcome: "completed"
```

### RAG на клиенте

Клиент использует локальный RAG для поиска файлов:

```javascript
// Клиент получает question: "Which model stores users?"
const results = await rag.searcher.search('User model', { limit: 5 });

// RAG возвращает:
// [{ chunk: { filePath: 'app/Models/User.php', type: 'class', name: 'User' }, score: 25.5 }]

// Клиент читает файл и отправляет на сервер
const content = await fs.readFile('app/Models/User.php', 'utf-8');
```

---

## Обязательные файлы на первой итерации

| Приоритет | Файл | Зачем |
|-----------|------|-------|
| 1 | `package.json` | Vue, Inertia, Tailwind версии |
| 2 | `composer.json` | Laravel, PHP версии |
| 3 | `tailwind.config.js` | Tailwind конфигурация |
| 4 | `vite.config.js` | Vite конфигурация |

---

## Пример полного цикла

### Итерация 1: Начало сессии

**Запрос:**
```json
{
  "context": {
    "project_path": "C:/workspace/websitestore",
    "new_task": ["Add email verification to User model"]
  },
  "codeBlocks": [
    { "path": "package.json", "content": "..." },
    { "path": "composer.json", "content": "..." }
  ]
}
```

**Ответ:**
```json
{
  "outcome": "graph_incomplete",
  "frameworks": {
    "frontend": ["vue@3.5.0", "inertia@2.2.18"],
    "backend": ["laravel@11.0"]
  },
  "questions": ["Which model stores users?"],
  "missing": ["No entities recognized"]
}
```

### Итерация 2: Клиент нашёл файл через RAG

**Клиент:**
```javascript
// RAG search по question
const results = await rag.searcher.search('User model', { limit: 5 });
// Нашёл: app/Models/User.php
```

**Запрос:**
```json
{
  "context": {
    "project_path": "C:/workspace/websitestore",
    "graph": { "entities": [], "relations": [] }
  },
  "codeBlocks": [
    { "path": "app/Models/User.php", "content": "<?php ..." }
  ]
}
```

**Ответ:**
```json
{
  "outcome": "completed",
  "graph": {
    "entities": [
      { "id": "model-user", "type": "MODEL", "name": "User", "path": "app/Models/User.php" }
    ],
    "relations": []
  },
  "activated_neuron_ids": ["neuron-detect-missing-validation"],
  "injected_content": "..."
}
```
