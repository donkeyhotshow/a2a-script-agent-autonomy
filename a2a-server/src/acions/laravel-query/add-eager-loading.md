# add-eager-loading

| Параметр | Значение |
|----------|----------|
| actionId | add-eager-loading |
| categoryId | laravel-query |
| executorSystemId | agent |
| title | Применение eager loading |
| canMigrateToScript | ⏳ |

## Описание

Агент автоматически добавляет eager loading в Laravel запросы для оптимизации производительности.

## Типы реализации

### Добавление with()
```
php
// До
$posts = Post::all();

// После
$posts = Post::with('comments')->get();
```

### Добавление load()
```
php
// До
$posts = Post::all();
foreach ($posts as $post) {
    $post->comments;
}

// После
$posts = Post::all();
$posts->load('comments');
```

### Lazy eager loading
```
php
$post->load('comments.author');
```

## Требования

- Анализ использования отношений
- Понимание контекста
- Сохранение логики
- Обновление тестов
- Проверка производительности

## Риски

- Изменение поведения
- Влияние на память
- Необходимость тестирования
