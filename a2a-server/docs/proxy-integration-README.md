# Server-Proxy Integration

## Быстрый старт

### Установка

```bash
# Установка зависимостей (если нужен Redis для L2 кэша)
npm install redis
```

### Конфигурация

```bash
# Копируем и настраиваем конфигурацию
cp .env.example .env

# Основные настройки прокси
PROXY_BASE_URL=http://localhost:5000
PROXY_API_KEY=your-key
PROXY_CACHE_ENABLED=true
PROXY_RATE_LIMIT_ENABLED=true
```

### Использование

```typescript
import {ProxyClient} from './services/proxy.index.js';
import {getProxyClientConfig} from './config/proxy.config.js';

// Создание клиента
const client = new ProxyClient(getProxyClientConfig());

// Отправка запроса
const response = await client.sendJson('/api/v1/generate', {
    model: 'qwen3:8b',
    prompt: 'Hello, world!',
});

// Метрики
const metrics = client.getMetrics();
console.log(`Latency: ${metrics.averageLatency}ms`);
```

## Структура модулей

```
src/
├── services/
│   ├── proxy-client.ts           # Основной HTTP клиент
│   ├── proxy-cache.service.ts    # Сервис кэширования
│   ├── proxy-rate-limiter.service.ts  # Rate limiting
│   ├── proxy-monitor.service.ts  # Мониторинг и метрики
│   └── proxy.index.ts            # Единый экспорт
├── config/
│   └── proxy.config.ts           # Конфигурация
└── docs/
    ├── proxy-integration.md      # Полная документация
    └── proxy-integration-README.md  # Этот файл
```

## Возможности

- ✅ **Load Balancing** - Round-robin, least-connections, weighted
- ✅ **Circuit Breaker** - Защита от каскадных отказов
- ✅ **Caching** - L1 (memory) + L2 (Redis)
- ✅ **Rate Limiting** - Token bucket algorithm
- ✅ **Monitoring** - Метрики и алерты
- ✅ **Retry Logic** - Exponential backoff

## Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `PROXY_BASE_URL` | URL прокси | `http://localhost:5000` |
| `PROXY_CACHE_ENABLED` | Включить кэширование | `true` |
| `PROXY_RATE_LIMIT_ENABLED` | Включить rate limiting | `true` |
| `PROXY_CIRCUIT_BREAKER_ENABLED` | Включить circuit breaker | `true` |

## Ссылки

- [Полная документация](./proxy-integration.md)
- [План интеграции](../../../plans/a2a-server-new-request-flow.md)
