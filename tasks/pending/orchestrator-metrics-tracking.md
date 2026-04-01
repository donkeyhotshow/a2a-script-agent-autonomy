# orchestrator-metrics-tracking

## Описание
Метрики оркестратора в `runtime/metrics.json` содержат только 1 цикл от 2026-03-28 - данные не обновляются при каждом цикле. Необходимо добавить трекинг циклов оркестратора в цикле task-execute.

## Текущее состояние
- `runtime/metrics.json` содержит устаревшие данные
- Цикл оркестратора не обновляет метрики

## Критерии успеха
- [ ] Метрики обновляются после каждого выполнения задачи
- [ ] Поля: timestamp, cycleTime, taskSuccessRate, pendingQueueAge актуальны

## План
1. Добавить обновление метрик в цикл task-execute (METHODOLOGY-AGENT-SCRIPT.md mode1)
2. Проверить что runtime/metrics.json обновляется

## Выполнено (2026-04-01 15:25)
- [x] Создан скрипт `scripts/orchestrator-metrics.js`
- [x] Протестирован: `node scripts/orchestrator-metrics.js --record`
- [x] Метрики обновляются в runtime/metrics.json

## Owner
orchestrator