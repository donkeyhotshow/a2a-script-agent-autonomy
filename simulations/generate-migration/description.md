# Симуляция: generate-migration

## Описание
Генерация миграции для создания или модификации таблицы users. Миграция должна содержать все необходимые поля, индексы и внешние ключи.

## Тип экшена
`action_proposal`

## Входные данные
- action: `task_request`
- task: "создать миграцию для таблицы users"

## Ожидаемое поведение
Сервер должен предложить экшен generate-migration с subActions:
- define-table-structure - определение структуры таблицы
- create-migration-file - создание файла миграции
- add-indexes - добавление индексов
- add-foreign-keys - добавление внешних ключей

Также могут быть предложены альтернативные варианты: базовая миграция или ALTER миграция.

## Sub-actions
1. define-table-structure - определение структуры полей
2. create-migration-file - создание файла миграции
3. add-indexes - добавление индексов
4. add-foreign-keys - добавление foreign key constraints

## Контекст выполнения
- Миграция должна использовать Schema::create() для новой таблицы
- Стандартные поля Laravel: id (bigIncrements), timestamps (created_at, updated_at)
- Для users: name, email, password, remember_token, email_verified_at
- Индексы для email (уникальный) и часто запрашиваемых полей
