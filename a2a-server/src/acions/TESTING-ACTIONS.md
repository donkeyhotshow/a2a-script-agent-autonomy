# Testing Actions Table

| actionId | categoryId | executorSystemId | title | framework | canMigrateToScript |
|----------|-----------|------------------|-------|-----------|-------------------|
| detect-test-framework | setup | script | Детекция test framework | all | ✅ |
| suggest-vitest | setup | agent | Предложение Vitest | vue/react | ✅ |
| suggest-jest | setup | agent | Предложение Jest | react | ✅ |
| suggest-phpunit | setup | agent | Предложение PHPUnit | laravel | ✅ |
| analyze-test-coverage | coverage | script | Анализ покрытия тестов | all | ✅ |
| suggest-missing-tests | coverage | agent | Предложение недостающих тестов | all | ✅ |
| generate-unit-tests | unit | agent | Генерация unit тестов | all | ⏳ |
| generate-integration-tests | integration | agent | Генерация integration тестов | all | ⏳ |
| detect-e2e-framework | e2e | script | Детекция E2E framework | all | ✅ |
| suggest-playwright | e2e | agent | Предложение Playwright | all | ✅ |
| suggest-cypress | e2e | agent | Предложение Cypress | all | ✅ |
| generate-e2e-tests | e2e | agent | Генерация E2E тестов | all | ⏳ |
| suggest-page-objects | e2e | agent | Предложение Page Objects | all | ✅ |
| implement-page-objects | e2e | agent | Реализация Page Objects | all | ⏳ |
| detect-test-data | test-data | script | Детекция test data | all | ✅ |
| generate-test-data | test-data | script | Генерация test data | all | ✅ |
| suggest-factories | test-data | agent | Предложение factories | all | ✅ |
| generate-factories | test-data | agent | Генерация factories | all | ⏳ |
| detect-mocks | mocking | script | Детекция mocks | all | ✅ |
| suggest-mock-strategy | mocking | agent | Предложение стратегии mocking | all | ✅ |
| generate-mocks | mocking | agent | Генерация mocks | all | ⏳ |
| detect-snapshot-tests | snapshot | script | Детекция snapshot тестов | all | ✅ |
| suggest-snapshot-testing | snapshot | agent | Предложение snapshot testing | all | ✅ |
| update-snapshots | snapshot | script | Обновление snapshots | all | ✅ |
| detect-flaky-tests | quality | script | Детекция flaky тестов | all | ✅ |
| suggest-test-stability | quality | agent | Предложение стабилизации тестов | all | ✅ |
| detect-slow-tests | performance | script | Детекция медленных тестов | all | ✅ |
| suggest-test-optimization | performance | agent | Предложение оптимизации тестов | all | ✅ |
| detect-visual-regression | visual | script | Детекция visual regression | all | ✅ |
| suggest-visual-testing | visual | agent | Предложение visual testing | all | ✅ |
| setup-visual-regression | visual | agent | Настройка visual regression | all | ⏳ |
| detect-accessibility-tests | a11y | script | Детекция accessibility тестов | all | ✅ |
| suggest-a11y-testing | a11y | agent | Предложение a11y testing | all | ✅ |
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
- agent: 11 (32%)
- agent: 7 (21%)


# Security Actions Table

