# Симуляция: analyze-typescript

## Описание
Анализ TypeScript кода - проверка типов, интерфейсов и общих ошибок.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "проверить TypeScript типы"

## Ожидаемое поведение
Сервер должен предложить экшен analyze-typescript с набором sub-actions для анализа TypeScript кода.

## Sub-actions
1. scan-ts-files - сканирование TypeScript файлов
2. check-types - проверка типов
3. detect-any-types - обнаружение any типов
4. analyze-generics - анализ дженериков
5. check-type-imports - проверка импортов типов
6. generate-ts-report - генерация отчёта
