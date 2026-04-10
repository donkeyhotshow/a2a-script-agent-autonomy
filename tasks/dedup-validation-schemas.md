# Задача: Дедупликация схем валидации

## Проблема
Схемы валидации дублируются в нескольких местах:
- `a2a-server/packages/server-utils/src/validation.ts` (строки 1-160)
- `.kilo/scripts/duplicates/backups/packages/server-utils/src/lib/validation.ts` (резервная копия)

## Дублирующиеся схемы
- `uuidSchema`
- `emailSchema`
- `passwordSchema`
- `gitUrlSchema`
- `branchNameSchema`
- `filePathSchema`
- `paginationSchema`

## Тип
СРЕДНИЙ приоритет (MEDIUM SEVERITY)

## Решение
1. Убедиться, что все схемы определены в одном месте: `a2a-server/packages/server-utils/src/validation.ts`
2. Экспортировать все схемы из единого модуля
3. Удалить все резервные копии схем из папки `.kilo/scripts/duplicates/`
4. Обновить импорты в зависимых пакетах для импорта из единого источника

## Ценность
- Единая версия истины для валидационных правил
- Упрощение обновления требований валидации
- Меньше потенциальных несоответствий между версиями
