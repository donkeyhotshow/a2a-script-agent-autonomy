# detect-middleware

| Параметр | Значение |
|----------|----------|
| actionId | detect-middleware |
| categoryId | middleware |
| executorSystemId | script |
| title | Детекция middleware |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование для определения используемых middleware в приложении.

## Что обнаруживается

### Типы middleware
- Authentication
- Authorization
- Logging
- CORS
- Rate Limiting
- Validation
- Error Handling
- Compression
- Session
- CSRF Protection

### Framework-специфичные
- Express: app.use()
- Laravel: $middleware
- Fastify: fastify.addHook()
- NestJS: @UseGuards()

## Примеры

### Laravel
```
php
// Kernel.php
protected $middleware = [
    \App\Http\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\Session\Middleware\StartSession::class,
];
```

### Express
```
javascript
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
```

## Анализ

- Route middleware
- Global middleware
- Group middleware
- Middleware order
- Custom middleware
