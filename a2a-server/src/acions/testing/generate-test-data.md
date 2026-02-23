# generate-test-data

| Параметр | Значение |
|----------|----------|
| actionId | generate-test-data |
| categoryId | test-data |
| executorSystemId | script |
| title | Генерация test data |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт генерирует тестовые данные для использования в тестах.

## Инструменты

### JavaScript/TypeScript
- Faker.js
- @faker-js/faker
- Mockgen
- Chance.js

### PHP
- FakerPHP/Faker
- Laravel Factories

## Типы данных

- Users ( имена, email, пароли )
- Products ( названия, цены, описания )
- Addresses ( города, страны, индексы )
- Dates ( прошедшие, будущие )
- UUIDs
- Custom entities

## Пример

```
typescript
import { faker } from '@faker-js/faker'

function generateUser() {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    createdAt: faker.date.past(),
  }
}

const users = faker.helpers.multiple(generateUser, { count: 10 })
```

## Конфигурация

- Локализация (ru, en)
- Типы сущностей
- Количество
- Связи между данными
