# Симуляция: generate-test

## Описание
Генерация unit или feature теста для Laravel/PHP класса. Создание тестового файла с тестами для всех методов контролера или модели.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "создать тест для UserController"

## Ожидаемое поведение
Сервер должен предложить экшен generate-test с набором subActions:
- analyze-target - анализ целевого класса
- generate-test - генерация тестового файла

## Sub-actions
1. **analyze-target** - анализ методов UserController
2. **generate-test** - создание тестового файла UserControllerTest

## Контекст выполнения
- При анализе целевого класса определяются все публичные методы
- Для каждого метода генерируются тестовые сценарии
- Поддерживаются feature тесты для HTTP endpoints
