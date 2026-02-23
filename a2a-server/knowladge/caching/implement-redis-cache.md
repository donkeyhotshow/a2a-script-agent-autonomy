# implement-redis-cache

| Параметр | Значение |
|----------|----------|
| actionId | implement-redis-cache |
| categoryId | caching |
| executorSystemId | agent |
| title | Реализация Redis кэша |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует кэширование с использованием Redis для повышения производительности.

## Что реализуется

### Конфигурация
```
php
// Laravel пример
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
```

### Кэширование данных
```
php
// Кэширование запроса
$users = Cache::remember('users_list', 3600, function () {
    return User::all();
});
```

### Кэширование сессий
```
php
// Сессии в Redis
'store' => 'redis',
```

## Типичные операции

### Strings
```
php
$redis->set('key', 'value');
$redis->get('key');
```

### Hashes
```
php
$redis->hSet('user:1', 'name', 'John');
$redis->hGetAll('user:1');
```

### Lists/Sets
```
php
$redis->rPush('queue', 'task');
$redis->sAdd('online_users', 'user:1');
```

## Best practices

- TTL для всех ключей
- Key naming convention
- Serialization (JSON/MessagePack)
- Pipeline для batch операций
- Connection pooling

## Инструменты

- Redis CLI
- Predis
- phpredis
- Laravel Redis
- Node.js ioredis
