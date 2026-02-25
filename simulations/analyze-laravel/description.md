# Симуляция: analyze-laravel

## Описание
Анализ Laravel кода - проверка моделей, контроллеров, миграций, роутов и сервис-провайдеров.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "проанализировать Laravel код"

## Ожидаемое поведение
Сервер должен предложить экшен analyze-laravel с набором sub-actions для анализа Laravel кода.

## Sub-actions
1. scan-php-files - сканирование PHP файлов
2. analyze-models - анализ Eloquent моделей
3. analyze-controllers - анализ контроллеров
4. analyze-migrations - анализ миграций
5. analyze-routes - анализ роутов
6. analyze-providers - анализ сервис-провайдеров
7. analyze-middleware - анализ middleware
8. generate-laravel-report - генерация отчёта
