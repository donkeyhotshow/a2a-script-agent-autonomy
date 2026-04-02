# Детали реализации

## Файл `/runtime/status.json`
```json
{
  "current_mode": "work|debug|maintenance",
  "pending_tasks_count": 0,
  "last_mode_switch": "2026-03-28T12:00:00Z",
  "trigger_reason": "Описание причины последнего режима",
  "next_check": "2026-03-28T12:05:00Z",
  "override_active": false,
  "override_expires_at": null
}
```
- Используется AI Director-ом для выбора режима.
- `pending_tasks_count` вычисляется по файлам в `/tasks/pending/`.
- После каждого цикла обновляется `next_check` и `pending_tasks_count`.

## Структура папок
```
a2a-script-agent/
├── logs/
│   └── archive/
│       ├── client/
│       ├── server/
│       ├── sessions/
│       └── debug/
├── tasks/
│   ├── pending/
│   ├── completed/
│   ├── failed/
│   └── templates/
├── directions/
│   └── active_direction
├── methodology/
│   └── sessions/
└── runtime/
    ├── status.json
    ├── metrics.json
    └── retrospective-*.json
```
- `/logs/archive/` хранит клиентские, серверные и session-логи.
- `/tasks/templates/` содержит шаблоны новых заданий и критерии.
- `/runtime/metrics.json` и `/runtime/status.json` синхронизированы после каждого цикла.

## Формат `active_direction`
```json
{
  "direction": "work|debug",
  "mode": "task-cleanup|task-add|task-execute|diagnose",
  "params": {},
  "timestamp": "2026-03-28T12:00:00Z",
  "status": "active|completed"
}
```
- Записывается в `/directions/active_direction`.
- Используется для определения следующего шага в цикле.

## Лог-формат
```json
{
  "timestamp": "2026-03-28T12:00:00Z",
  "source": "client|server|ai",
  "type": "request|response|error",
  "data": {},
  "traceId": "sess_xxx_1"
}
```
- Каждое событие включается в `/logs/archive/{source}/`.
- `traceId` связывает цепочку Client → Server → AI.

## Метрики
- `/runtime/metrics.json` содержит:
  - `cycle_time`
  - `task_success_rate`
  - `error_rate`
  - `pending_queue_age`
- Метрики генерируются после каждого цикла и используются для alerting (например, `error_rate` >5% за два цикла запускает диагностику).
- `pending_queue_age` измеряет время старейшей задачи.

## Gray Room и interrupts
- Gray Room — дополнительная проверка `runtime/status` и `pending` перед отправкой запросов LLM.
- Если таймаут >5 мин, сначала проверяем Ollama + AI Hub (`/health`), потом переключаемся в режим 2.
- `interrupt` соединения перехватываются в middleware; после восстановления продолжаем текущий цикл.

## Дополнительные файлы
- `/runtime/mode1_context.json` — контекст последнего цикла до ошибки.
- `/logs/archive/{timestamp}/mode_switch.json` — история последних переключений режимов.
- `/runtime/retrospective-{timestamp}.json` — отчёт о `mode_switches`, issues, lessons.

## Health-интеграция
- Проверки `curl http://localhost:3000/health`, `curl http://localhost:11434/health`, `curl http://localhost:11435/api/tags`.
- Если один из сервисов возвращает `500` → фиксируем `health_issue` в `/logs/archive/health/{timestamp}.json`.
- Health-индикаторы влияют на метрики: `error_rate` растёт, `alert` добавляется в `runtime/metrics`.

## Ротация логов
- Перед каждым циклом считаем количество файлов в `/logs/archive/`.
- Если файлов > 10000: создаём `zip` архив `oldest_{timestamp}.zip`, удаляем оригиналы.
- Архив содержит только стабильные, проверенные записи (по `traceId`).
- После ротации пишем запись в `/logs/archive/rotation.log`, упоминаем `a2a-client` и `a2a-server`.

## Интеграция с Gray Room
- Gray Room — дополнительный слой проверки, чтобы не отправлять запросы в нестабильные сервисы.
- Логика: если `asyncPending` true > 2 мин, то удерживаем выполнение, опрашиваем Ollama, AI Hub.
- После восстановления — запускаем `task-execute` заново, добавляем `retry` count в `task` metadata.

## Monitoring и dashboards
- Метрики экспортируются в `runtime/metrics.json` и доступны внешним инструментам (Grafana, Prometheus).
- Наши KPI: `cycle_time` (target <60s), `task_success_rate` >95%, `mode_switches` minimal.
- `pending_queue_age` используется для выявления застрявших задач и запуска `task-add`.
