# suggest-logging-best-practices

| Параметр | Значение |
|----------|----------|
| actionId | suggest-logging-best-practices |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение лучших практик логирования |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает лучшие практики безопасного логирования.

## Best Practices

### 1. Не логировать чувствительные данные
```
php
// Плохо
Log::info('User data: ' . $request->all());

// Хорошо
Log::info('User login', ['user_id' => $user->id, 'ip' => $request->ip()]);
```

### 2. Использовать структурированное логирование
```
php
Log::info('Action performed', [
    'user_id' => $user->id,
    'action' => 'update_profile',
    'resource' => 'profile',
]);
```

### 3. Маскирование данных
```
php
function maskData($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            if (in_array($key, ['password', 'credit_card', 'ssn'])) {
                $data[$key] = '***MASKED***';
            }
        }
    }
    return $data;
}
```

### 4. Ротация логов
```
php
// config/logging.php
'daily' => [
    'driver' => 'daily',
    'path' => storage_path('logs/laravel.log'),
    'days' => 30,
],
```

### 5. Аудит логов
- Логировать все важные действия
- Использовать уникальные IDs
- Включать временные метки
- Защищать логи от удаления

## Данные для логирования

- User ID
- IP address
- Timestamp
- Action type
- Resource accessed
- Status (success/failure)

## Данные для НЕ логирования

- Passwords
- Credit card numbers
- API keys
- Personal identifiable information (PII)
- Session tokens
