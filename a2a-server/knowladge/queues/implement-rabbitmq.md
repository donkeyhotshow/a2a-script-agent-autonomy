# implement-rabbitmq

| Параметр | Значение |
|----------|----------|
| actionId | implement-rabbitmq |
| categoryId | queues |
| executorSystemId | agent |
| title | Реализация RabbitMQ |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует интеграцию с RabbitMQ для асинхронной обработки сообщений.

## Архитектура RabbitMQ

### Components
- Exchange (точка обмена)
- Queue (очередь)
- Binding (связь)
- Producer (отправитель)
- Consumer (получатель)

### Exchange Types
- Direct - точное соответствие
- Fanout - всем подписчикам
- Topic - по паттерну
- Headers - по заголовкам

## Примеры

### Producer
```
php
$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$channel = $connection->channel();

$channel->exchange_declare('my_exchange', 'direct', false, true, false);
$msg = new AMQPMessage('Hello World!');
$channel->basic_publish($msg, 'my_exchange', 'my_routing_key');
```

### Consumer
```
php
$callback = function($msg) {
    echo " [x] Received: ", $msg->body, "\n";
};

$channel->basic_consume('my_queue', '', false, true, false, false, $callback);
```

## Laravel интеграция

```
php
// config/queue.php
'connections' => [
    'rabbitmq' => [
        'driver' => 'rabbitmq',
        'host' => env('RABBITMQ_HOST'),
        'port' => env('RABBITMQ_PORT'),
        'user' => env('RABBITMQ_USER'),
        'password' => env('RABBITMQ_PASSWORD'),
        'vhost' => env('RABBITMQ_VHOST'),
    ],
],
```

## Best practices

- Durable queues
- Acknowledgments
- Dead letter exchanges
- Message TTL
- Prefetch count
- Clustering
