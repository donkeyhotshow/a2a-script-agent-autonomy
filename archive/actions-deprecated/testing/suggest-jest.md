# suggest-jest

| Параметр | Значение |
|----------|----------|
| actionId | suggest-jest |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение Jest |
| framework | react |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать Jest в качестве test framework для React проектов.

## Почему Jest

- Официальный фреймворк Facebook для React
- Zero-config
- Встроенный coverage
- Snapshot testing
- Много библиотек и плагинов

## Установка

```
bash
npm install --save-dev jest @testing-library/react @types/jest ts-jest
```

## Конфигурация

```
javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
```

## Пример теста

```
javascript
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders learn react link', () => {
  render(<App />)
  expect(screen.getByText(/learn react/i)).toBeInTheDocument()
})
```

## Рекомендации

- Использовать с @testing-library/react
- Настроить ts-jest для TypeScript
- Использовать jest-dom для assertions
- Настроить coverage reporter
