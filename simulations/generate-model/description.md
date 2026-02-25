# Симуляция: generate-model

## Описание
Генерация модели Order Eloquent с указанными полями и связями. Модель должна содержать поля для заказа, связи с User и OrderItem, мутаторы и scopes.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "создать модель Order с полями: id, user_id, total_amount, status, created_at, updated_at"

## Ожидаемое поведение
Сервер должен предложить экшен generate-model с subActions:
- define-model-structure - определение структуры
- create-model-file - создание файла модели
- add-user-relation - добавление связи с User
- add-order-items-relation - добавление связи с OrderItem
- add-mutators - добавление мутаторов
- add-scopes - добавление scopes

Также может быть предложен альтернативный вариант с Factory.

## Sub-actions
1. define-model-structure - определение структуры полей
2. create-model-file - создание Order.php
3. add-user-relation - belongsTo связь
4. add-order-items-relation - hasMany связь
5. add-mutators - accessor/mutator методы
6. add-scopes - scope методы

## Контекст выполнения
- Модель должна расширять Illuminate\Database\Eloquent\Model
- Поля должны быть определены в $fillable или использовать $casts
- Связи должны соответствовать схеме БД
- Status должен использовать enum cast
