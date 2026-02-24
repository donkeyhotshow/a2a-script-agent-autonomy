# suggest-cypress

| Параметр | Значение |
|----------|----------|
| actionId | suggest-cypress |
| categoryId | testing |
| executorSystemId | agent |
| title | Предложение Cypress |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать Cypress для E2E тестирования.

## Почему Cypress

- Easy to learn
- Time-travel debugging
- Real-time reloads
- Automatic waiting
- Dashboard service

## Установка

```
bash
npm install -D cypress
npx cypress open
```

## Конфигурация

```
javascript
// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    screenshotOnRunFailure: true,
  },
})
```

## Пример теста

```
javascript
describe('My First Test', () => {
  it('visits the kitchen sink', () => {
    cy.visit('http://localhost:3000')
    cy.contains('type').click()
    cy.url().should('include', '/commands/actions')
  })
})
```

## Рекомендации

- Использовать для простых проектов
- Использовать Page Objects
- Настроить CI
- Использовать Cypress Dashboard
