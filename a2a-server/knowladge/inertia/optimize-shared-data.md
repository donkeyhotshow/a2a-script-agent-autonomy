# optimize-shared-data

| Параметр | Значение |
|----------|----------|
| actionId | optimize-shared-data |
| categoryId | inertia |
| executorSystemId | agent |
| title | Оптимизация shared data |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует и оптимизирует использование shared data в Inertia для уменьшения размера передаваемых данных.

## Проблемы, которые решаются

- Избыточные данные в shared props
- Дублирование данных между страницами
- Слишком большие объекты
- Ненужные вложенные отношения

## Типы оптимизации

### 1. Lazy loading
```
php
// Вместо
Inertia::share('user', auth()->user());

// Использовать
Inertia::share('user', fn () => auth()->user());
```

### 2. Выборочная загрузка
```php
// Загружать только нужные поля
Inertia::share('user', fn () => auth()->user()?->only(['id', 'name', 'email']));
```

### 3. Кэширование
```
php
Inertia::share('settings', fn () => Cache::remember('settings', 3600, function () {
    return Setting::all()->keyBy('key');
}));
```

### 4. Shared data только на нужных страницах
```
php
// Вместо глобального shared
// Использовать только в нужных контроллерах
return Inertia::render('Profile', [
    'user' => $user,
]);
```

## Метрики

- Размер initial payload
- Количество запросов
- Время загрузки
- Покрытие данными

## Инструменты

- Laravel Debugbar
- Network tab analysis
- Inertia SSR profiler
