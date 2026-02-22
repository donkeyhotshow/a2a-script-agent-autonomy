# Первый запрос сессии

**Назад:** [README.md](README.md)

---

## Обязательные файлы

При инициализации новой сессии клиент отправляет:

| Приоритет | Файл | Зачем |
|-----------|------|-------|
| 1 | `package.json` | Vue, Inertia, Tailwind версии |
| 2 | `composer.json` | Laravel, PHP версии |

---

## Структура запроса

```json
POST /api/v1/requests
{
  "context": {
    "new_task": ["Текст задачи пользователя"]
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

---

## Что извлекает сервер

### Из package.json:

| Поле | Фреймворк | Триггер |
|------|-----------|---------|
| `dependencies.vue` | Vue | `Vue`, `Vue 3` |
| `dependencies.@inertiajs/vue3` | Inertia | `Inertia` |
| `devDependencies.tailwindcss` | Tailwind | `Tailwind` |
| `devDependencies.vitest` | Vitest | `Vitest` |
| `devDependencies.playwright` | Playwright | `Playwright` |

### Из composer.json:

| Поле | Фреймворк | Триггер |
|------|-----------|---------|
| `require.laravel/framework` | Laravel | `Laravel`, `Laravel 11` |
| `require.php` | PHP | `PHP` |

---

## Ответ сервера

```json
{
  "outcome": "graph_incomplete",
  "context": {
    "new_task": ["Текст задачи пользователя"],
    "graph": {
      "entities": [],
      "relations": []
    },
    "frameworks": {
      "laravel": "11.x",
      "vue": "3.5.x",
      "tailwind": "3.4.x"
    },
    "questions": [
      "Какая модель хранит пользователей?",
      "Какой контроллер обрабатывает регистрацию?"
    ],
    "request_files": ["app/Models/User.php"]
  }
}
```

**Важно:** `new_task` возвращается в context!

---

## Активация нейронов

На основе извлечённых фреймворков сервер активирует нейроны:

```javascript
// Триггеры от фреймворков
const triggers = ['Laravel', 'Vue', 'Inertia', 'Tailwind'];

// Активированные нейроны
const activated = [
  'detect-n1-queries',      // Laravel + Eloquent
  'detect-missing-lazy-loading',
  'detect-prop-drilling',   // Vue
  'detect-tailwind-classes'
];
```

---

## Далее

- [flow.md](flow.md) — жизненный цикл сессии
- [context.md](context.md) — структура context
