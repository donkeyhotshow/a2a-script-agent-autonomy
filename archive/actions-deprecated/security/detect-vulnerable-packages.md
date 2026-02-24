# detect-vulnerable-packages

| Параметр | Значение |
|----------|----------|
| actionId | detect-vulnerable-packages |
| categoryId | security |
| executorSystemId | script |
| title | Детекция уязвимых пакетов |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет уязвимые пакеты в проекте.

## Детекция

### Уязвимости
- Known vulnerabilities (CVE)
- Outdated packages
- Malicious packages
- Typosquatting

### Источники данных
- npm advisory database
- GitHub Advisory Database
- Snyk Vulnerability Database
- CVE database

## Результат

- Список уязвимых пакетов
- Версии с уязвимостями
- CVE идентификаторы
- Severity levels (Critical, High, Medium, Low)
- Рекомендуемые версии

## Команды

```
bash
# npm
npm audit --json

# yarn
yarn audit --json

# Snyk
snyk test --json
