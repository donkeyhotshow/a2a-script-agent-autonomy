# Депрекация правила tests-conversion и усиление scripts-and-tests-conversion для MCP Node Terminal

## Дата создания
2025-12-04 10:18:09

## Исходный запрос пользователя
@.cursor/rules/tests-conversion.mdc  - депрецировать , а @.cursor/rules/scripts-and-tests-conversion.mdc  прокачать

## Улучшенная формулировка
Обновить правила тестовой политики для MCP Node Terminal так, чтобы:
- правило `.cursor/rules/tests-conversion.mdc`, описывающее конвертацию сценариев MCP Terminal в тесты, было явно помечено как **deprecated** и указывало на более общее и актуальное правило;
- правило `.cursor/rules/scripts-and-tests-conversion.mdc` стало основным, “прокачанным” источником истины по конвертации скриптов и сценариев проверок в тесты и поддерживаемый код (CLI/утилиты), с удобным TL;DR для ревьюеров и авторов тестов.

Требования:
- [x] Пометить `.cursor/rules/tests-conversion.mdc` как deprecated:
  - [x] Обновить `description`, явно указав deprecated-статус.
  - [x] Добавить в шапку/начало файла блок с пометкой о депрекации и ссылкой на актуальное правило `.cursor/rules/scripts-and-tests-conversion.mdc`.
  - [x] Сохранить основное содержание для истории, но зафиксировать, что для новых задач нужно опираться на обновлённое правило.
- [x] Усилить `.cursor/rules/scripts-and-tests-conversion.mdc`:
  - [x] Явно указать, что оно является каноническим общим правилом для конвертации скриптов/сценариев проверок (включая MCP Terminal).
  - [x] Добавить компактный раздел TL;DR для code review / авторов тестов (что запрещено, что делать с новыми скриптами, как мигрировать старые).
  - [x] Убедиться, что между двумя файлами нет противоречий: `tests-conversion` только ссылается и уточняет исторический контекст, а все живые требования описаны в `scripts-and-tests-conversion`.

Ожидаемый результат:
- Файл `.cursor/rules/tests-conversion.mdc` явно помечен как deprecated и перенаправляет разработчиков к `.cursor/rules/scripts-and-tests-conversion.mdc`.
- Файл `.cursor/rules/scripts-and-tests-conversion.mdc` содержит:
  - чёткое позиционирование как основное правило по скриптам/тестам;
  - структурированный TL;DR для быстрых решений в ревью;
  - непротиворечивые требования, покрывающие MCP Node Terminal и MCP Terminal.

Фаза проекта:
- [ ] 01-init
- [ ] 02-foundation
- [ ] 03-core
- [ ] 04-architecture
- [ ] 05-development
- [ ] 06-documentation
- [x] 07-testing
- [ ] 08-security
- [ ] 09-optimization
- [ ] 10-deployment

## Контекст
- В репозитории уже есть два связанных правила:
  - `.cursor/rules/tests-conversion.mdc` — фокус на сценариях MCP Terminal и их переносе в `tests/`.
  - `.cursor/rules/scripts-and-tests-conversion.mdc` — более общее правило по конвертации любых временных скриптов и сценариев проверок в тесты/CLI, недавно адаптированное под MCP Node Terminal.
- Пользователь хочет:
  - сделать `scripts-and-tests-conversion.mdc` основным, более “сильным” и удобным правилом;
  - перевести `tests-conversion.mdc` в статус deprecated, чтобы не плодить дублирующиеся источники истины.

## Технические ограничения
- Нельзя удалять `tests-conversion.mdc` (он может использоваться как исторический контекст и ссылочный документ).
- Нельзя вводить конфликтующие требования между файлами; все живые и приоритетные правила должны находиться в `scripts-and-tests-conversion.mdc`.
- Изменения ограничиваются markdown-файлами в `.cursor/rules/` и задачами в `.carior/tasks/07-testing/`.

## Ожидаемый результат
- Один чёткий основной документ (`scripts-and-tests-conversion.mdc`) для всех сценариев конвертации скриптов и проверок в тесты/CLI.
- Один вспомогательный документ (`tests-conversion.mdc`), помеченный как deprecated и перенаправляющий к основному правилу.

## Решение
- [x] Прочитать текущие версии `.cursor/rules/tests-conversion.mdc` и `.cursor/rules/scripts-and-tests-conversion.mdc`.
- [x] Обновить `.cursor/rules/tests-conversion.mdc`:
  - [x] Обновить метаданные (description/alwaysApply при необходимости) и добавить заметный блок DEPRECATED с ссылкой на новое правило.
- [x] Обновить `.cursor/rules/scripts-and-tests-conversion.mdc`:
  - [x] Добавить короткий раздел TL;DR / “Быстрый чек-лист” для code review (3–5 пунктов).
  - [x] Убедиться, что в тексте явно сказано: это общее и приоритетное правило по скриптам/сценариям проверок.

## Результат
- [x] `.cursor/rules/tests-conversion.mdc` — помечен как deprecated и ссылается на `.cursor/rules/scripts-and-tests-conversion.mdc`.
- [x] `.cursor/rules/scripts-and-tests-conversion.mdc` — дополнен TL;DR и явно заявлен как каноническое правило.

## Статус
- Завершено

## Связанные файлы
- `.cursor/rules/tests-conversion.mdc` - обновлён, помечен как deprecated
- `.cursor/rules/scripts-and-tests-conversion.mdc` - обновлён, усилен и дополнен TL;DR


