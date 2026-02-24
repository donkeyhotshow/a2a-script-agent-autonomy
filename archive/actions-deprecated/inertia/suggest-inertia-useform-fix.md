# suggest-inertia-useform-fix

| Параметр | Значение |
|----------|----------|
| actionId | suggest-inertia-useform-fix |
| categoryId | inertia |
| executorSystemId | agent |
| title | Предложение исправления useForm |
| stack | laravel-vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает исправления для проблем с useForm в Inertia.js компонентах.

## Типы исправлений

- Правильная инициализация с начальными данными
- Обработка ошибок валидации
- Использование isDirty для отслеживания изменений
- Правильное использование reset()
- Добавление loading state
- Обработка сабмита формы

## Примеры

```
javascript
// Правильное использование
const form = useForm({
  name: '',
  email: '',
})

// С обработкой ошибок
const form = useForm({
  name: '',
  email: '',
})

function submit() {
  form.post('/users', {
    onSuccess: () => form.reset(),
  })
}
```

## Рекомендации

- Всегда использовать onError для обработки ошибок
- Использовать onSuccess для сброса формы
- Добавлять loading состояние
- Валидировать данные на клиенте перед отправкой
