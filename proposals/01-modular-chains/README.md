# Вариант 1: Модульные цепочки (split schemas)

> **Статус**: Предложение
> **Дата**: 2026-03-28
> **Автор**: System Architect

## Концепция

Разделить одну схему на несколько импортируемых частей, каждая из которых представляет отдельный шаг/операцию в цепочке.

## Структура

```
schemas/
├── chains/
│   ├── base.json           # Базовая схема (общие поля)
│   ├── steps/
│   │   ├── step-01-analyze.json   # Анализ задачи
│   │   ├── step-02-execute.json   # Выполнение
│   │   ├── step-03-verify.json   # Проверка результата
│   │   └── step-04-cleanup.json  # Очистка
│   └── triggers.json       # Триггеры активации цепочки
```

## Формат trigger

```json
{
  "chain_id": "task-execution",
  "trigger": {
    "type": "condition",
    "condition": "task.type == 'execute'"
  },
  "steps": [
    { "import": "schemas/chains/steps/step-01-analyze.json" },
    { "import": "schemas/chains/steps/step-02-execute.json" },
    { "import": "schemas/chains/steps/step-03-verify.json" }
  ],
  "on_error": { "import": "schemas/chains/steps/step-04-cleanup.json" }
}
```

## Преимущества

1. **Переиспользование**: Один шаг может использоваться в разных цепочках
2. **Унификация**: Все шаги имеют единый формат
3. **Тестирование**: Каждый шаг можно тестировать отдельно в симуляциях
4. **Отладка**: Легко найти проблемный шаг в цепочке

## Недостатки

1. **Сложность**: Больше файлов для поддержки
2. **Зависимости**: Нужен механизм разрешения зависимостей между шагами
3. **Конфликты**: Возможны конфликты при мержинге состояний

## Симуляции

Для golden standard потребуется:
- Отдельные симуляции для каждого шага
- Симуляции для проверки цепочки целиком
- Обновление `simulations/SCHEMA.md`

## Реализация

### Новые файлы

```
a2a-server/schemas/
├── chains/
│   ├── base.json           # Базовая схема
│   ├── triggers.json       # Триггеры
│   └── steps/
│       ├── step-01-analyze.json
│       ├── step-02-execute.json
│       └── step-03-verify.json
```

### Изменения в коде

| Файл | Изменение |
|------|----------|
| `a2a-server/src/services/core/request-processor/request-processor.service.ts` | Добавить import resolver |
| `a2a-server/src/services/core/request/schema-resolver.ts` | НОВЫЙ - резолвер схем |
| `a2a-client/vite-plugin-a2a/routes/trigger-engine.js` | НОВЫЙ - engine для триггеров |
| `simulations/SCHEMA.md` | + trigger формат |

### Артефакты

| Артефакт | Файл | Описание |
|----------|------|------------|
| Chain ID | context.execution.chainId | ID активной цепочки |
| Step states | schemas/chains/steps/*.json | Переиспользуемые схемы |
| Trigger map | schemas/chains/triggers.json | Условия активации |

### Симуляции

```
a2a-server/simulations/
├── chains/
│   ├── step-analyze/
│   │   ├── request.json
│   │   └── response.json
│   ├── step-execute/
│   │   ├── request.json
│   │   └── response.json
│   └── full-chain/
│       ├── request.json
│       └── response.json
```

### Roadmap

| Этап | Задача | Файлы | Статус |
|------|--------|-------|--------|
| 1 | Создать schema resolver | schema-resolver.ts | TODO |
| 2 | Определить формат trigger | triggers.json | TODO |
| 3 | Создать базовые шаги | steps/*.json | TODO |
| 4 | Интегрировать в processor | request-processor.service.ts | TODO |
| 5 | Симуляции | simulations/chains/ | TODO |

## Связанные документы

- [](../simulations/SCHEMA.md) - контракт симуляций
- [](./02-evolutionary-improvements.md) - альтернативный вариант