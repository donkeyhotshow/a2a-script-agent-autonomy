# Actions - Новая система

## Концепция

Actions - это человекопонятные сжатые инструкции для интерпретации системой через ollama (rnj-1).

Action - это НЕ код, а текстовое описание.

## Структура

```yaml
action_id: "глагол-объект"
description: "Краткое описание"
context: "Контекст"
steps: "Шаги"
```

## Каталоги (по плану actions-definitions-for-auto-ai)

- **context/** — context-scan, context-index, context-query, context-rank, context-format
- **analysis/** — analyze-full, analyze-performance, analyze-security, analyze, analyze-test, analyze-typescript,
  analyze-laravel, analyze-vue
- **graph/** — graph-build, graph-query, graph-impact, graph-extract-entities, graph-extract-relations, graph-visualize
- **generation/** — generate-crud, generate-model, generate-controller, generate-method, generate-migration,
  generate-view, generate-test
- **hybrid/** — hybrid-fix, hybrid-refactor, hybrid-improve, hybrid-explain
- **fallback/** — ai-fallback, ai-analyze, ai-generate
- корень — fix-vue-imports*, auto-ai-index.ts

## Формат MD

Каждый action: заголовок `# action-id`, описание, `## Priority`, опционально `## Context` (JSON), `## Triggers`,
`## Sub-actions` с Input/Output и примером кода.

## Поиск

Ollama (rnj-1) ищет подходящий action по семантике description. Индекс категорий: `auto-ai-index.ts`.

## Планы и код

| Что                                  | Где                                                                                                                                                                                                                                                                              |
|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| План definitions (Auto-AI)           | [plans/actions-definitions-for-auto-ai.md](../../../../plans/actions-definitions-for-auto-ai.md)                                                                                                                                                                                 |
| План итераций action                 | [plans/action-iteration-system.md](../../../../plans/action-iteration-system.md)                                                                                                                                                                                                 |
| План миграции actions                | [plans/migration-action-system.md](../../../../plans/migration-action-system.md)                                                                                                                                                                                                 |
| План апгрейда actions                | [plans/action-upgrade-plan.md](../../../../plans/action-upgrade-plan.md)                                                                                                                                                                                                         |
| fix-vue-imports (batch/alternatives) | [plans/later/fix-vue-imports-batch.md](../../../../plans/later/fix-vue-imports-batch.md), [fix-vue-imports-improvements.md](../../../../plans/later/fix-vue-imports-improvements.md), [fix-vue-imports-alternatives.md](../../../../plans/later/fix-vue-imports-alternatives.md) |
| Загрузка MD                          | [action-registry.ts](../action-registry.ts)                                                                                                                                                                                                                                      |
| Парсинг MD                           | [action-parser.ts](../action-parser.ts)                                                                                                                                                                                                                                          |
| Экспорт + Auto-AI индекс             | [actions/index.ts](../index.ts), [definitions/auto-ai-index.ts](auto-ai-index.ts)                                                                                                                                                                                                |
| Сервис выполнения                    | [action-service.ts](../action-service.ts)                                                                                                                                                                                                                                        |
