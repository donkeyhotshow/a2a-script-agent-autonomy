# DevOps Actions Table

| actionId | categoryId | executorSystemId | title | tool | canMigrateToScript |
|----------|-----------|------------------|-------|------|-------------------|
| detect-docker | containers | script | Детекция Docker | docker | ✅ |
| optimize-dockerfile | containers | agent | Оптимизация Dockerfile | docker | ✅ |
| suggest-multi-stage-build | containers | agent | Предложение multi-stage build | docker | ✅ |
| detect-docker-compose | containers | script | Детекция Docker Compose | docker | ✅ |
| optimize-docker-compose | containers | agent | Оптимизация docker-compose.yml | docker | ✅ |
| detect-kubernetes | orchestration | script | Детекция Kubernetes | k8s | ✅ |
| generate-k8s-manifests | orchestration | agent | Генерация K8s манифестов | k8s | ⏳ |
| suggest-helm-charts | orchestration | agent | Предложение Helm charts | k8s | ✅ |
| detect-ci-pipeline | ci-cd | script | Детекция CI pipeline | all | ✅ |
| suggest-github-actions | ci-cd | agent | Предложение GitHub Actions | github | ✅ |
| generate-github-workflow | ci-cd | agent | Генерация GitHub workflow | github | ⏳ |
| suggest-gitlab-ci | ci-cd | agent | Предложение GitLab CI | gitlab | ✅ |
| generate-gitlab-ci | ci-cd | agent | Генерация .gitlab-ci.yml | gitlab | ⏳ |
| detect-monitoring | monitoring | script | Детекция мониторинга | all | ✅ |
| suggest-prometheus | monitoring | agent | Предложение Prometheus | prometheus | ✅ |
| setup-prometheus | monitoring | agent | Настройка Prometheus | prometheus | ⏳ |
| suggest-grafana | monitoring | agent | Предложение Grafana | grafana | ✅ |
| setup-grafana-dashboards | monitoring | agent | Настройка Grafana dashboards | grafana | ⏳ |
| detect-logging | logging | script | Детекция логирования | all | ✅ |
| suggest-elk-stack | logging | agent | Предложение ELK stack | elk | ✅ |
| setup-elk | logging | agent | Настройка ELK | elk | ⏳ |
| suggest-loki | logging | agent | Предложение Loki | loki | ✅ |
| detect-secrets | secrets | script | Детекция секретов | all | ✅ |
| suggest-vault | secrets | agent | Предложение Vault | vault | ✅ |
| setup-vault | secrets | agent | Настройка Vault | vault | ⏳ |
| detect-env-files | secrets | script | Детекция .env файлов | all | ✅ |
| suggest-secrets-manager | secrets | agent | Предложение Secrets Manager | aws | ✅ |
| detect-nginx | webserver | script | Детекция Nginx | nginx | ✅ |
| optimize-nginx-config | webserver | agent | Оптимизация Nginx config | nginx | ✅ |
| suggest-load-balancer | webserver | agent | Предложение load balancer | all | ✅ |
| detect-ssl-certificates | ssl | script | Детекция SSL сертификатов | all | ✅ |
| suggest-letsencrypt | ssl | agent | Предложение Let's Encrypt | letsencrypt | ✅ |
| setup-ssl-automation | ssl | agent | Настройка SSL автоматизации | all | ⏳ |
| detect-backup-strategy | backup | script | Детекция стратегии бэкапов | all | ✅ |
| suggest-backup-solution | backup | agent | Предложение решения бэкапов | all | ✅ |
| setup-automated-backups | backup | agent | Настройка автоматических бэкапов | all | ⏳ |
| detect-infrastructure-as-code | iac | script | Детекция IaC | all | ✅ |
| suggest-terraform | iac | agent | Предложение Terraform | terraform | ✅ |
| generate-terraform-config | iac | agent | Генерация Terraform конфига | terraform | ⏳ |
| suggest-ansible | iac | agent | Предложение Ansible | ansible | ✅ |

## Активация по контексту

```json
{
  "docker": {
    "detectors": ["Dockerfile", "docker-compose.yml"],
    "actions": ["optimize-dockerfile", "suggest-multi-stage-build"]
  },
  "kubernetes": {
    "detectors": ["k8s/**/*.yaml", "*.k8s.yaml"],
    "actions": ["generate-k8s-manifests", "suggest-helm-charts"]
  },
  "github-actions": {
    "detectors": [".github/workflows/*.yml"],
    "actions": ["generate-github-workflow", "suggest-github-actions"]
  },
  "prometheus": {
    "detectors": ["prometheus.yml", "docker-compose.yml:prometheus"],
    "actions": ["setup-prometheus", "suggest-grafana"]
  }
}
```

## Статистика
- Всего: 39 действий
- script: 16 (41%)
- agent: 16 (41%)
- agent: 7 (18%)
