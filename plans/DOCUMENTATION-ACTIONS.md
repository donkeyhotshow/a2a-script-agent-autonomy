# Documentation Actions Table

| actionId | categoryId | executorSystemId | title | scope | canMigrateToScript |
|----------|-----------|------------------|-------|-------|-------------------|
| generate-readme | readme | compat_llm | Генерация README | all | ✅ |
| update-readme | readme | compat_llm | Обновление README | all | ✅ |
| suggest-readme-sections | readme | compat_llm | Предложение разделов README | all | ✅ |
| generate-api-docs | api | script | Генерация API документации | all | ✅ |
| generate-openapi-spec | api | script | Генерация OpenAPI спецификации | all | ✅ |
| update-api-docs | api | agent | Обновление API документации | all | ⏳ |
| generate-changelog | changelog | script | Генерация CHANGELOG | all | ✅ |
| update-changelog | changelog | script | Обновление CHANGELOG | all | ✅ |
| suggest-changelog-format | changelog | compat_llm | Предложение формата CHANGELOG | all | ✅ |
| generate-contributing-guide | guides | compat_llm | Генерация CONTRIBUTING.md | all | ✅ |
| generate-code-of-conduct | guides | compat_llm | Генерация CODE_OF_CONDUCT.md | all | ✅ |
| generate-license | legal | script | Генерация LICENSE | all | ✅ |
| suggest-license | legal | compat_llm | Предложение лицензии | all | ✅ |
| generate-architecture-docs | architecture | compat_llm | Генерация архитектурной документации | all | ✅ |
| generate-diagrams | architecture | compat_llm | Генерация диаграмм | all | ✅ |
| update-architecture-docs | architecture | agent | Обновление архитектурной документации | all | ⏳ |
| generate-jsdoc | code-docs | agent | Генерация JSDoc | js/ts | ⏳ |
| generate-phpdoc | code-docs | agent | Генерация PHPDoc | php | ⏳ |
| generate-typedoc | code-docs | script | Генерация TypeDoc | ts | ✅ |
| detect-missing-docs | code-docs | script | Детекция отсутствующей документации | all | ✅ |
| suggest-doc-improvements | code-docs | compat_llm | Предложение улучшений документации | all | ✅ |
| generate-examples | examples | compat_llm | Генерация примеров использования | all | ✅ |
| generate-tutorials | tutorials | compat_llm | Генерация туториалов | all | ✅ |
| generate-faq | faq | compat_llm | Генерация FAQ | all | ✅ |
| generate-troubleshooting | troubleshooting | compat_llm | Генерация troubleshooting guide | all | ✅ |

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
- compat_llm: 13 (52%)
- agent: 4 (16%)
