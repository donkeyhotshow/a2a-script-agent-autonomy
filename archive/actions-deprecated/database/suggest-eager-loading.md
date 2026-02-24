# suggest-eager-loading

| Параметр | Значение |
|----------|----------|
| actionId | suggest-eager-loading |
| categoryId | database |
| executorSystemId | agent |
| title | Предложение eager loading |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует код и предлагает использование eager loading для оптимизации запросов к БД.

## Что предлагается

### Eager Loading
```
php
// Вместо N+1
$users = User::with('posts')->get();

// С множественными отношениями
$users = User::with(['posts', 'comments', 'profile'])->get();
```

### Nested Eager Loading
```
php
$users = User::with(['posts.comments', 'profile'])->get();
```

### Constrained Eager Loading
```
php
$users = User::with(['posts' => function ($query) {
    $query->where('published', true);
}])->get();
```

## Когда использовать

- При итерации по коллекции моделей
- При доступе к отношениям в цикле
- При загрузке связанных данных для отображения
- При API ответах с отношениями

## Примеры предложений

1. "Добавьте with('posts') для избежания N+1"
2. "Используйте with(['posts', 'comments']) для множественных отношений"
3. "Примените load() для ленивой загрузки"

## Инструменты

- Laravel ORM (Eloquent)
- Doctrine
- TypeORM
- Prisma
- SQLAlchemy
