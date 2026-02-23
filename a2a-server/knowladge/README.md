# Plans - Планы действий A2A системы

Эта папка содержит таблицы всех возможных действий, которые может выполнять A2A система.

## Структура

```
plans/
├── A2A-CAPABILITIES.md              # Общие возможности A2A (70 действий)
├── ACTIONS-TABLE.md                 # Laravel Stack действия (60 действий)
├── LARAVEL-STACK-CAPABILITIES.md    # Детальные возможности Laravel стека (55 действий)
├── FRONTEND-ACTIONS.md              # Frontend действия (40 действий)
├── BACKEND-ACTIONS.md               # Backend действия (43 действия)
├── DEVOPS-ACTIONS.md                # DevOps действия (39 действий)
└── PROJECT-CONTEXT-DETECTOR.md      # Система автоактивации
```

## Всего действий: 307+

## Формат таблиц

Все таблицы используют единый формат:

| actionId | categoryId | executorSystemId | title | canMigrateToScript |
|----------|-----------|------------------|-------|-------------------|
| action-name | category | script/agent/agent | Описание | ✅/⏳/❌ |

## Исполнители

- **script** - Автоматический скрипт (детерминированный)
- **agent** - LLM через agent (анализ, рекомендации)
- **agent** - A2A агент (сложная логика, итерации)

## Автоактивация

Система автоматически активирует действия на основе контекста проекта:

```json
{
  "pinia": {
    "detectors": ["package.json:pinia", "stores/*.ts"],
    "actions": ["suggest-pinia", "migrate-to-pinia"]
  }
}
```

См. `PROJECT-CONTEXT-DETECTOR.md` для деталей.

## Использование

1. Система сканирует проект
2. Обнаруживает контекст (фреймворки, библиотеки)
3. Активирует соответствующие действия
4. Сохраняет в `.a2a/active-actions.json`

## Roadmap

Планируется добавить:
- TESTING-ACTIONS.md
- DATABASE-ACTIONS.md
- SECURITY-ACTIONS.md
- AI-ML-ACTIONS.md
- MOBILE-ACTIONS.md
- CODE-QUALITY-ACTIONS.md
- DOCUMENTATION-ACTIONS.md
