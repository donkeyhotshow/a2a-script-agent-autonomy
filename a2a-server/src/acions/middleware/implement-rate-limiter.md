# implement-rate-limiter

| Параметр | Значение |
|----------|----------|
| actionId | implement-rate-limiter |
| categoryId | middleware |
| executorSystemId | agent |
| title | Реализация rate limiter |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует rate limiting для защиты API от злоупотреблений.

## Реализация

### Redis-based Rate Limiter
```
php
class RateLimiter
{
    private $redis;
    
    public function __construct(Redis $redis)
    {
        $this->redis = $redis;
    }
    
    public function attempt(string $key, int $limit, int $seconds): bool
    {
        $current = $this->redis->incr($key);
        
        if ($current === 1) {
            $this->redis->expire($key, $seconds);
        }
        
        return $current <= $limit;
    }
}
```

### Token Bucket Algorithm
```
php
class TokenBucket
{
    private $capacity;
    private $tokens;
    private $refillRate;
    
    public function __construct(int $capacity, float $refillRate)
    {
        $this->capacity = $capacity;
        $this->tokens = $capacity;
        $this->refillRate = $refillRate;
    }
    
    public function consume(int $tokens = 1): bool
    {
        $this->refill();
        
        if ($this->tokens >= $tokens) {
            $this->tokens -= $tokens;
            return true;
        }
        
        return false;
    }
    
    private function refill(): void
    {
        // Refill logic based on time elapsed
    }
}
```

## Интеграция

### Laravel
```
php
// app/Http/Middleware/RateLimitMiddleware.php
public function handle($request, Closure $next)
{
    $key = 'rate_limit:' . $request->ip();
    
    if (!$this->limiter->attempt($key, 60, 1)) {
        return response()->json(['error' => 'Too many requests'], 429);
    }
    
    return $next($request);
}
```

### Express
```
javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    prefix: 'rl:',
    client: redis
  }),
  max: 100,
  windowMs: 15 * 60 * 1000
});
```

## Best practices

- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Different limits per endpoint
- Consider user tiers (free vs premium)
- Store in Redis for distributed systems
- Test under load
