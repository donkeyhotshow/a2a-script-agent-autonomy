# rollback-deployment

| Параметр | Значение |
|----------|----------|
| actionId | rollback-deployment |
| categoryId | devops |
| executorSystemId | agent |
| title | Откат деплоя |
| canMigrateToScript | ⏳ |

## Описание

Агент выполняет откат приложения к предыдущей версии при обнаружении проблем.

## Триггеры для отката

- Failed health checks
- High error rate
- Performance degradation
- Manual trigger
- Alert threshold exceeded

## Типы отката

### Full Rollback
- Возврат к предыдущей версии
- Восстановление БД
- Восстановление конфигов

### Partial Rollback
- Откат только проблемных сервисов
- Feature flags
- Canary rollback

### Database Rollback
- Миграции вниз
- Восстановление данных
- Point-in-time recovery

## Процесс отката

```
1. Обнаружение проблемы
   ↓
2. Остановка деплоя
   ↓
3. Определение предыдущей версии
   ↓
4. Восстановление кода
   ↓
5. Восстановление БД (если нужно)
   ↓
6. Перезапуск сервисов
   ↓
7. Проверка health checks
   ↓
8. Уведомление команды
```

## Инструменты

- Kubernetes (rollout undo)
- Docker Swarm
- Laravel Forge
- Deployer
- GitHub Actions
- ArgoCD

## Best practices

- Автоматический rollback
- Health checks
- Логирование причин
- Анализ после инцидента
- Post-mortem
- Улучшение мониторинга
