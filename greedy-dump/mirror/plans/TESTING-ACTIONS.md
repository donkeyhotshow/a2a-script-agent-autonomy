# Testing Actions Table

| actionId | categoryId | executorSystemId | title | framework | canMigrateToScript |
|----------|-----------|------------------|-------|-----------|-------------------|
| detect-test-framework | setup | script | Детекция test framework | all | ✅ |
| suggest-vitest | setup | compat_llm | Предложение Vitest | vue/react | ✅ |
| suggest-jest | setup | compat_llm | Предложение Jest | react | ✅ |
| suggest-phpunit | setup | compat_llm | Предложение PHPUnit | laravel | ✅ |
| analyze-test-coverage | coverage | script | Анализ покрытия тестов | all | ✅ |
| suggest-missing-tests | coverage | compat_llm | Предложение недостающих тестов | all | ✅ |
| generate-unit-tests | unit | agent | Генерация unit тестов | all | ⏳ |
| generate-integration-tests | integration | agent | Генерация integration тестов | all | ⏳ |
| detect-e2e-framework | e2e | script | Детекция E2E framework | all | ✅ |
| suggest-playwright | e2e | compat_llm | Предложение Playwright | all | ✅ |
| suggest-cypress | e2e | compat_llm | Предложение Cypress | all | ✅ |
| generate-e2e-tests | e2e | agent | Генерация E2E тестов | all | ⏳ |
| suggest-page-objects | e2e | compat_llm | Предложение Page Objects | all | ✅ |
| implement-page-objects | e2e | agent | Реализация Page Objects | all | ⏳ |
| detect-test-data | test-data | script | Детекция test data | all | ✅ |
| generate-test-data | test-data | script | Генерация test data | all | ✅ |
| suggest-factories | test-data | compat_llm | Предложение factories | all | ✅ |
| generate-factories | test-data | agent | Генерация factories | all | ⏳ |
| detect-mocks | mocking | script | Детекция mocks | all | ✅ |
| suggest-mock-strategy | mocking | compat_llm | Предложение стратегии mocking | all | ✅ |
| generate-mocks | mocking | agent | Генерация mocks | all | ⏳ |
| detect-snapshot-tests | snapshot | script | Детекция snapshot тестов | all | ✅ |
| suggest-snapshot-testing | snapshot | compat_llm | Предложение snapshot testing | all | ✅ |
| update-snapshots | snapshot | script | Обновление snapshots | all | ✅ |
| detect-flaky-tests | quality | script | Детекция flaky тестов | all | ✅ |
| suggest-test-stability | quality | compat_llm | Предложение стабилизации тестов | all | ✅ |
| detect-slow-tests | performance | script | Детекция медленных тестов | all | ✅ |
| suggest-test-optimization | performance | compat_llm | Предложение оптимизации тестов | all | ✅ |
| detect-visual-regression | visual | script | Детекция visual regression | all | ✅ |
| suggest-visual-testing | visual | compat_llm | Предложение visual testing | all | ✅ |
| setup-visual-regression | visual | agent | Настройка visual regression | all | ⏳ |
| detect-accessibility-tests | a11y | script | Детекция accessibility тестов | all | ✅ |
| suggest-a11y-testing | a11y | compat_llm | Предложение a11y testing | all | ✅ |
| generate-a11y-tests | a11y | agent | Генерация a11y тестов | all | ⏳ |

## Активация по контексту

```json
{
  "vitest": {
    "detectors": ["package.json:vitest", "vitest.config.ts"],
    "actions": ["analyze-test-coverage", "generate-unit-tests"]
  },
  "playwright": {
    "detectors": ["package.json:@playwright/test", "playwright.config.ts"],
    "actions": ["generate-e2e-tests", "suggest-page-objects"]
  },
  "phpunit": {
    "detectors": ["composer.json:phpunit", "phpunit.xml"],
    "actions": ["generate-unit-tests", "suggest-factories"]
  }
}
```

## Статистика
- Всего: 34 действия
- script: 16 (47%)
- compat_llm: 11 (32%)
- agent: 7 (21%)
