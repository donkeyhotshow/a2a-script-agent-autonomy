# S7: Аудит simulations/sync — README vs SCHEMA + фиктивный --path в примерах

## Проблема
- Нет единого README в `simulations/sync/`, документация разрозненная
- Примеры использования содержат фиктивный `--path`, который не работает
- Несоответствие между документацией и реальным CLI

## Связь с AGENTS.md
- Согласно AGENTS.md: "Schema debugging start point: scripts/direct-tests/README.md"
- sync-симуляции должны документироваться аналогично

## Задачи
1. Создать `simulations/sync/README.md` с актуальной документацией
2. Проверить все примеры `--path` в документации
3. Сверить с `simulations/SCHEMA.md` и `scripts/direct-tests/README.md`

## Критерий 完成
- README существует и соответствует SCHEMA
- Все `--path` примеры рабочие