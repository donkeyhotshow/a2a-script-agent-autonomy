# generate-integration-tests

| Параметр | Значение |
|----------|----------|
| actionId | generate-integration-tests |
| categoryId | testing |
| executorSystemId | agent |
| title | Генерация integration тестов |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует integration тесты для взаимодействия между модулями.

## Типы Integration тестов

### API тесты
- REST endpoints
- GraphQL queries
- WebSocket connections

### Database тесты
- Repository тесты
- Migration тесты
- Query builders

### Service тесты
- Business logic
- External APIs
- Event handling

## Пример

```
typescript
describe('User API', () => {
  beforeAll(async () => {
    await db.connect()
  })

  afterAll(async () => {
    await db.disconnect()
  })

  it('should create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })

    expect(response.status).toBe(201)
    expect(response.body.name).toBe('John')
  })
})
```

## Рекомендации

- Использовать тестовую базу данных
- Очищать данные между тестами
- Использовать fixtures
- Группировать по feature
