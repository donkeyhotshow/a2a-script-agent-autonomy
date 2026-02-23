# setup-visual-regression

| Параметр | Значение |
|----------|----------|
| actionId | setup-visual-regression |
| categoryId | visual |
| executorSystemId | agent |
| title | Настройка visual regression |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент настраивает visual regression testing в проекте.

## Процесс настройки

### 1. Установка зависимостей

```
bash
# Playwright
npm install -D @playwright/test

# Или с другими инструментами
npm install -D backstopjs
```

### 2. Конфигурация

```
typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './visual-tests',
  fullyParallel: true,
  use: {
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

### 3. Первые тесты

```
typescript
import { test, expect } from '@playwright/test'

test('homepage visual', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.1,
  })
})
```

## Рекомендации

- Настроить CI integration
- Определить threshold
- Использовать для critical pages
- Регулярно обновлять baseline
