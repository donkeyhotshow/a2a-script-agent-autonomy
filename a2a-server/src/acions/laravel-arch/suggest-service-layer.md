# suggest-service-layer

| Параметр | Значение |
|----------|----------|
| actionId | suggest-service-layer |
| categoryId | laravel-arch |
| executorSystemId | agent |
| title | Предложение Service Layer |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует контроллеры и предлагает выделение бизнес-логики в Service Layer.

## Признаки необходимости Service Layer

- Сложная бизнес-логика в контроллерах
- Дублирование кода между контроллерами
- Трудности с тестированием
- Много зависимостей
- Сложная валидация
- Логика связанная с несколькими моделями

## Пример рефакторинга

### До (в контроллере)
```
php
public function store(Request $request)
{
    $validated = $request->validate([...]);
    
    $order = Order::create($validated);
    
    foreach ($request->items as $item) {
        Product::find($item['id'])->decrement('stock', $item['qty']);
    }
    
    Mail::to($order->user)->send(new OrderCreated($order));
    
    return redirect()->route('orders.show', $order);
}
```

### После (Service Layer)
```
php
// OrderService.php
public function createOrder(array $data, array $items): Order
{
    $order = Order::create($data);
    
    foreach ($items as $item) {
        $order->items()->create($item);
        Product::find($item['id'])->decrement('stock', $item['qty']);
    }
    
    event(new OrderCreated($order));
    
    return $order;
}
```

## Преимущества

- Separation of concerns
- Тестируемость
- Повторное использование
- Чистые контроллеры
- Централизация логики
