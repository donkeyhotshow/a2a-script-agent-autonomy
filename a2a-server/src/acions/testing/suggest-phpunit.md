# suggest-phpunit

| Параметр | Значение |
|----------|----------|
| actionId | suggest-phpunit |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение PHPUnit |
| framework | laravel |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать PHPUnit для Laravel проектов.

## Почему PHPUnit

- Стандарт для PHP
- Официальная поддержка Laravel
- Большое сообщество
- Extensive assertions
- Data providers

## Установка

```
bash
composer require --dev phpunit/phpunit
```

## Конфигурация

```
xml
<!-- phpunit.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="./vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">./tests/Feature</directory>
        </testsuite>
    </testsuites>
</phpunit>
```

## Пример теста

```
php
<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    public function test_basic_assertion(): void
    {
        $this->assertTrue(true);
    }
}
```

## Рекомендации

- Использовать Laravel Dusk для browser testing
- Использовать RefreshDatabase trait
- Использовать factories для test data
- Организовать тесты в Unit и Feature
