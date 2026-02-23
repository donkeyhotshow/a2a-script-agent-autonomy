# Code Quality Actions Table

| actionId | categoryId | executorSystemId | title | language | canMigrateToScript |
|----------|-----------|------------------|-------|----------|-------------------|
| detect-code-smells | smells | script | Детекция code smells | all | ✅ |
| detect-long-methods | smells | script | Детекция длинных методов | all | ✅ |
| detect-large-classes | smells | script | Детекция больших классов | all | ✅ |
| detect-god-objects | smells | script | Детекция God Objects | all | ✅ |
| suggest-refactoring | refactoring | agent | Предложение рефакторинга | all | ✅ |
| apply-refactoring | refactoring | agent | Применение рефакторинга | all | ⏳ |
| detect-duplicated-code | duplication | script | Детекция дублирования кода | all | ✅ |
| suggest-extract-method | duplication | agent | Предложение extract method | all | ✅ |
| extract-method | duplication | agent | Извлечение метода | all | ⏳ |
| detect-cyclomatic-complexity | complexity | script | Детекция цикломатической сложности | all | ✅ |
| suggest-complexity-reduction | complexity | agent | Предложение снижения сложности | all | ✅ |
| detect-deep-nesting | complexity | script | Детекция глубокой вложенности | all | ✅ |
| suggest-early-returns | complexity | agent | Предложение early returns | all | ✅ |
| detect-solid-violations | principles | script | Детекция нарушений SOLID | all | ✅ |
| suggest-solid-improvements | principles | agent | Предложение улучшений SOLID | all | ✅ |
| detect-srp-violations | principles | script | Детекция нарушений SRP | all | ✅ |
| detect-ocp-violations | principles | script | Детекция нарушений OCP | all | ✅ |
| detect-design-patterns | patterns | script | Детекция design patterns | all | ✅ |
| suggest-design-patterns | patterns | agent | Предложение design patterns | all | ✅ |
| implement-design-pattern | patterns | agent | Реализация design pattern | all | ⏳ |
| detect-naming-issues | naming | script | Детекция проблем именования | all | ✅ |
| suggest-better-names | naming | agent | Предложение лучших имен | all | ✅ |
| detect-magic-numbers | naming | script | Детекция magic numbers | all | ✅ |
| suggest-constants | naming | agent | Предложение констант | all | ✅ |
| detect-comments | documentation | script | Детекция комментариев | all | ✅ |
| suggest-self-documenting-code | documentation | agent | Предложение самодокументируемого кода | all | ✅ |
| detect-missing-docblocks | documentation | script | Детекция отсутствующих docblocks | all | ✅ |
| generate-docblocks | documentation | agent | Генерация docblocks | all | ⏳ |
| detect-unused-code | cleanup | script | Детекция неиспользуемого кода | all | ✅ |
| detect-unused-imports | cleanup | script | Детекция неиспользуемых импортов | all | ✅ |
| remove-unused-code | cleanup | agent | Удаление неиспользуемого кода | all | ⏳ |
| detect-dead-code | cleanup | script | Детекция мертвого кода | all | ✅ |
| detect-technical-debt | debt | script | Детекция технического долга | all | ✅ |
| suggest-debt-reduction | debt | agent | Предложение снижения долга | all | ✅ |
| calculate-maintainability-index | metrics | script | Расчет индекса поддерживаемости | all | ✅ |
| analyze-code-metrics | metrics | script | Анализ метрик кода | all | ✅ |
| suggest-metric-improvements | metrics | agent | Предложение улучшений метрик | all | ✅ |
| detect-coupling | coupling | script | Детекция связанности | all | ✅ |
| suggest-decoupling | coupling | agent | Предложение развязки | all | ✅ |
| detect-cohesion-issues | cohesion | script | Детекция проблем связности | all | ✅ |
| suggest-cohesion-improvements | cohesion | agent | Предложение улучшений связности | all | ✅ |

## Активация по контексту

```json
{
  "php": {
    "detectors": ["**/*.php"],
    "actions": ["detect-code-smells", "detect-solid-violations"]
  },
  "typescript": {
    "detectors": ["**/*.ts"],
    "actions": ["detect-unused-imports", "detect-complexity"]
  },
  "javascript": {
    "detectors": ["**/*.js"],
    "actions": ["detect-code-smells", "suggest-refactoring"]
  }
}
```

## Статистика
- Всего: 41 действие
- script: 25 (61%)
- agent: 11 (27%)
- agent: 5 (12%)
