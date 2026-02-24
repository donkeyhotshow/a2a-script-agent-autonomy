# ESLint Rules для PHP и Testing

## Обзор

Этот набор правил расширяет возможности ESLint для проверки качества кода PHP файлов, тестов и конфигурационных файлов в проекте.

## Категории правил

### PHP Rules

#### `php-code-standards`
Проверяет соблюдение стандартов PHP кода согласно PSR и Laravel conventions.

**Проверки:**
- Правильное именование классов, методов, констант (PSR-1)
- Использование namespace
- Архитектурные паттерны Laravel
- Избегание статических методов в бизнес-логике

**ADR:** ADR 1001

#### `php-security-standards`
Правила безопасности для PHP кода (OWASP Top 10, Laravel Security).

**Проверки:**
- Защита от SQL инъекций
- Валидация входных данных
- Безопасное хеширование паролей
- Защита от XSS
- Mass assignment защита
- Аудит и логирование

**ADR:** ADR 403

#### `php-testing-standards`
Стандарты для PHP тестов (PHPUnit, Laravel Testing).

**Проверки:**
- Правильное именование классов и методов тестов
- Использование data providers
- Database transactions в feature тестах
- Правильное использование factories
- API testing стандарты

**ADR:** ADR 2004

#### `database-layer-standards`
Стандарты работы с базой данных.

**Проверки:**
- Структура миграций
- Foreign key constraints
- Индексы в БД
- Mass assignment защита в моделях
- Использование scopes
- Soft deletes

**ADR:** ADR 1201

### Testing Rules

#### `typescript-testing-standards`
Стандарты для TypeScript тестов (Vitest, Playwright, E2E).

**Проверки:**
- Правильное именование файлов тестов
- Использование describe/it блоков
- Setup/teardown паттерны
- Мокирование зависимостей
- E2E best practices
- Component testing стандарты
- Accessibility testing

**ADR:** ADR 2004

#### `javascript-testing-standards`
Стандарты для JavaScript тестов (Jest, Performance, API).

**Проверки:**
- Структура тестов
- Асинхронное тестирование
- API contracts и schemas
- Performance baseline
- Memory leak detection
- Load testing стандарты

**ADR:** ADR 2004

### Configuration Rules

#### `configuration-files-standards`
Стандарты для конфигурационных файлов.

**Проверки:**
- Vite конфигурация оптимизации
- Vitest изоляция тестов
- Playwright setup
- Environment variables
- ES modules структура

**ADR:** ADR 1301

## Конфигурация ESLint

Правила автоматически применяются к соответствующим типам файлов:

```javascript
// PHP файлы
{
  files: ['**/*.php'],
  rules: {
    'inertia/php-code-standards': 'error',
    'inertia/php-security-standards': 'error',
    'inertia/php-invalid-use-statements': 'warn',
    'inertia/database-layer-standards': 'warn'
  }
}

// TypeScript тесты
{
  files: ['**/tests/**/*.spec.ts', '**/tests/**/*.test.ts'],
  rules: {
    'inertia/typescript-testing-standards': 'error'
  }
}

// Конфигурационные файлы
{
  files: ['**/*.config.js', 'vite.config.*', 'vitest.config.*'],
  rules: {
    'inertia/configuration-files-standards': 'error'
  }
}
```

## Использование

```bash
# Проверить все файлы
npx eslint .

# Проверить только PHP файлы
npx eslint "**/*.php"

# Проверить только тесты
npx eslint "**/*.test.*" "**/*.spec.*"
```

## Интеграция с CI/CD

Рекомендуется интегрировать проверки в pre-commit hooks и CI pipeline:

```bash
# В package.json scripts
"lint": "eslint .",
"lint:php": "eslint "**/*.php"",
"lint:tests": "eslint "**/*.test.*" "**/*.spec.*"",
"lint:fix": "eslint . --fix"
```

## Кастомизация

Правила можно кастомизировать в `eslint.config.js`:

```javascript
{
  rules: {
    'inertia/php-code-standards': 'warn', // Изменить уровень строгости
    'inertia/php-security-standards': 'error'
  }
}
```

## ADR ссылки

- **ADR 403**: Security Standards
- **ADR 1001**: PHP Code Standards
- **ADR 1101**: Laravel Architecture Standards
- **ADR 1201**: Database Layer Standards
- **ADR 1301**: Configuration Files Standards
- **ADR 2004**: Testing-First Standards