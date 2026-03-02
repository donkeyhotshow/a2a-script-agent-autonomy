# Команды системы

## Основные команды

### Запуск и управление

```bash
# Запустить новую сессию
node .clinerules/scripts/workflow-engine.js --start --priority medium

# Проверить статус
node .clinerules/scripts/workflow-engine.js --status

# Продолжить с последней точки
node .clinerules/scripts/workflow-engine.js --resume

# Остановить работу
node .clinerules/scripts/workflow-engine.js --stop --reason "reason"

# Выполнить текущий шаг
node .clinerules/scripts/workflow-engine.js --execute

# Завершить текущую фазу
node .clinerules/scripts/workflow-engine.js --complete-phase
```

### Отчеты и мониторинг

```bash
# Показать статус
node .clinerules/scripts/workflow-engine.js --status

# Сгенерировать отчет
node .clinerules/scripts/workflow-engine.js --report --format json

# Запустить CLI для документации
node .clinerules/scripts/cli.js create docs/new.md "Content"
```

### Приоритеты

- `high` - Срочные задачи, быстрая обработка
- `medium` - Стандартная обработка
- `low` - Фоновая обработка, оптимизация

## Примеры использования

### Создание новой документации

```bash
# Создать документ
node .clinerules/scripts/cli.js create docs/api-guide.md "API Documentation"

# Запустить ревью
node .clinerules/scripts/cli.js start 123456

# Завершить ревью
node .clinerules/scripts/cli.js complete 123456 "All checks passed"
```

### Анализ существующей документации

```bash
# Запустить анализ
node .clinerules/scripts/workflow-engine.js --start --priority medium

# Проверять статус каждые 5 минут
watch -n 300 "node .clinerules/scripts/workflow-engine.js --status"