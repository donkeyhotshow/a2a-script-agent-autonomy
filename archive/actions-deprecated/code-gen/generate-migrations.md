# generate-migrations

| Параметр | Значение |
|----------|----------|
| actionId | generate-migrations |
| categoryId | code-gen |
| executorSystemId | script |
| title | Генерация миграций |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация миграций базы данных на основе изменений в моделях или схеме.

## Типы миграций

- Create table
- Alter table
- Drop table
- Add column
- Remove column
- Modify column
- Add index
- Remove index
- Add foreign key
- Seed data

## Инструменты

- Laravel migrations
- Django migrations
- TypeORM migrations
- Prisma migrations
- Flyway
- Liquibase
- Alembic

## Процесс генерации

1. Compare models with schema (сравнение моделей и схемы)
2. Generate diff (генерация diff)
3. Create migration file (создание файла миграции)
4. Validate syntax (валидация синтаксиса)
5. Add rollback (добавление отката)

## Требования

- Идемпотентность
- Поддержка rollback
- Атомарность
- Совместимость с окружениями
