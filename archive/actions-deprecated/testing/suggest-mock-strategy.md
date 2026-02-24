# suggest-mock-strategy

| Параметр | Значение |
|----------|----------|
| actionId | suggest-mock-strategy |
| categoryId | mocking |
| executorSystemId | agent |
| title | Предложение стратегии mocking |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает оптимальную стратегию mocking для проекта.

## Типы Mocking

### Unit Testing
- Mock functions
- Mock modules
- Mock classes

### Integration Testing
- HTTP mocks (MSW)
- Database mocks
- Service mocks

### E2E Testing
- API mocks
- Third-party services

## Стратегии

### 1. Jest/Vitest
```
typescript
// Mock functions
const myMock = vi.fn()
myMock.mockReturnValue('default')

// Mock modules
vi.mock('./api', () => ({
  fetchUser: vi.fn()
}))

// MSW for HTTP
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/user', () => HttpResponse.json({ id: 1 }))
)
```

### 2. PHPUnit
```
php
$mock = $this->createMock(UserRepository::class);
$mock->method('find')
    ->willReturn(new User());
```

## Рекомендации

- Использовать interface-based mocking
- Избегать over-mocking
- Использовать spy для существующих объектов
- Использовать MSW для HTTP моков
- Создавать reusable mocks
