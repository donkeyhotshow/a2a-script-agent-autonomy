# implement-rbac

| Параметр | Значение |
|----------|----------|
| actionId | implement-rbac |
| categoryId | security |
| executorSystemId | agent |
| title | Реализация RBAC |
| scope | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует Role-Based Access Control (RBAC) в приложении.

## Этапы реализации

### 1. База данных

```
php
// Миграция
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('slug')->unique();
    $table->timestamps();
});

Schema::create('permissions', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('slug')->unique();
    $table->timestamps();
});

Schema::create('role_user', function (Blueprint $table) {
    $table->foreignId('role_id')->constrained();
    $table->foreignId('user_id')->constrained();
});

Schema::create('permission_role', function (Blueprint $table) {
    $table->foreignId('permission_id')->constrained();
    $table->foreignId('role_id')->constrained();
});
```

### 2. Модели

```
php
// Role.php
class Role extends Model
{
    public function users() {
        return $this->belongsToMany(User::class);
    }

    public function permissions() {
        return $this->belongsToMany(Permission::class);
    }
}
```

### 3. Policies

```
php
// PostPolicy.php
class PostPolicy
{
    public function viewAny(User $user) { ... }
    public function create(User $user) { ... }
    public function update(User $user, Post $post) { ... }
    public function delete(User $user, Post $post) { ... }
}
```

### 4. Middleware

```
php
// RoleMiddleware.php
class RoleMiddleware
{
    public function handle($request, Closure $next, $role) {
        if (!$request->user()->hasRole($role)) {
            abort(403);
        }
        return $next($request);
    }
}
```

## Best Practices

- Начинать с простого
- Использовать seeders для начальных данных
- Документировать все роли
- Регулярно аудировать
- Тестировать все сценарии
