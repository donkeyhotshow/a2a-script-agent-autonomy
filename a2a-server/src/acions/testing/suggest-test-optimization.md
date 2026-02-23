# suggest-test-optimization

| Параметр | Значение |
|----------|----------|
| actionId | suggest-test-optimization |
| categoryId | performance |
| executorSystemId | agent |
| title | Предложение оптимизации тестов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает методы оптимизации тестов для ускорения CI/CD пайплайна.

## Методы оптимизации

### 1. Параллельное выполнение
```
typescript
// Vitest
export default defineConfig({
  test: {
    workers: 4,
    parallel: true,
  },
})

// Jest
module.exports = {
  maxWorkers: '50%',
}
```

### 2. Базы данных
```
typescript
// Использовать in-memory DB для тестов
beforeEach(async () => {
  const connection = await createConnection({
    type: 'sqlite',
    database: ':memory:',
  })
})
```

### 3. Моки
```
typescript
// Мокать тяжелые зависимости
vi.mock('heavy-library', () => ({
  default: vi.fn(),
}))
```

### 4. Фильтрация
```
typescript
// Запускать только changed тесты
jest --changedSince=main
```

## Рекомендации

- Использовать in-memory базы
- Мокать внешние API
- Запускать параллельно
- Использовать shard tests
- Кешировать результаты
