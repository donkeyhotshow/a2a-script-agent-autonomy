# detect-microservices

| Параметр | Значение |
|----------|----------|
| actionId | detect-microservices |
| categoryId | architecture |
| executorSystemId | script |
| title | Детекция микросервисов |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование для определения архитектуры микросервисов.

## Что обнаруживается

### Признаки микросервисов
- Несколько Docker контейнеров
- Multiple repositories
- API Gateway
- Service discovery
- Distributed tracing
- Separate databases per service

### Компоненты
- Docker / Kubernetes
- API Gateway
- Service mesh
- Message queues
- Distributed caches

## Инструменты анализа

- docker-compose.yml
- Kubernetes manifests
- CI/CD pipelines
- Infrastructure code
- Repository structure
- Package dependencies

## Детекторы

```
json
{
  "detectors": [
    "docker-compose.yml",
    "Dockerfile",
    "kubernetes/",
    "docker/",
    ".gitlab-ci.yml",
    "*.service.js"
  ]
}
```

## Анализ связей

- Межсервисные вызовы
- Общие базы данных
- Shared libraries
- API контракты
