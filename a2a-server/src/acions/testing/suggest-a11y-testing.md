# suggest-a11y-testing

| Параметр | Значение |
|----------|----------|
| actionId | suggest-a11y-testing |
| categoryId | a11y |
| executorSystemId | agent |
| title | Предложение a11y testing |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать accessibility testing для обеспечения доступности приложения.

## Инструменты

### 1. axe-core
```
typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### 2. Playwright axe
```
typescript
import { test, expect } from '@playwright/test'

test('page is accessible', async ({ page }) => {
  await page.goto('/')
  const accessibilityTree = await page.accessibility.snapshot()
  expect(accessibilityTree).toBeDefined()
})
```

### 3. Lighthouse CI
```
bash
npm install -D @lhci/cli
lhci autorun
```

## WCAG Guidelines

- Level A, AA, AAA
- Color contrast (4.5:1)
- Keyboard navigation
- Screen reader support
- Focus management

## Рекомендации

- Интегрировать в CI
- Тестировать все critical components
- Использовать multiple tools
- Следовать WCAG 2.1
