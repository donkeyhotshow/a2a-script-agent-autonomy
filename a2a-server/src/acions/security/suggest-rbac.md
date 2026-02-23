# suggest-rbac

| Параметр | Значение |
|----------|----------|
| actionId | suggest-rbac |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение RBAC |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает реализацию Role-Based Access Control (RBAC) для приложения.

## Концепция RBAC

### Components
- **Roles** - Роли (admin, user, moderator)
- **Permissions** - Права (create, read, update, delete)
- **Users** - Пользователи с ролями

### Relationships
```
User -> Roles -> Permissions
```

## Пример реализации

### Laravel/Policies
```
php
// Policy
class PostPolicy
{
    public function viewAny(User $user) {
        return $user->hasPermission('posts.view');
    }

    public function create(User $user) {
        return $user->hasPermission('posts.create');
    }

    public function update(User $user, Post $post) {
        return $user->hasPermission('posts.update');
    }
}
```

### Middleware
```
php
Route::middleware(['role:admin'])->group(function () {
    // Admin routes
});
```

## Рекомендации

- Использовать принцип最小权限
- Документировать роли
- Регулярно аудировать
- Использовать централизованное хранилище
- Тестировать права доступа
