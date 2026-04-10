# Задача: Дедупликация функций валидатора артефактов

## Проблема
Функция `validateArtifact()` дублируется в нескольких местах:
- `a2a-server/packages/server-utils/src/artifact-validator.ts` (строка 31 - активный код)
- `.kilo/scripts/duplicates/backups/final-1775839775762/a2a-server/packages/server/src/artifact-validator.ts` (резервная копия)

## Дублирующиеся функции
- `validateArtifact()` - основная функция валидации артефактов

## Тип
СРЕДНИЙ приоритет (MEDIUM SEVERITY)

## Решение
1. Убедиться, что `validateArtifact()` определена в `a2a-server/packages/server-utils/src/artifact-validator.ts`
2. Удалить все копии из папки `.kilo/scripts/duplicates/backups/`
3. Обновить все импорты для использования единого источника
4. Добавить тесты для функции `validateArtifact()` если их нет

## Ценность
- Единая реализация валидации артефактов
- Проще исправлять ошибки валидации
- Уменьшение техдолга
