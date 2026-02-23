# suggest-oauth

| Параметр | Значение |
|----------|----------|
| actionId | suggest-oauth |
| categoryId | auth |
| executorSystemId | agent |
| title | Предложение OAuth |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает внедрение OAuth 2.0 для сторонней аутентификации.

## OAuth 2.0 Flow

### Authorization Code Flow
```
1. User -> Client: Click "Login with Google"
2. Client -> Auth Server: Redirect to /authorize
3. Auth Server -> User: Login form
4. User -> Auth Server: Enter credentials
5. Auth Server -> Client: Redirect with code
6. Client -> Auth Server: Exchange code for token
7. Auth Server -> Client: Return access token
8. Client -> Resource Server: Get user data
```

## Providers

### Social Login
- Google
- Facebook
- GitHub
- Twitter
- LinkedIn

### Libraries

### Laravel
- Laravel Socialite
- Passport

### Node.js
- Passport
- Auth0
- NextAuth.js

## Пример Laravel Socialite

```php
// routes/web.php
Route::get('/auth/redirect', function () {
    return Socialite::driver('github')->redirect();
});

Route::get('/auth/callback', function () {
    $user = Socialite::driver('github')->user();
    // Find or create user
});
```

## Когда рекомендовать

- Social login
- Third-party API access
- SSO
- Delegated authorization
