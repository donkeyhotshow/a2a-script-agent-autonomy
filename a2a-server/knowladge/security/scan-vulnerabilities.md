# scan-vulnerabilities

| Параметр | Значение |
|----------|----------|
| actionId | scan-vulnerabilities |
| categoryId | security |
| executorSystemId | script |
| title | Сканирование уязвимостей |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование кода и зависимостей для выявления известных уязвимостей безопасности.

## Типы уязвимостей

- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF
- Authentication bypass
- Path traversal
- XXE
- Deserialization vulnerabilities
- Known CVEs в зависимостях

## Инструменты

- OWASP ZAP
- Nessus
- SonarQube
- Snyk
- npm audit
- Dependabot
- Retire.js

## Регулярность

- При каждом коммите
- Еженедельно
- Перед релизом