| actionId | categoryId | executorSystemId | title | scope | canMigrateToScript |
|----------|-----------|------------------|-------|-------|-------------------|
| scan-dependencies | dependencies | script | Сканирование зависимостей | all | ✅ |
| detect-vulnerable-packages | dependencies | script | Детекция уязвимых пакетов | all | ✅ |
| suggest-package-updates | dependencies | agent | Предложение обновлений | all | ✅ |
| detect-sql-injection | vulnerabilities | script | Детекция SQL injection | all | ✅ |
| detect-xss | vulnerabilities | script | Детекция XSS | all | ✅ |
| detect-csrf | vulnerabilities | script | Детекция CSRF | all | ✅ |
| suggest-csrf-protection | vulnerabilities | agent | Предложение CSRF защиты | all | ✅ |
| detect-secrets-in-code | secrets | script | Детекция секретов в коде | all | ✅ |
| detect-hardcoded-credentials | secrets | script | Детекция hardcoded credentials | all | ✅ |
| suggest-env-variables | secrets | agent | Предложение env переменных | all | ✅ |
| detect-weak-crypto | crypto | script | Детекция слабой криптографии | all | ✅ |
| suggest-strong-crypto | crypto | agent | Предложение сильной криптографии | all | ✅ |
| detect-auth-issues | auth | script | Детекция проблем аутентификации | all | ✅ |
| suggest-password-hashing | auth | agent | Предложение хеширования паролей | all | ✅ |
| detect-session-security | auth | script | Детекция безопасности сессий | all | ✅ |
| suggest-session-hardening | auth | agent | Предложение укрепления сессий | all | ✅ |
| detect-authorization-issues | authz | script | Детекция проблем авторизации | all | ✅ |
| suggest-rbac | authz | agent | Предложение RBAC | all | ✅ |
| implement-rbac | authz | agent | Реализация RBAC | all | ⏳ |
| detect-input-validation | validation | script | Детекция валидации ввода | all | ✅ |
| suggest-validation-rules | validation | agent | Предложение правил валидации | all | ✅ |
| detect-file-upload-issues | files | script | Детекция проблем загрузки файлов | all | ✅ |
| suggest-file-upload-security | files | agent | Предложение безопасности загрузки | all | ✅ |
| detect-cors-issues | cors | script | Детекция проблем CORS | all | ✅ |
| suggest-cors-config | cors | agent | Предложение конфигурации CORS | all | ✅ |
| detect-rate-limiting | rate-limit | script | Детекция rate limiting | all | ✅ |
| suggest-rate-limiting | rate-limit | agent | Предложение rate limiting | all | ✅ |
| implement-rate-limiting | rate-limit | agent | Реализация rate limiting | all | ⏳ |
| detect-security-headers | headers | script | Детекция security headers | all | ✅ |
| suggest-security-headers | headers | agent | Предложение security headers | all | ✅ |
| detect-gdpr-compliance | compliance | script | Детекция GDPR соответствия | all | ✅ |
| suggest-gdpr-improvements | compliance | agent | Предложение улучшений GDPR | all | ✅ |
| detect-logging-sensitive-data | logging | script | Детекция логирования чувствительных данных | all | ✅ |
| suggest-safe-logging | logging | agent | Предложение безопасного логирования | all | ✅ |

## Активация по контексту

```json
{
  "laravel": {
    "detectors": ["app/Http/Controllers/**/*.php"],
    "actions": ["detect-sql-injection", "detect-csrf", "detect-xss"]
  },
  "express": {
    "detectors": ["package.json:express"],
    "actions": ["suggest-rate-limiting", "suggest-security-headers"]
  },
  "authentication": {
    "detectors": ["**/Auth/**", "**/Login*", "**/Register*"],
    "actions": ["detect-auth-issues", "suggest-password-hashing"]
  }
}
```

## Статистика
- Всего: 34 действия
- script: 21 (62%)
- agent: 11 (32%)
- agent: 2 (6%)

# Project Context Detector

## Система автоматической активации функций

### Архитектура

```
project/
├── .a2a/
│   ├── context.json          # Обнаруженный контекст
│   ├── active-actions.json   # Активные действия
│   ├── file-masks.json       # Маски для поиска
│   └── architecture.json     # Архитектура проекта
```

## context.json - Обнаруженный контекст

```json
{
  "detectedAt": "2024-01-01T00:00:00Z",
  "frameworks": {
    "frontend": ["vue@3.4.0", "react@18.2.0"],
    "backend": ["laravel@11.0.0"],
    "testing": ["vitest@1.0.0", "playwright@1.40.0"]
  },
  "libraries": {
    "state": ["pinia@2.1.0"],
    "styling": ["tailwindcss@4.0.0"],
    "forms": ["vee-validate@4.12.0"]
  },
  "architecture": {
    "type": "monorepo",
    "patterns": ["mvc", "repository", "service-layer"],
    "structure": {
      "frontend": "resources/js",
      "backend": "app",
      "tests": "tests"
    }
  },
  "detectors": {
    "vue": {
      "found": true,
      "files": ["resources/js/**/*.vue"],
      "count": 45
    },
    "pinia": {
      "found": true,
      "files": ["resources/js/stores/**/*.ts"],
      "count": 8
    },
    "laravel": {
      "found": true,
      "files": ["app/Http/Controllers/**/*.php"],
      "count": 23
    }
  }
}
```

## active-actions.json - Активные действия

```json
{
  "updatedAt": "2024-01-01T00:00:00Z",
  "actions": [
    {
      "actionId": "detect-n-plus-one",
      "categoryId": "laravel-query",
      "enabled": true,
      "reason": "Laravel detected",
      "priority": "high"
    },
    {
      "actionId": "suggest-pinia",
      "categoryId": "state",
      "enabled": true,
      "reason": "Vue detected, Pinia installed",
      "priority": "medium"
    },
    {
      "actionId": "detect-composables",
      "categoryId": "composables",
      "enabled": true,
      "reason": "Vue 3 Composition API detected",
      "priority": "medium"
    }
  ],
  "disabled": [
    {
      "actionId": "suggest-redux",
      "reason": "React not detected"
    }
  ]
}
```

