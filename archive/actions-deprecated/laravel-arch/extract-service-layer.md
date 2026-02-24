# extract-service-layer

| Параметр | Значение |
|----------|----------|
| actionId | extract-service-layer |
| categoryId | laravel-arch |
| executorSystemId | agent |
| title | Извлечение Service Layer |
| canMigrateToScript | ⏳ |

## Описание

Агент выполняет рефакторинг кода, выделяя бизнес-логику из контроллеров в отдельные Service классы.

## Процесс извлечения

1. Анализ методов контроллера
2. Идентификация бизнес-логики
3. Создание Service класса
4. Перенос логики
5. Использование dependency injection
6. Обновление контроллера
7. Обновление тестов

## Пример структуры

```
php
// app/Services/OrderService.php
namespace App\Services;

class OrderService
{
    public function __construct(
        private OrderRepository $orders,
        private ProductService $products,
        private Mailer $mailer
    ) {}

    public function create(array $data, array $items): Order
    {
        $order = $this->orders->create($data);
        
        foreach ($items as $item) {
            $this->products->decrementStock($item);
            $order->items()->create($item);
        }
        
        $this->mailer->sendOrderConfirmation($order);
        
        return $order;
    }
}
```

## Требования

- Понимание зависимостей
- Сохранение функциональности
- DI контейнер Laravel
- Обновление всех вызовов
- Тестирование

## Best practices

- Один сервис = одна ответственность
- Использовать интерфейсы
- Логирование
- Транзакции
- Обработка ошибок
