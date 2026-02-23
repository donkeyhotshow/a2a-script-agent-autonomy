# suggest-vitest

| Параметр | Значение |
|----------|----------|
| actionId | suggest-vitest |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение Vitest |
| framework | vue/react |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать Vitest в качестве test framework для Vue/React проектов.

## Почему Vitest

- Быстрый (Vite-powered)
- Совместимость с Jest API
- Нативная поддержка TypeScript
- Hot Module Replacement
- Встроенный coverage

## Установка

```
bash
npm install -D vitest
```

## Конфигурация

```
typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

## Пример теста

```
typescript
import { describe, it, expect } from 'vitest'

describe('Math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2)
  })
})
```

## Рекомендации

- Использовать для Vue 3 / React проектов
- Настроить jsdom/happy-dom environment
- Интегрировать с coverage
- Использовать для component testing
