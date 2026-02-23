# suggest-playwright

| Параметр | Значение |
|----------|----------|
| actionId | suggest-playwright |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение Playwright |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать Playwright для E2E тестирования.

## Почему Playwright

- Microsoft поддержка
- Автоматические waits
- Multi-browser (Chromium, Firefox, WebKit)
- Parallel execution
- Built-in tracing

## Установка

```
bash
npm init playwright@latest
# или
npm install -D @playwright/test
npx playwright install --with-deps
```

## Конфигурация

```
typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

## Пример теста

```
typescript
import { test, expect } from '@playwright/test'

test('homepage has title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/My App/)
})
```

## Рекомендации

- Использовать для modern web apps
- Настроить CI интеграцию
- Использовать test fixtures
- Включить tracing для debugging
