# suggest-service-mesh

| Параметр | Значение |
|----------|----------|
| actionId | suggest-service-mesh |
| categoryId | architecture |
| executorSystemId | agent |
| title | Предложение service mesh |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует микросервисную архитектуру и предлагает внедрение service mesh для улучшения управления сервисами.

## Что такое Service Mesh

### Основные функции
- Service discovery
- Load balancing
- Circuit breaking
- Traffic management
- Security (mTLS)
- Observability
- Retry policies
- Rate limiting

## Популярные решения

### Istio
- Полнофункциональный
- Envoy proxies
- Rich telemetry
- Complex setup

### Linkerd
- Проще в настройке
- Lighter weight
- Good UI
- Kubernetes-first

### Consul Connect
- HashiCorp ecosystem
- Multi-datacenter
- Service configuration

### AWS App Mesh
- Managed service
- AWS integration
- CloudWatch metrics

## Примеры Istio

```
yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
      weight: 90
    - destination:
        host: reviews
        subset: v3
      weight: 10
```

## Когда рекомендовать

- Более 5+ микросервисов
- Сложные коммуникации
- Требуется mTLS
- Нужна детальная observability
- Traffic management
