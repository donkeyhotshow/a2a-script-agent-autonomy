# detect-n-plus-one

| Параметр | Значение |
|----------|----------|
| actionId | detect-n-plus-one |
| categoryId | laravel-query |
| executorSystemId | script |
| title | Детекция N+1 queries |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование Laravel приложения для обнаружения N+1 проблем в запросах к базе данных.

## Что обнаруживается

- Отсутствие eager loading
- Проблемы с отношениями в моделях
- Неоптимальные запросы в циклах
- Missing with() / load()

## Инструменты

- Laravel Debugbar
- N+1 Detector package
- Telescope
- Custom Eloquent observers

## Примеры проблем

```
php
// Проблема - N+1
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->comments; // каждый комментарий = новый запрос
}

// Решение - Eager loading
$posts = Post::with('comments')->get();
