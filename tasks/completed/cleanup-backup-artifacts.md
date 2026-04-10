# Задача: Удаление файлов-артефактов резервных копий

## Проблема
В репозитории остались файлы с суффиксами `.import-fix-backup` и `.comprehensive-fix-backup`, которые содержат дубликаты оригинальных файлов:
- `a2a-server/packages/server/src/request-processor/request-processor.service.ts.import-fix-backup`
- `a2a-server/packages/transform/src/operations/transform-groups.ts.import-fix-backup`
- `a2a-server/packages/services/src/utils/pipeline-observability.service.ts.import-fix-backup`
- И другие подобные файлы в `.kilo/scripts/duplicates/backups/`

## Тип
СРЕДНИЙ приоритет (MEDIUM SEVERITY)

## Решение
1. Поиск всех файлов с суффиксами `.import-fix-backup` и `.comprehensive-fix-backup`
2. Удалить все найденные файлы
3. Добавить в `.gitignore` шаблон: `*.import-fix-backup`, `*.comprehensive-fix-backup`
4. Проверить, что нет других артефактов миграции

## Ценность
- Чистая история Git
- Меньше путаницы при навигации по коду
- Легче обнаружить реальную дублированность
