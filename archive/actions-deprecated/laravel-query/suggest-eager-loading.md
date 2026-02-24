# suggest-eager-loading

| Параметр | Значение |
|----------|----------|
| actionId | suggest-eager-loading |
| categoryId | laravel-query |
| executorSystemId | agent |
| title | Предложение eager loading |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует код и предлагает оптимальные стратегии eager loading для устранения N+1 проблем.

## Анализируемые паттерны

- Отношения belongsTo, hasOne, hasMany, belongsToMany
- Вложенные отношения (nested relations)
- Polymorphic отношения
- Conditional loading

## Рекомендации

### Базовый eager loading
```
php
// Рекомендация
$posts = Post::with(['comments', 'author'])->get();
```

### Constrained eager loading
```
php
$posts = Post::with(['comments' => function ($query) {
    $query->where('approved', true);
}])->get();
```

### Lazy eager loading
```
php
$posts = Post::all();
$posts->load('comments');
```

### Nested eager loading
```
php
$posts = Post::with(['comments.author', 'tags'])->get();
```

## Критерии выбора

- Частота использования отношений
- Размер данных
- Количество связанных записей
- Условия фильтрации
