# Master Actions Index - Сводка всех планов

## Статистика

### Всего действий: 470+

| Файл | Действий | script | ollama | agent |
|------|----------|--------|--------|-------|
| A2A-CAPABILITIES.md | 70 | 45 (64%) | 12 (17%) | 13 (19%) |
| ACTIONS-TABLE.md (Laravel) | 60 | 30 (50%) | 18 (30%) | 12 (20%) |
| LARAVEL-STACK-CAPABILITIES.md | 55 | - | - | - |
| FRONTEND-ACTIONS.md | 40 | 20 (50%) | 13 (33%) | 7 (17%) |
| BACKEND-ACTIONS.md | 43 | 22 (51%) | 14 (33%) | 7 (16%) |
| DEVOPS-ACTIONS.md | 39 | 16 (41%) | 16 (41%) | 7 (18%) |
| TESTING-ACTIONS.md | 34 | 16 (47%) | 11 (32%) | 7 (21%) |
| DATABASE-ACTIONS.md | 30 | 16 (53%) | 11 (37%) | 3 (10%) |
| SECURITY-ACTIONS.md | 34 | 21 (62%) | 11 (32%) | 2 (6%) |
| CODE-QUALITY-ACTIONS.md | 41 | 25 (61%) | 11 (27%) | 5 (12%) |
| DOCUMENTATION-ACTIONS.md | 25 | 8 (32%) | 13 (52%) | 4 (16%) |

### Общая статистика

- **Всего действий:** 471
- **script:** 219 (46%)
- **ollama:** 130 (28%)
- **agent:** 67 (14%)
- **Можно мигрировать на script:** ~52 из 67 (78%)

## Категории (60+)

### Laravel Stack
- laravel-query, laravel-arch, inertia, eloquent

### Frontend
- vue, react, angular, state, component, hooks, composables, routing, forms, styling, animation

### Backend
- api-design, database, caching, queues, architecture, middleware, auth, validation, error-handling, logging, realtime, files

### DevOps
- containers, orchestration, ci-cd, monitoring, logging, secrets, webserver, ssl, backup, iac

### Testing
- setup, coverage, unit, integration, e2e, test-data, mocking, snapshot, quality, performance, visual, a11y

### Database
- setup, orm, migrations, optimization, performance, schema, seeding, transactions, connections, backup

### Security
- dependencies, vulnerabilities, secrets, crypto, auth, authz, validation, files, cors, rate-limit, headers, compliance, logging

### Code Quality
- smells, refactoring, duplication, complexity, principles, patterns, naming, documentation, cleanup, debt, metrics, coupling, cohesion

### Documentation
- readme, api, changelog, guides, legal, architecture, code-docs, examples, tutorials, faq, troubleshooting

## Фреймворки и инструменты

### Frontend
- Vue 3, React 18, Angular 17
- Pinia, Redux, NgRx, Zustand
- Tailwind, styled-components
- Vite, Webpack

### Backend
- Laravel 11, Express, NestJS, Fastify
- Eloquent, Prisma, TypeORM
- Redis, RabbitMQ, Kafka

### Testing
- Vitest, Jest, PHPUnit
- Playwright, Cypress
- Testing Library

### DevOps
- Docker, Kubernetes, Helm
- GitHub Actions, GitLab CI
- Prometheus, Grafana, ELK, Loki
- Terraform, Ansible

### Database
- MySQL, PostgreSQL, MongoDB
- Redis, Memcached

## Автоактивация

Система автоматически активирует действия на основе:

1. **package.json / composer.json** - зависимости
2. **Структура файлов** - паттерны файлов
3. **Содержимое файлов** - импорты, использование API
4. **Конфигурационные файлы** - tsconfig, vite.config, etc.

### Пример активации

```
Проект с: Laravel + Vue + Pinia + TypeScript + Vitest

Активируется:
✅ 60 действий из ACTIONS-TABLE.md (Laravel)
✅ 15 действий из FRONTEND-ACTIONS.md (Vue)
✅ 8 действий из TESTING-ACTIONS.md (Vitest)
✅ 12 действий из BACKEND-ACTIONS.md
✅ 10 действий из DATABASE-ACTIONS.md
✅ 15 действий из SECURITY-ACTIONS.md
✅ 20 действий из CODE-QUALITY-ACTIONS.md

Итого: ~140 активных действий
```

## Roadmap использования

### Phase 1: Детекция
1. Сканирование проекта
2. Обнаружение контекста
3. Генерация `.a2a/context.json`

### Phase 2: Активация
1. Сопоставление с таблицами действий
2. Активация соответствующих действий
3. Генерация `.a2a/active-actions.json`

### Phase 3: Выполнение
1. Запуск script действий
2. Запрос ollama для анализа
3. Запуск agent для сложных задач

### Phase 4: Мониторинг
1. Отслеживание изменений в проекте
2. Переактивация действий
3. Обновление архитектуры

## Использование

```bash
# Сканирование проекта
node cli.js scan-project /path/to/project

# Просмотр активных действий
node cli.js list-actions

# Выполнение действия
node cli.js run-action detect-n-plus-one

# Выполнение всех script действий
node cli.js run-all-scripts
```

## Файлы

Все планы находятся в `terminator/plans/`:
- A2A-CAPABILITIES.md
- ACTIONS-TABLE.md
- LARAVEL-STACK-CAPABILITIES.md
- FRONTEND-ACTIONS.md
- BACKEND-ACTIONS.md
- DEVOPS-ACTIONS.md
- TESTING-ACTIONS.md
- DATABASE-ACTIONS.md
- SECURITY-ACTIONS.md
- CODE-QUALITY-ACTIONS.md
- DOCUMENTATION-ACTIONS.md
- PROJECT-CONTEXT-DETECTOR.md
