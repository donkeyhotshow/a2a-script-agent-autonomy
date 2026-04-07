# Database Actions Table

| actionId | categoryId | executorSystemId | title | database | canMigrateToScript |
|----------|-----------|------------------|-------|----------|-------------------|
| detect-database | setup | script | Детекция БД | all | ✅ |
| detect-orm | setup | script | Детекция ORM | all | ✅ |
| suggest-eloquent | orm | compat_llm | Предложение Eloquent | laravel | ✅ |
| suggest-prisma | orm | compat_llm | Предложение Prisma | node | ✅ |
| detect-migrations | migrations | script | Детекция миграций | all | ✅ |
| generate-migration | migrations | script | Генерация миграции | all | ✅ |
| suggest-migration-strategy | migrations | compat_llm | Предложение стратегии миграций | all | ✅ |
| detect-n-plus-one | optimization | script | Детекция N+1 queries | all | ✅ |
| suggest-eager-loading | optimization | compat_llm | Предложение eager loading | all | ✅ |
| add-eager-loading | optimization | agent | Применение eager loading | all | ⏳ |
| detect-missing-indexes | optimization | script | Детекция отсутствующих индексов | all | ✅ |
| suggest-indexes | optimization | compat_llm | Предложение индексов | all | ✅ |
| add-indexes | optimization | agent | Добавление индексов | all | ⏳ |
| detect-slow-queries | performance | script | Детекция медленных запросов | all | ✅ |
| analyze-query-plan | performance | script | Анализ query plan | all | ✅ |
| suggest-query-optimization | performance | compat_llm | Предложение оптимизации запросов | all | ✅ |
| detect-table-structure | schema | script | Детекция структуры таблиц | all | ✅ |
| suggest-normalization | schema | compat_llm | Предложение нормализации | all | ✅ |
| suggest-denormalization | schema | compat_llm | Предложение денормализации | all | ✅ |
| detect-relationships | schema | script | Детекция связей | all | ✅ |
| suggest-foreign-keys | schema | compat_llm | Предложение foreign keys | all | ✅ |
| detect-seeders | seeding | script | Детекция seeders | all | ✅ |
| generate-seeders | seeding | script | Генерация seeders | all | ✅ |
| detect-transactions | transactions | script | Детекция транзакций | all | ✅ |
| suggest-transaction-usage | transactions | compat_llm | Предложение использования транзакций | all | ✅ |
| detect-connection-pooling | connections | script | Детекция connection pooling | all | ✅ |
| suggest-connection-optimization | connections | compat_llm | Предложение оптимизации соединений | all | ✅ |
| detect-backup-strategy | backup | script | Детекция стратегии бэкапов | all | ✅ |
| suggest-backup-automation | backup | compat_llm | Предложение автоматизации бэкапов | all | ✅ |
| setup-backup-automation | backup | agent | Настройка автоматизации бэкапов | all | ⏳ |

## Активация по контексту

```json
{
  "mysql": {
    "detectors": [".env:DB_CONNECTION=mysql", "config/database.php"],
    "actions": ["detect-n-plus-one", "suggest-indexes"]
  },
  "postgresql": {
    "detectors": [".env:DB_CONNECTION=pgsql"],
    "actions": ["analyze-query-plan", "suggest-indexes"]
  },
  "eloquent": {
    "detectors": ["app/Models/**/*.php"],
    "actions": ["detect-n-plus-one", "suggest-eager-loading"]
  },
  "prisma": {
    "detectors": ["prisma/schema.prisma"],
    "actions": ["generate-migration", "generate-seeders"]
  }
}
```

## Статистика
- Всего: 30 действий
- script: 16 (53%)
- compat_llm: 11 (37%)
- agent: 3 (10%)
