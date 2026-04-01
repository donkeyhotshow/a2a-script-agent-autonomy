# S10: agent/ без description.md + дрейф роутера vs router-static-choices.json

## Проблема 1: agent/ без description.md
- В директории `simulations/sync/agent/` отсутствует файл `description.md`
- Нет документации для этой симуляции

## Проблема 2: Дрейф роутера
- Роутер в симуляциях может отличаться от `shared/router-static-choices.json`
- Несоответствие между статическим конфигом и фактическими данными

## Критерий 完成
- `description.md` создан для всех симуляций
- Роутер соответствует статическому конфигу