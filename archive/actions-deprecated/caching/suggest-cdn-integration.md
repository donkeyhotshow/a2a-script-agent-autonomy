# suggest-cdn-integration

| Параметр | Значение |
|----------|----------|
| actionId | suggest-cdn-integration |
| categoryId | caching |
| executorSystemId | agent |
| title | Предложение CDN |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает интеграцию с CDN для оптимизации доставки статических файлов.

## Когда рекомендовать CDN

### Преимущества
- Уменьшение latency
- Снижение нагрузки на сервер
- Географическое распределение
- DDoS защита
- Автоматическое сжатие

### Что кэшировать
- Изображения
- CSS/JS файлы
- Шрифты
- Видео
- API responses
- Статические файлы

## Примеры конфигурации

### Cloudflare
```
javascript
// DNS настройка
A record -> your-server-ip
CNAME   -> your-domain.cloudflare.com
```

### AWS CloudFront
```
javascript
// CloudFront distribution
Origin: your-server.com
Cache Policy: CachedBasedOnRequestHeaders
```

### Laravel + CDN
```
php
// config/filesystems.php
'disks' => [
    's3' => [
        'driver' => 's3',
        'region' => 'us-east-1',
        'bucket' => 'your-bucket',
        'url' => 'https://cdn.your-domain.com',
    ],
],
```

## Best practices

- Использовать для статики
- Настроить cache headers
- Использовать versioning
- Оптимизировать images
- Настроить CORS
