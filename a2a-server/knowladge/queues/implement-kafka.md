# implement-kafka

| Параметр | Значение |
|----------|----------|
| actionId | implement-kafka |
| categoryId | queues |
| executorSystemId | agent |
| title | Реализация Kafka |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент реализует интеграцию с Apache Kafka для высокопроизводительной потоковой обработки.

## Архитектура Kafka

### Основные компоненты
- Broker - сервер Kafka
- Topic - категория сообщений
- Partition - часть топика
- Producer - отправитель
- Consumer - получатель
- Consumer Group - группа потребителей
- Offset - позиция в partition

### Преимущества
- Высокая пропускная способность
- Durability (репликация)
- Масштабируемость
- Log retention
- Stream processing

## Примеры

### Producer (PHP)
```
php
$conf = new RdKafka\Conf();
$conf->set('metadata.broker.list', 'localhost:9092');
$producer = new RdKafka\Producer($conf);
$topic = $producer->newTopic('my_topic');
$topic->produce(RD_KAFKA_PARTITION_UA, 0, "Message");
$producer->poll(0);
```

### Consumer (PHP)
```
php
$conf = new RdKafka\Conf();
$conf->set('group.id', 'my_consumer_group');
$consumer = new RdKafka\KafkaConsumer($conf);
$consumer->subscribe(['my_topic']);

while (true) {
    $message = $consumer->consume(1000);
    switch ($message->err) {
        case RD_KAFKA_RESP_ERR_NO_ERROR:
            echo $message->payload;
            break;
    }
}
```

### Producer (Node.js)
```
javascript
const kafka = new Kafka({ brokers: ['localhost:9092'] });
const producer = kafka.producer();
await producer.connect();
await producer.send({ topic: 'my_topic', messages: [{ value: 'Hello' }] });
```

## Best practices

- Топики с adequate partitions
- Producer acknowledgments
- Consumer group balancing
- Schema registry
- Monitoring (Kafka Manager)
- Log compaction

## Инструменты

- librdkafka
- kafka-php
- node-rdkafka
- confluent-kafka-python
- Kafka Connect
- KSQL / ksqlDB
