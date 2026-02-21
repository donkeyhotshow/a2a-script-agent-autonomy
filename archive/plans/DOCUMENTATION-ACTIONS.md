# Documentation Actions Table

| actionId | categoryId | executorSystemId | title | scope | canMigrateToScript |
|----------|-----------|------------------|-------|-------|-------------------|
| generate-readme | readme | ollama | Генерация README | all | ✅ |
| update-readme | readme | ollama | Обновление README | all | ✅ |
| suggest-readme-sections | readme | ollama | Предложение разделов README | all | ✅ |
| generate-api-docs | api | script | Генерация API документации | all | ✅ |
| generate-openapi-spec | api | script | Генерация OpenAPI спецификации | all | ✅ |
| update-api-docs | api | agent | Обновление API документации | all | ⏳ |
| generate-changelog | changelog | script | Генерация CHANGELOG | all | ✅ |
| update-changelog | changelog | script | Обновление CHANGELOG | all | ✅ |
| suggest-changelog-format | changelog | ollama | Предложение формата CHANGELOG | all | ✅ |
| generate-contributing-guide | guides | ollama | Генерация CONTRIBUTING.md | all | ✅ |
| generate-code-of-conduct | guides | ollama | Генерация CODE_OF_CONDUCT.md | all | ✅ |
| generate-license | legal | script | Генерация LICENSE | all | ✅ |
| suggest-license | legal | ollama | Предложение лицензии | all | ✅ |
| generate-architecture-docs | architecture | ollama | Генерация архитектурной документации | all | ✅ |
| generate-diagrams | architecture | ollama | Генерация диаграмм | all | ✅ |
| update-architecture-docs | architecture | agent | Обновление архитектурной документации | all | ⏳ |
| generate-jsdoc | code-docs | agent | Генерация JSDoc | js/ts | ⏳ |
| generate-phpdoc | code-docs | agent | Генерация PHPDoc | php | ⏳ |
| generate-typedoc | code-docs | script | Генерация TypeDoc | ts | ✅ |
| detect-missing-docs | code-docs | script | Детекция отсутствующей документации | all | ✅ |
| suggest-doc-improvements | code-docs | ollama | Предложение улучшений документации | all | ✅ |
| generate-examples | examples | ollama | Генерация примеров использования | all | ✅ |
| generate-tutorials | tutorials | ollama | Генерация туториалов | all | ✅ |
| generate-faq | faq | ollama | Генерация FAQ | all | ✅ |
| generate-troubleshooting | troubleshooting | ollama | Генерация troubleshooting guide | all | ✅ |

## Активация по контексту

```json
{
  "new-project": {
    "detectors": ["!README.md"],
    "actions": ["generate-readme", "generate-license"]
  },
  "api-project": {
    "detectors": ["routes/api.php", "**/*Controller.php"],
    "actions": ["generate-api-docs", "generate-openapi-spec"]
  },
  "typescript": {
    "detectors": ["tsconfig.json"],
    "actions": ["generate-typedoc", "generate-jsdoc"]
  },
  "open-source": {
    "detectors": [".git/"],
    "actions": ["generate-contributing-guide", "generate-code-of-conduct"]
  }
}
```

## Статистика
- Всего: 25 действий
- script: 8 (32%)
- ollama: 13 (52%)
- agent: 4 (16%)
