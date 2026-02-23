# generate-factories

| Параметр | Значение |
|----------|----------|
| actionId | generate-factories |
| categoryId | test-data |
| executorSystemId | agent |
| title | Генерация factories |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует factories для создания тестовых данных.

## Процесс генерации

1. Анализ моделей/сущностей
2. Определение полей и типов
3. Генерация factory файла
4. Добавление состояний (states)

## Пример сгенерированной factory

```
php
// database/factories/OrderFactory.php

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => 'pending',
            'total' => fake()->randomFloat(2, 10, 1000),
            'currency' => 'USD',
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    public function withItems(int $count = 3): static
    {
        return $this->has(
            OrderItem::factory()->count($count),
            'items'
        );
    }
}
```

## Рекомендации

- Использовать для связанных моделей
- Добавлять states для разных сценариев
- Использовать relationships
- Настраивать lazy relationships
