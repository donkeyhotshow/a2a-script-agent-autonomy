# migrate-db-schema

| Параметр | Значение |
|----------|----------|
| actionId | migrate-db-schema |
| categoryId | migration |
| executorSystemId | script |
| title | Миграция схемы БД |
| canMigrateToScript | ✅ |

## Описание

Автоматическое создание и выполнение миграций для изменения схемы базы данных.

## Типы миграций

### Структурные
- Создание таблиц
- Изменение колонок
- Удаление таблиц
- Добавление индексов
- Создание foreign keys

### Data миграции
- Перенос данных
- Трансформация данных
- Очистка данных
- Seed данные

## Примеры

### Laravel Migration
```
php
// Создание таблицы
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->rememberToken();
    $table->timestamps();
});

// Изменение таблицы
Schema::table('users', function (Blueprint $table) {
    $table->string('phone')->nullable()->after('email');
});

// Удаление таблицы
Schema::dropIfExists('users');
```

## Best practices

- Идемпотентность
- Обратная совместимость
- Тестирование на staging
- Backup перед миграцией
- Атомарные миграции
- Отдельные миграции для данных и структуры
- Использование transactions
- Логирование

## Инструменты

- Laravel Migrations
- Doctrine DBAL
- Flyway
- Liquibase
- Prisma Migrate
- Alembic (Python)
