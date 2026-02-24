# suggest-page-objects

| Параметр | Значение |
|----------|----------|
| actionId | suggest-page-objects |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение Page Objects |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать паттерн Page Objects для E2E тестов.

## Что такое Page Objects

Паттерн проектирования для инкапсуляции взаимодействия с UI в отдельных классах.

## Структура

```
tests/
├── pages/
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── components/
│       ├── Header.ts
│       └── Sidebar.ts
```

## Пример

```
typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async fillEmail(email: string) {
    await this.page.fill('[data-testid="email"]', email)
  }

  async fillPassword(password: string) {
    await this.page.fill('[data-testid="password"]', password)
  }

  async clickLogin() {
    await this.page.click('[data-testid="login-button"]')
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.clickLogin()
  }
}

// test
test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.login('user@example.com', 'password')
  await expect(page).toHaveURL('/dashboard')
})
```

## Преимущества

- DRY принцип
- Легкая поддержка
- Чистые тесты
- Reusable components
