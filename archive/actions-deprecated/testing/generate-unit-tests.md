# generate-unit-tests

| Параметр | Значение |
|----------|----------|
| actionId | generate-unit-tests |
| categoryId | testing |
| executorSystemId | agent |
| title | Генерация unit тестов |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует unit тесты для указанного кода.

## Типы тестов

### Positive tests
- Basic functionality
- Normal inputs
- Expected behavior

### Negative tests
- Error handling
- Invalid inputs
- Edge cases

### Boundary tests
- Min/max values
- Empty collections
- Null/undefined

## Примеры

```
typescript
// Input code
function add(a: number, b: number): number {
  return a + b
}

// Generated test
describe('add', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3)
  })

  it('should handle negative numbers', () => {
    expect(add(-1, -1)).toBe(-2)
  })

  it('should handle zero', () => {
    expect(add(0, 5)).toBe(5)
  })
})
```

## Рекомендации

- Использовать describe/it/expect
- Давать описательные имена
- Тестировать одну вещь за раз
- Использовать beforeEach для setup