## file-masks.json - Маски для поиска

```json
{
  "updatedAt": "2024-01-01T00:00:00Z",
  "masks": {
    "vue-components": {
      "pattern": "resources/js/**/*.vue",
      "exclude": ["node_modules", "vendor"],
      "purpose": "Vue component detection"
    },
    "laravel-controllers": {
      "pattern": "app/Http/Controllers/**/*.php",
      "exclude": [],
      "purpose": "Laravel controller detection"
    },
    "pinia-stores": {
      "pattern": "resources/js/stores/**/*.{ts,js}",
      "exclude": [],
      "purpose": "Pinia store detection"
    },
    "tests": {
      "pattern": "tests/**/*.{php,ts,js}",
      "exclude": [],
      "purpose": "Test file detection"
    }
  },
  "custom": [
    {
      "name": "api-routes",
      "pattern": "routes/api.php",
      "purpose": "API route detection"
    }
  ]
}
```

## architecture.json - Архитектура проекта

```json
{
  "detectedAt": "2024-01-01T00:00:00Z",
  "type": "monorepo",
  "layers": {
    "presentation": {
      "path": "resources/js",
      "framework": "vue",
      "patterns": ["composition-api", "composables"]
    },
    "application": {
      "path": "app/Http",
      "framework": "laravel",
      "patterns": ["controllers", "middleware", "requests"]
    },
    "domain": {
      "path": "app/Services",
      "patterns": ["service-layer", "repository"]
    },
    "infrastructure": {
      "path": "app/Repositories",
      "patterns": ["repository", "eloquent"]
    }
  },
  "changes": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "change": "Added Pinia store",
      "impact": ["Enable pinia-related actions"]
    }
  ]
}
```

## Детекторы

### package.json детектор
```javascript
{
  "detector": "package-json",
  "checks": [
    { "key": "dependencies.vue", "activates": ["vue-actions"] },
    { "key": "dependencies.pinia", "activates": ["pinia-actions"] },
    { "key": "dependencies.react", "activates": ["react-actions"] }
  ]
}
```

### File pattern детектор
```javascript
{
  "detector": "file-pattern",
  "checks": [
    { "pattern": "**/*.vue", "activates": ["vue-actions"] },
    { "pattern": "stores/**/*.ts", "activates": ["pinia-actions"] },
    { "pattern": "app/Http/Controllers/**/*.php", "activates": ["laravel-actions"] }
  ]
}
```

### Content детектор
```javascript
{
  "detector": "file-content",
  "checks": [
    { "pattern": "import.*from.*'pinia'", "activates": ["pinia-actions"] },
    { "pattern": "use.*Pinia", "activates": ["pinia-actions"] },
    { "pattern": "defineStore", "activates": ["pinia-actions"] }
  ]
}
```

## Workflow активации

```markdown
1. Сканирование проекта
   - package.json
   - composer.json
   - Структура файлов
   - Содержимое ключевых файлов

2. Обнаружение контекста
   - Фреймворки
   - Библиотеки
   - Архитектурные паттерны

3. Генерация масок
   - На основе обнаруженной структуры
   - Сохранение в file-masks.json

4. Активация действий
   - Сопоставление с таблицами действий
   - Сохранение в active-actions.json

5. Мониторинг изменений
   - Отслеживание новых зависимостей
   - Обновление контекста
   - Переактивация действий
```

## Примеры активации

### Установка Pinia
```bash
npm install pinia
```

**Результат:**
- Обнаружено: `package.json:pinia`
- Активировано: `suggest-pinia`, `migrate-to-pinia`, `detect-composables`
- Созданы маски: `stores/**/*.ts`

### Создание Service Layer
```bash
mkdir app/Services
touch app/Services/UserService.php
```

**Результат:**
- Обнаружено: `app/Services/**/*.php`
- Активировано: `extract-service-layer`, `suggest-service-layer`
- Обновлена архитектура: добавлен `domain` layer

### Добавление тестов
```bash
npm install -D vitest
```

**Результат:**
- Обнаружено: `package.json:vitest`
- Активировано: `generate-unit-tests`, `analyze-test-coverage`
- Созданы маски: `tests/**/*.test.ts`

## API для работы с контекстом

```javascript
// Сканирование проекта
await contextDetector.scan('./project');

// Получение активных действий
const actions = contextDetector.getActiveActions();

// Проверка активации конкретного действия
const isActive = contextDetector.isActionActive('suggest-pinia');

// Добавление кастомной маски
contextDetector.addMask('custom-pattern', '**/*.custom.ts');

// Обновление архитектуры
contextDetector.updateArchitecture({ type: 'microservices' });
```
