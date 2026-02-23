# Вариант 2: Анализ кода на сервере

## Описание варианта

Сервер самостоятельно анализирует кодовую базу, выявляет проблемы и выдаёт рекомендации без привлечения внешних AI-систем. Анализ выполняется с помощью предустановленных правил — **нейронов**, которые детектируют специфические паттерны и проблемы.

## Роль клиента

Клиентская часть выполняет вспомогательные функции:

1. **Отправка проекта на анализ** — передача метаданных и структуры
2. **Получение результатов** — запрос статуса и результатов анализа
3. **Отображение рекомендаций** — визуализация найденных проблем
4. **Управление нейронами** — включение/отключение конкретных анализаторов

### Пример workflow клиента

```
Пользователь: "Проанализировать проект на проблемы"
    ↓
Клиент: Отправка структуры проекта на сервер
    ↓
Сервер: Запуск всех активных нейронов
    ↓
Сервер: Формирование отчёта с рекомендациями
    ↓
Клиент: Отображение результатов с фильтрацией
```

## Роль сервера

Сервер выполняет основную работу:

1. **Получение кода** — через индексацию или загрузку файлов
2. **Применение нейронов** — запуск детекторов проблем
3. **Агрегация результатов** — сбор и группировка находок
4. **Приоритизация** — ранжирование по критичности
5. **Формирование отчёта** — структурированный вывод

### Архитектура нейронов

Нейроны — это специализированные детекторы проблем:

```
a2a-server/src/neurons/
├── detect-n1-queries.neuron.ts        # N+1 запросы
├── detect-god-objects.neuron.ts       # God objects
├── detect-security-v-html.neuron.ts   # XSS уязвимости
├── detect-missing-validation.neuron.ts # Отсутствие валидации
├── detect-unused-routes.neuron.ts     # Неиспользуемые маршруты
└── ... (40+ нейронов)
```

### Пример нейрона

```typescript
// detect-n1-queries.neuron.ts
export default {
  id: 'detect-n1-queries',
  category: 'performance',
  severity: 'warning',
  
  detect(codeContext) {
    // Поиск паттернов N+1 в Laravel/Eloquent
    const patterns = [
      /foreach\s*\([^)]+\)\s*{[^}]*->\w+\(/g,
      /while\s*\([^)]+\)\s*{[^}]*->\w+\(/g,
    ];
    
    return this.findMatches(codeContext, patterns);
  },
  
  recommend(findings) {
    return {
      message: 'Обнаружен паттерн N+1 запроса',
      suggestion: 'Используйте eager loading: Model::with("relation")->get()',
      locations: findings.map(f => f.location),
    };
  }
};
```

## Преимущества

| Преимущество | Описание |
|--------------|----------|
| **Скорость** | Мгновенный анализ без внешних API |
| **Предсказуемость** | Детерминированные правила |
| **Безопасность** | Код не покидает сервер |
| **Низкая стоимость** | Нет расходов на LLM API |
| **Специализация** | Нейроны заточены под конкретные фреймворки |
| **Расширяемость** | Легко добавлять новые детекторы |

## Недостатки

| Недостаток | Описание |
|------------|----------|
| **Ограниченность** | Только предустановленные паттерны |
| **Ложные срабатывания** | Возможны false positives |
| **Нет понимания контекста** | Правила не понимают бизнес-логику |
| **Поддержка правил** | Требуется обновление нейронов |

## Что требуется для реализации

### Уже реализовано

- [x] Базовая структура нейронов (`a2a-server/src/neurons/`)
- [x] Категории: performance, security, architecture, testing
- [x] Интеграция с API сервера
- [x] Хранение результатов в БД

### Требуется доработка

- [ ] Полноценная реализация логики каждого нейрона
- [ ] Система приоритизации находок
- [ ] Автоматическое исправление (auto-fix)
- [ ] Игнорирование ложных срабатываний
- [ ] Кастомные нейроны пользователя

### Категории нейронов

| Категория | Примеры нейронов |
|-----------|------------------|
| **Performance** | N+1 queries, missing indexes, memory leaks |
| **Security** | SQL injection, XSS, CSRF, secrets in code |
| **Architecture** | God objects, duplicated code, layer violations |
| **Testing** | Missing tests, missing feature tests |
| **TypeScript** | Any types, missing props types |
| **Laravel** | Missing validation, eager loading |
| **Vue/Frontend** | Prop drilling, Options API, a11y issues |

## Пример использования

### API запрос

```bash
POST /api/v1/requests
{
  "project_path": "/path/to/project",
  "action": "analyze",
  "neurons": ["all"],  // или список конкретных
  "severity": ["error", "warning"]
}
```

### API ответ

```json
{
  "status": "completed",
  "findings": [
    {
      "neuron": "detect-n1-queries",
      "severity": "warning",
      "file": "app/Http/Controllers/UserController.php",
      "line": 45,
      "message": "N+1 query detected in foreach loop",
      "suggestion": "Use eager loading: User::with('posts')->get()"
    },
    {
      "neuron": "detect-security-v-html",
      "severity": "error",
      "file": "resources/js/components/Comment.vue",
      "line": 12,
      "message": "Unsafe v-html directive",
      "suggestion": "Sanitize HTML before rendering"
    }
  ],
  "summary": {
    "total": 15,
    "errors": 3,
    "warnings": 12,
    "by_category": {
      "performance": 5,
      "security": 3,
      "architecture": 7
    }
  }
}
```

### CLI

```bash
# Полный анализ
npm run analyze

# Только безопасность
npm run analyze -- --category security

# Конкретные нейроны
npm run analyze -- --neurons detect-n1-queries,detect-god-objects
```

## Метрики успеха

1. **Покрытие паттернов** — процент типичных проблем детектируется
2. **Точность** — доля реальных проблем среди находок
3. **Полнота** — процент реальных проблем найден
4. **Скорость** — время анализа проекта
5. **Полезность** — процент рекомендаций, которые применяются
