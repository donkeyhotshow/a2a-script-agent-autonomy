# Симуляция: analyze-vue

## Описание
Анализ Vue компонентов - проверка структуры, props, emits, composition API и стилей.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "проанализировать Vue компоненты"

## Ожидаемое поведение
Сервер должен предложить экшен analyze-vue с набором sub-actions для анализа Vue компонентов.

## Sub-actions
1. scan-vue-files - сканирование Vue файлов
2. analyze-vue-props - анализ props
3. analyze-vue-emits - анализ emits
4. analyze-composition-api - анализ Composition API
5. analyze-vue-templates - анализ шаблонов
6. analyze-vue-styles - анализ стилизации
7. generate-vue-report - генерация отчёта
