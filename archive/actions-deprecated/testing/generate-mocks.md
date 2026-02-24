# generate-mocks

| Параметр | Значение |
|----------|----------|
| actionId | generate-mocks |
| categoryId | mocking |
| executorSystemId | agent |
| title | Генерация mocks |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует mocks для внешних зависимостей.

## Примеры

### TypeScript/Jest

```
typescript
// mocks/axios.ts
export const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

// mocks/console.ts
export const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}
```

### Vitest

```
typescript
import { vi } from 'vitest'

export const mockFetch = vi.fn()
global.fetch = mockFetch
```

## Типы моков

- API clients
- External services
- Database connections
- File system
- Console/Logging

## Рекомендации

- Создавать в __mocks__ директории
- Использовать фабрики для кастомизации
- Добавлять типизацию
- Создавать spy для partial mocks
