# Security Actions Table

| actionId | categoryId | executorSystemId | title | scope | canMigrateToScript |
|----------|-----------|------------------|-------|-------|-------------------|
| scan-dependencies | dependencies | script | Сканирование зависимостей | all | ✅ |
| detect-vulnerable-packages | dependencies | script | Детекция уязвимых пакетов | all | ✅ |
| suggest-package-updates | dependencies | agent | Предложение обновлений | all | ✅ |
| detect-sql-injection | vulnerabilities | script | Детекция SQL injection | all | ✅ |
| detect-xss | vulnerabilities | script | Детекция XSS | all | ✅ |
| detect-csrf | vulnerabilities | script | Детекция CSRF | all | ✅ |
| suggest-csrf-protection | vulnerabilities | agent | Предложение CSRF защиты | all | ✅ |
| detect-secrets-in-code | secrets | script | Детекция секретов в коде | all | ✅ |
| detect-hardcoded-credentials | secrets | script | Детекция hardcoded credentials | all | ✅ |
| suggest-env-variables | secrets | agent | Предложение env переменных | all | ✅ |
| detect-weak-crypto | crypto | script | Детекция слабой криптографии | all | ✅ |
| suggest-strong-crypto | crypto | agent | Предложение сильной криптографии | all | ✅ |
| detect-auth-issues | auth | script | Детекция проблем аутентификации | all | ✅ |
| suggest-password-hashing | auth | agent | Предложение хеширования паролей | all | ✅ |
| detect-session-security | auth | script | Детекция безопасности сессий | all | ✅ |
| suggest-session-hardening | auth | agent | Предложение укрепления сессий | all | ✅ |
| detect-authorization-issues | authz | script | Детекция проблем авторизации | all | ✅ |
| suggest-rbac | authz | agent | Предложение RBAC | all | ✅ |
| implement-rbac | authz | agent | Реализация RBAC | all | ⏳ |
| detect-input-validation | validation | script | Детекция валидации ввода | all | ✅ |
| suggest-validation-rules | validation | agent | Предложение правил валидации | all | ✅ |
| detect-file-upload-issues | files | script | Детекция проблем загрузки файлов | all | ✅ |
| suggest-file-upload-security | files | agent | Предложение безопасности загрузки | all | ✅ |
| detect-cors-issues | cors | script | Детекция проблем CORS | all | ✅ |
| suggest-cors-config | cors | agent | Предложение конфигурации CORS | all | ✅ |
| detect-rate-limiting | rate-limit | script | Детекция rate limiting | all | ✅ |
| suggest-rate-limiting | rate-limit | agent | Предложение rate limiting | all | ✅ |
| implement-rate-limiting | rate-limit | agent | Реализация rate limiting | all | ⏳ |
| detect-security-headers | headers | script | Детекция security headers | all | ✅ |
| suggest-security-headers | headers | agent | Предложение security headers | all | ✅ |
| detect-gdpr-compliance | compliance | script | Детекция GDPR соответствия | all | ✅ |
| suggest-gdpr-improvements | compliance | agent | Предложение улучшений GDPR | all | ✅ |
| detect-logging-sensitive-data | logging | script | Детекция логирования чувствительных данных | all | ✅ |
| suggest-safe-logging | logging | agent | Предложение безопасного логирования | all | ✅ |

## Активация по контексту

```json
{
  "laravel": {
    "detectors": ["app/Http/Controllers/**/*.php"],
    "actions": ["detect-sql-injection", "detect-csrf", "detect-xss"]
  },
  "express": {
    "detectors": ["package.json:express"],
    "actions": ["suggest-rate-limiting", "suggest-security-headers"]
  },
  "authentication": {
    "detectors": ["**/Auth/**", "**/Login*", "**/Register*"],
    "actions": ["detect-auth-issues", "suggest-password-hashing"]
  }
}
```

## Статистика
- Всего: 34 действия
- script: 21 (62%)
- agent: 11 (32%)
- agent: 2 (6%)
