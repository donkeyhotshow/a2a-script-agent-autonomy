# Вариант 5: Гибридный подход

## Описание варианта

Комбинированный подход, где сервер собирает и подготавливает контекст, внешний AI анализирует и предлагает изменения, а сервер применяет их с валидацией. Это оптимальный баланс между автоматизацией и контролем.

## Роль клиента

Клиент координирует процесс:

1. **Инициирование задачи** — отправка запроса на сервер
2. **Мониторинг прогресса** — отслеживание этапов обработки
3. **Визуализация результатов** — показ найденных проблем и предложений
4. **Подтверждение действий** — одобрение изменений перед применением
5. **Обратная связь** — оценка качества для улучшения системы

### Пример workflow клиента

```
Пользователь: "Нужно исправить N+1 запросы в UserController"
    ↓
Клиент: POST /api/v1/requests с задачей
    ↓
Сервер: Сбор контекста (UserController, модели, связи)
    ↓
Сервер: Передача контекста внешнему AI
    ↓
Внешний AI: Анализ и предложение исправлений
    ↓
Сервер: Валидация предложений
    ↓
Клиент: Получение diff для просмотра
    ↓
Пользователь: Подтверждение
    ↓
Сервер: Применение изменений
```

## Роль сервера

Сервер — оркестратор процесса:

1. **Сбор контекста** — RAG + граф знаний
2. **Формирование промпта** — структурированный запрос для AI
3. **Вызов внешнего AI** — интеграция с Claude/GPT API
4. **Парсинг ответа** — извлечение предложений
5. **Валидация** — проверка синтаксиса и логики
6. **Применение** — безопасное внесение изменений

### Архитектура гибридного подхода

```
┌─────────────────────────────────────────────────────────────────┐
│                         КЛИЕНТ                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   UI     │  │   CLI    │  │   API    │  │  Editor  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        └─────────────┴──────┬──────┴─────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         СЕРВЕР                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Context Layer                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │   RAG   │  │  Graph  │  │ Neurons │  │ Indexer │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Orchestration Layer                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Prompt    │  │   Router    │  │  Validator  │     │   │
│  │  │   Builder   │  │             │  │             │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Action Layer                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Apply     │  │   Rollback  │  │    Git      │     │   │
│  │  │   Changes   │  │             │  │  Integration│     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ВНЕШНИЙ AI                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Claude  │  │   GPT    │  │  Local   │  │  Custom  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Преимущества

| Преимущество | Описание |
|--------------|----------|
| **Лучшее из двух миров** | Автоматизация + контроль |
| **Эффективность** | Сервер делает тяжёлую работу |
| **Гибкость** | Выбор AI провайдера |
| **Безопасность** | Валидация на сервере |
| **Прозрачность** | Видим что и почему меняется |
| **Итеративность** | Можно уточнять результат |

## Недостатки

| Недостаток | Описание |
|------------|----------|
| **Сложность** | Больше компонентов для поддержки |
| **Задержка** | Несколько этапов обработки |
| **Стоимость** | Расходы на LLM API |
| **Точки отказа** | Зависимость от внешнего AI |
| **Синхронизация** | Сложнее отлаживать |

## Что требуется для реализации

### Уже реализовано

- [x] RAG для поиска контекста
- [x] Граф знаний
- [x] Нейроны для анализа
- [x] API протокол
- [x] Асинхронная обработка запросов

### Требуется доработка

- [ ] Интеграция с LLM API
- [ ] Система промптов
- [ ] Роутинг задач (какой AI использовать)
- [ ] Валидация изменений
- [ ] Безопасное применение
- [ ] Система отката

### Компоненты системы

| Компонент | Назначение | Статус |
|-----------|------------|--------|
| Context Collector | Сбор релевантного контекста | ✅ Готов |
| Prompt Builder | Формирование промпта | ⏳ В процессе |
| AI Router | Выбор AI провайдера | ❌ Не начат |
| Response Parser | Парсинг ответа AI | ❌ Не начат |
| Validator | Проверка изменений | ⏳ Частично |
| Change Applier | Применение изменений | ❌ Не начат |
| Rollback Manager | Откат изменений | ❌ Не начат |

## Пример использования

### API запрос

```bash
POST /api/v1/requests
{
  "project_path": "/path/to/project",
  "task": {
    "type": "fix",
    "description": "Fix N+1 queries in UserController",
    "scope": ["app/Http/Controllers/UserController.php"],
    "constraints": {
      "preserve_api": true,
      "add_comments": true
    }
  },
  "options": {
    "ai_provider": "claude",
    "model": "claude-3-sonnet",
    "max_tokens": 4000,
    "require_confirmation": true
  }
}
```

### Промпт для AI

```markdown
## Task
Fix N+1 queries in the UserController.

