# Laravel Stack Actions - Структурированный план

## Категории исполнителей

- **script** - Автоматический скрипт (быстро, детерминировано)
- **compat_llm** - LLM через Local LLM upstream (анализ, генерация, рекомендации)
- **agent** - A2A агент (сложная логика, итерации)

## Таблица действий

| actionId | categoryId | executorSystemId | title | canMigrateToScript |
|----------|-----------|------------------|-------|-------------------|
| detect-n-plus-one | laravel-query | script | Детекция N+1 queries | ✅ |
| suggest-eager-loading | laravel-query | compat_llm | Предложение eager loading | ✅ |
| add-eager-loading | laravel-query | agent | Применение eager loading | ⏳ |
| analyze-controller-size | laravel-arch | script | Анализ размера контроллеров | ✅ |
| suggest-service-layer | laravel-arch | compat_llm | Предложение Service Layer | ✅ |
| extract-service-layer | laravel-arch | agent | Извлечение Service Layer | ⏳ |
| detect-god-objects | laravel-arch | script | Детекция God Objects | ✅ |
| suggest-refactoring | laravel-arch | compat_llm | Предложение рефакторинга | ✅ |
| apply-refactoring | laravel-arch | agent | Применение рефакторинга | ⏳ |
| validate-inertia-props | inertia | script | Валидация Inertia props | ✅ |
| generate-ts-types | inertia | script | Генерация TS типов из PHP | ✅ |
| detect-unused-props | inertia | script | Детекция неиспользуемых props | ✅ |
| optimize-shared-data | inertia | compat_llm | Оптимизация shared data | ✅ |
| detect-options-api | vue | script | Детекция Options API | ✅ |
| suggest-composition-api | vue | compat_llm | Предложение Composition API | ✅ |
| migrate-to-composition | vue | agent | Миграция на Composition API | ⏳ |
| extract-composables | vue | compat_llm | Извлечение composables | ✅ |
| detect-prop-drilling | vue | script | Детекция prop drilling | ✅ |
| suggest-store | vue | compat_llm | Предложение Pinia store | ✅ |
| analyze-component-size | vue | script | Анализ размера компонентов | ✅ |
| suggest-component-split | vue | compat_llm | Предложение разделения | ✅ |
| detect-duplicate-classes | tailwind | script | Детекция дубликатов классов | ✅ |
| suggest-apply | tailwind | compat_llm | Предложение @apply | ✅ |
| extract-component-classes | tailwind | agent | Извлечение в компоненты | ⏳ |
| detect-any-types | typescript | script | Детекция any типов | ✅ |
| suggest-types | typescript | compat_llm | Предложение типов | ✅ |
| add-types | typescript | agent | Добавление типов | ⏳ |
| generate-interfaces | typescript | script | Генерация interfaces из PHP | ✅ |
| eslint-autofix | eslint | script | Автоматическое исправление | ✅ |
| suggest-custom-rules | eslint | compat_llm | Предложение кастомных правил | ✅ |
| analyze-test-coverage | vitest | script | Анализ покрытия тестов | ✅ |
| suggest-missing-tests | vitest | compat_llm | Предложение недостающих тестов | ✅ |
| generate-unit-tests | vitest | agent | Генерация unit тестов | ⏳ |
| generate-e2e-tests | playwright | agent | Генерация E2E тестов | ⏳ |
| suggest-page-objects | playwright | compat_llm | Предложение Page Objects | ✅ |
| generate-crud-module | code-gen | agent | Генерация CRUD модуля | ⏳ |
| generate-form | code-gen | agent | Генерация формы | ⏳ |
| generate-api-endpoint | code-gen | agent | Генерация API endpoint | ⏳ |
| generate-migration | code-gen | script | Генерация миграции | ✅ |
| generate-model | code-gen | script | Генерация модели | ✅ |
| generate-controller | code-gen | script | Генерация контроллера | ✅ |
| generate-vue-component | code-gen | script | Генерация Vue компонента | ✅ |
| scan-dependencies | security | script | Сканирование зависимостей | ✅ |
| detect-sql-injection | security | script | Детекция SQL injection | ✅ |
| detect-xss | security | script | Детекция XSS | ✅ |
| suggest-security-fix | security | compat_llm | Предложение исправления | ✅ |
| apply-security-fix | security | agent | Применение исправления | ⏳ |
| analyze-bundle-size | performance | script | Анализ размера бандла | ✅ |
| suggest-code-splitting | performance | compat_llm | Предложение code splitting | ✅ |
| apply-lazy-loading | performance | agent | Применение lazy loading | ⏳ |
| analyze-query-performance | performance | script | Анализ производительности запросов | ✅ |
| suggest-indexes | performance | compat_llm | Предложение индексов | ✅ |
| add-indexes | performance | agent | Добавление индексов | ⏳ |
| generate-readme | documentation | compat_llm | Генерация README | ✅ |
| generate-api-docs | documentation | script | Генерация API документации | ✅ |
| generate-changelog | documentation | script | Генерация changelog | ✅ |
| update-phpdoc | documentation | agent | Обновление PHPDoc | ⏳ |
| update-jsdoc | documentation | agent | Обновление JSDoc | ⏳ |
| setup-ci-pipeline | devops | script | Настройка CI pipeline | ✅ |
| optimize-build | devops | compat_llm | Оптимизация сборки | ✅ |
| setup-deployment | devops | agent | Настройка деплоя | ⏳ |

## Категории

### laravel-query
Оптимизация запросов Laravel

### laravel-arch
Архитектура Laravel приложения

### inertia
Inertia.js интеграция

### vue
Vue 3 компоненты и паттерны

### tailwind
Tailwind CSS оптимизация

### typescript
TypeScript типизация

### eslint
ESLint правила и автофиксы

### vitest
Unit тестирование

### playwright
E2E тестирование

### code-gen
Генерация кода

### security
Безопасность

### performance
Производительность

### documentation
Документация

### devops
DevOps автоматизация

## Приоритеты миграции на скрипты

### Высокий приоритет (быстрая окупаемость)
- add-eager-loading
- migrate-to-composition
- extract-component-classes
- add-types
- generate-unit-tests
- apply-lazy-loading

### Средний приоритет
- extract-service-layer
- apply-refactoring
- generate-e2e-tests
- apply-security-fix
- add-indexes

### Низкий приоритет (сложная логика)
- generate-crud-module
- generate-form
- generate-api-endpoint
- setup-deployment
- update-phpdoc

## Статистика

- **Всего действий**: 60
- **script**: 30 (50%)
- **compat_llm**: 18 (30%)
- **agent**: 12 (20%)
- **Можно мигрировать на script**: 10 (83% от agent)

## Roadmap миграции

### Phase 1 (Quick wins)
1. add-eager-loading → script
2. add-types → script
3. apply-lazy-loading → script

### Phase 2 (Medium complexity)
4. migrate-to-composition → script
5. extract-component-classes → script
6. generate-unit-tests → script

### Phase 3 (Complex logic)
7. extract-service-layer → script
8. apply-refactoring → script
9. generate-e2e-tests → script

### Phase 4 (Advanced)
10. apply-security-fix → script
