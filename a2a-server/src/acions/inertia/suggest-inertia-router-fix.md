# suggest-inertia-router-fix

| Параметр | Значение |
|----------|----------|
| actionId | suggest-inertia-router-fix |
| categoryId | inertia |
| executorSystemId | agent |
| title | Предложение исправления Inertia router |
| stack | laravel-vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает исправления для проблем с Inertia router.

## Типы исправлений

- Правильный выбор между get/post/put/delete
- Использование replace вместо visit для редиректов
- Обработка preserveState и preserveScroll
- Добавление onBefore/onAfter callbacks
- Обработка ошибок и success callbacks

## Примеры

```
javascript
// Правильное использование router.visit
router.visit('/url', {
  method: 'post',
  data: { name: 'John' },
  replace: false,
  preserveScroll: true,
  onBefore: () => confirm('Are you sure?'),
  onSuccess: (page) => console.log('Success'),
  onError: (errors) => console.log(errors),
})
```

## Рекомендации

- Использовать методы get/post/put/delete вместо visit когда возможно
- Сохранять scroll позицию при фильтрации/сортировке
- Использовать replace: true для авторизации
- Всегда обрабатывать onError