## Context
### UserController.php
```php
class UserController extends Controller
{
    public function index()
    {
        $users = User::all();
        return view('users.index', compact('users'));
    }
}
```

### User.php (Model)
```php
class User extends Model
{
    public function posts() { return $this->hasMany(Post::class); }
    public function comments() { return $this->hasMany(Comment::class); }
}
```

### Related View (users/index.blade.php)
```blade
@foreach($users as $user)
    <li>{{ $user->name }} - {{ $user->posts->count() }} posts</li>
@endforeach
```

## Detected Issues
- N+1 query: `$user->posts->count()` in view loop
- Missing eager loading in controller

## Requirements
1. Add eager loading for posts relationship
2. Preserve existing API
3. Add comments explaining the fix

## Output Format
Provide the changes as a unified diff.
```

### API ответ

```json
{
  "status": "completed",
  "request_id": "req_abc123",
  "stages": [
    {"stage": "context_collection", "duration_ms": 150},
    {"stage": "ai_analysis", "duration_ms": 3200},
    {"stage": "validation", "duration_ms": 50}
  ],
  "changes": [
    {
      "file": "app/Http/Controllers/UserController.php",
      "action": "modify",
      "diff": "@@ -5,7 +5,9 @@ class UserController extends Controller\n     public function index()\n     {\n-        $users = User::all();\n+        // Eager load posts to prevent N+1 queries\n+        $users = User::with('posts')->get();\n         return view('users.index', compact('users'));\n     }",
      "validation": {
        "syntax": "valid",
        "style": "passed",
        "tests": "not_run"
      }
    }
  ],
  "ai_usage": {
    "provider": "claude",
    "model": "claude-3-sonnet",
    "tokens_in": 850,
    "tokens_out": 120,
    "cost_usd": 0.012
  },
  "requires_confirmation": true
}
```

### Подтверждение и применение

```bash
# Подтвердить изменения
POST /api/v1/requests/req_abc123/confirm
{
  "confirmed": true,
  "create_git_commit": true,
  "commit_message": "fix: add eager loading for posts in UserController"
}

# Ответ
{
  "status": "applied",
  "files_modified": ["app/Http/Controllers/UserController.php"],
  "git_commit": "abc123def",
  "rollback_available": true
}
```

### CLI

```bash
# Полный цикл
npm run fix "N+1 queries in UserController"

# С выбором AI
npm run fix "..." --ai claude

# Автоматическое применение (без подтверждения)
npm run fix "..." --auto-apply

# С откатом при ошибках тестов
npm run fix "..." --rollback-on-failure
```

## Роутинг задач

Система выбирает оптимальный AI для задачи:

```typescript
const AI_ROUTER = {
  // Правила выбора AI
  rules: [
    {
      condition: (task) => task.type === 'refactor' && task.lines > 500,
      ai: 'claude',
      reason: 'Large refactoring needs Claude\'s context window'
    },
    {
      condition: (task) => task.type === 'fix' && task.complexity === 'low',
      ai: 'local',
      reason: 'Simple fixes can use local model'
    },
    {
      condition: (task) => task.security_related,
      ai: 'gpt4',
      reason: 'Security changes need careful analysis'
    }
  ],
  
  // Fallback
  default: 'claude'
};
```

## Метрики успеха

1. **Точность исправлений** — процент работающих изменений
2. **Время цикла** — от запроса до применения
3. **Стоимость** — расходы на AI API
4. **Принятие изменений** — процент подтверждённых изменений
5. **Откаты** — процент откаченных изменений
6. **Удовлетворённость** — оценка пользователями

## Сравнение с другими вариантами

| Критерий | Контекст | Анализ | Граф | Генерация | **Гибрид** |
|----------|----------|--------|------|-----------|------------|
| Автоматизация | ❌ | ⚠️ | ❌ | ✅ | ✅ |
| Контроль | ✅ | ✅ | ✅ | ❌ | ✅ |
| Качество | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |
| Скорость | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Стоимость | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| Сложность | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |

**Гибридный подход** — оптимальный выбор для production-использования, когда важен баланс между автоматизацией и контролем качества.
