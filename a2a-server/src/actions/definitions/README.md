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

## Поиск

Ollama (rnj-1) ищет подходящий action по семантике description.

## Архив

Старые actions: `archive/actions-legacy/`
