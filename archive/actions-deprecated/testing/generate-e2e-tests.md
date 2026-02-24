# generate-e2e-tests

| Параметр | Значение |
|----------|----------|
| actionId | generate-e2e-tests |
| categoryId | testing |
| executorSystemId | agent |
| title | Генерация E2E тестов |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует E2E тесты для критических пользовательских сценариев.

## Типы E2E тестов

### Authentication
- Login / Logout
- Registration
- Password reset
- Social auth

### CRUD операции
- Create / Read / Update / Delete
- Forms validation
- Error handling

### Navigation
- Menu navigation
- Routing
- Breadcrumbs

### User flows
- Checkout process
- Search and filter
- Multi-step forms

## Пример

```
typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'user@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Рекомендации

- Использовать data-testid атрибуты
- Группировать по feature
- Использовать fixtures для test data
- Избегать hardcoded waits
