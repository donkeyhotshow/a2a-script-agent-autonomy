# auto-deploy

| Параметр | Значение |
|----------|----------|
| actionId | auto-deploy |
| categoryId | devops |
| executorSystemId | script |
| title | Автоматический деплой |
| canMigrateToScript | ✅ |

## Описание

Автоматический деплой приложения на окружения после прохождения всех проверок.

## Этапы деплоя

### 1. Pre-deployment
- Проверка зависимостей
- Линтинг кода
- Unit тесты
- Сборка приложения

### 2. Deployment
- Остановка сервисов
- Обновление кода
- Миграции БД
- Перезапуск сервисов

### 3. Post-deployment
- Health checks
- Smoke tests
- Rollback при ошибках
- Уведомления

## Типы деплоя

### Blue-Green
- Два идентичных окружения
- Мгновенный switch
- Быстрый rollback

### Canary
- Постепенный rollout
- Процент пользователей
- A/B testing

### Rolling
- Постепенная замена инстансов
- Без downtime
- Обратная совместимость

## Инструменты

- GitHub Actions
- GitLab CI/CD
- Jenkins
- Deployer
- Laravel Forge
- Vapor
- Kubernetes

## Best practices

- Infrastructure as Code
- Immutable servers
- Feature flags
- Health checks
- Rollback strategy
- Monitoring
- Notifications
