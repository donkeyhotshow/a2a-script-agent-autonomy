# suggest-factories

| Параметр | Значение |
|----------|----------|
| actionId | suggest-factories |
| categoryId | test-data |
| executorSystemId | agent |
| title | Предложение factories |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать factories для генерации тестовых данных.

## Что такое Factories

Паттерн для создания тестовых объектов с настраиваемыми атрибутами.

## Примеры

### Laravel

```
php
// database/factories/UserFactory.php
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password'),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }
}

// Использование
$user = User::factory()->create();
$admin = User::factory()->admin()->create();
```

### JavaScript/TypeScript

```
typescript
// factories/user.factory.ts
export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    ...overrides,
  }
}

export function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides })
}
```

## Преимущества

- Reusable тестовые данные
- Настраиваемые состояния
- Relationships
- Default значения
- Clean тесты
