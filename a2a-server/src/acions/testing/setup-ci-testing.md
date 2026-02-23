# setup-ci-testing

| Параметр | Значение |
|----------|----------|
| actionId | setup-ci-testing |
| categoryId | testing |
| executorSystemId | agent |
| title | Настройка CI для тестов |
| canMigrateToScript | ✅ |

## Описание

Агент настраивает CI (Continuous Integration) для запуска тестов.

## Поддерживаемые CI системы

- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins
- Travis CI

## GitHub Actions пример

```
yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Конфигурация

### Node.js
- Cache node_modules
- Parallel jobs для разных типов тестов

### PHP/Laravel
- Composer cache
- PHP version matrix
- DB service containers

## Best Practices

- Использовать матрицу для версий
- Кешировать зависимости
- Запускать параллельно
-自动fail при низком покрытии
- Сохранять артефакты
