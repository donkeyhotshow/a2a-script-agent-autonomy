# Симуляция: generate-crud

## Описание
Генерация полного CRUD (Create, Read, Update, Delete) для сущности User. Включает создание модели, миграции, контроллера, маршрутов и дополнительных компонентов.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "сгенерировать CRUD для сущности User"

## Ожидаемое поведение
Сервер должен предложить комплексный экшен generate-crud с набором subActions:
- generate-model - создание модели
- generate-migration - создание миграции
- generate-controller - создание контроллера
- generate-routes - создание маршрутов
- generate-requests - создание валидаторов
- generate-resource - создание API Resource

## Sub-actions
1. generate-model - создание модели User
2. generate-migration - создание миграции для таблицы users
3. generate-controller - создание UserController с CRUD методами
4. generate-routes - добавление маршрутов
5. generate-requests - создание request-валидаторов
6. generate-resource - создание API Resource

## Контекст выполнения
- При выполнении subActions сервер должен генерировать файлы на основе шаблонов
- Контроллер должен содержать стандартные методы: index, show, store, update, destroy
- Модель должна иметь связи и мутаторы при необходимости
