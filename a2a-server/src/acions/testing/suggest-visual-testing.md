# suggest-visual-testing

| Параметр | Значение |
|----------|----------|
| actionId | suggest-visual-testing |
| categoryId | visual |
| executorSystemId | agent |
| title | Предложение visual testing |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать visual testing для обнаружения визуальных регрессий.

## Инструменты

### 1. Chromatic
- Storybook integration
- Cloud-based
- Automatic reviews

### 2. Percy
- Multi-browser
- CI integration
- Visual comparisons

### 3. BackstopJS
- Open source
- Self-hosted
- Configurable

### 4. Playwright/Vitest
- Built-in screenshot comparison
- Local execution

## Пример

```
typescript
import { test, expect } from '@playwright/test'

test('visual regression', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('homepage.png')
})
```

## Рекомендации

- Использовать для UI компонентов
- Настроить threshold для minor changes
- Интегрировать в CI
- Использовать для critical flows
