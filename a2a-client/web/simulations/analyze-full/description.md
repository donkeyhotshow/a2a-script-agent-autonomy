# Симуляция: analyze-full

## Описание
Полный анализ кодовой базы - комплексное сканирование и анализ всего проекта.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "проанализировать кодовую базу"

## Ожидаемое поведение
Сервер должен предложить набор analyze-* экшенов для полного анализа кодовой базы:
- analyze-full (сканирование структуры)
- analyze-architecture (архитектурный анализ)
- analyze-typescript (анализ TypeScript)
- analyze-vue (анализ Vue компонентов)
- analyze-laravel (анализ Laravel кода)

## Sub-actions
1. scan-structure - сканирование структуры проекта
2. analyze-dependencies - анализ зависимостей
3. detect-languages - определение языков
4. generate-report - генерация отчё
