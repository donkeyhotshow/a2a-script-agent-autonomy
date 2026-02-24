# suggest-test-stability

| Параметр | Значение |
|----------|----------|
| actionId | suggest-test-stability |
| categoryId | quality |
| executorSystemId | agent |
| title | Предложение стабилизации тестов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает решения для стабилизации flaky тестов.

## Проблемы и решения

### 1. Timing Issues
```
typescript
// Плохо
await page.waitFor(1000)

// Хорошо
await expect(page.locator('.data')).toBeVisible()
```

### 2. Shared State
```
typescript
// Использовать beforeEach для очистки
beforeEach(() => {
  clearDatabase()
  mock.resetHistory()
})
```

### 3. Network Flakiness
```
typescript
// Добавить retry логику
await expect(async () => {
  const response = await api.get()
  expect(response.status).toBe(200)
}).toPass({ retries: 3 })
```

### 4. Random Data
```
typescript
// Использовать фиксированные seed
faker.seed(12345)
```

## Рекомендации

- Избегать hardcoded waits
- Использовать explicit assertions
- Изолировать тесты
- Использовать test fixtures
- Использовать retry mechanisms
