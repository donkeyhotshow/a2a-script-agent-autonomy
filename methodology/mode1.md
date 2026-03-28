# Режим 1: рабочее выполнение задач

> **Цель:** обеспечивать автономное выполнение задач с минимальным вмешательством пользователя.
> **Фокус:** превращать реальные запросы из документации в конкретные задачи для агента.

## Принципы

1. Сканировать `/tasks/templates/`, `DEV_STATE.md` и другие источники на предмет актуальных работ.
2. Определить наличие задач в `/tasks/pending/`. **Если очередь пустая и нечего исполнять** — по протоколу idle (как `AGENTS.md` / `methodology/tasks.md`): подчистить чеклисты в `DEV_STATE.md`, найти новую работу, вписать задачи в `DEV_STATE` и при необходимости в `/tasks/pending/`, затем продолжить цикл.
3. Формировать описание задачи: файлы, критерии, ожидаемый результат, связанные документы.
4. Запускать `task-execute` через Client API и ждать завершения.
5. Сохранять результат в `/logs/archive/{timestamp}/` и фиксировать `traceId`.
6. Обновлять `/runtime/status.json`, добавлять запись в `/runtime/metrics.json`.
7. Если задача успешна — удалять из очереди, если нет — создавать `diagnostic` и переводить в режим 2.

## Сессии

### `task-cleanup`
- Проверка завершённых задач из `/tasks/completed/`.
- Алгоритм: получить список → сравнить фактический результат с `acceptanceCriteria` → удалить или переместить.
- API:
  ```bash
  curl http://localhost:5173/api/a2a/sessions/task-cleanup
  curl -X POST http://localhost:5173/api/a2a/sessions/{id}/next \
    -H "Content-Type: application/json" \
    -d '{"result":{"script":{"output":"task verified"}}}'
  ```
- Выполняется после каждой серии `task-execute`.

### `task-add`
- Сканируем `/tasks/templates/`, добавляем важные задачи в `/tasks/pending/{timestamp}.json`.
- Каждая задача содержит: `description`, `inputs`, `outputs`, `acceptanceCriteria`, `owner`, `priority`.
- API:
  ```bash
  curl -X POST http://localhost:5173/api/a2a/sessions/task-add \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "system",
      "task": "Найди все .md файлы и добавь задачи на проверку"
    }'
  ```

### `task-execute`
- Берём задачу из `/tasks/pending/current.json`, формируем prompt, запускаем агент.
- После ответа: логируем, сохраняем, обновляем статус.
- API:
  ```bash
  curl -X POST http://localhost:5173/api/a2a/sessions/task-execute \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "client-001",
      "task": "Прочитай файл README.md и создай оглавление"
    }'
  ```

## Task templates и метаданные

- Шаблон задачи:
  ```json
  {
    "title": "Короткое описание",
    "description": "Что сделать",
    "inputs": ["файлы", "endpoint"],
    "criteria": ["проверка CI", "обновление docs"],
    "owner": "team/author",
    "priority": "high"
  }
  ```
- Каждая задача сопровождается `source`, `createdAt`, `relatedIssues`.
- Новые задачи получают `references` — ссылки на DOCS, `runtime/status`, `logs`.

## Обработка ошибок

- Ошибка → diagnostic task:
  - `whatHappened` (факты)
  - `howItHappened` (шага)
  - `problem`
  - `hypotheses` (не менее 2)
- Название `task-diagnostic-{timestamp}` и поля `severity`, `module`, `impact`.
- Ошибки переводят работу в режим 2 до очистки `pending`.

## Наблюдаемость

- После каждого цикла:
  - `cycle_time`, `task_success_rate`, `error_rate`, `pending_queue_age` пишутся в `/runtime/metrics.json`.
  - `traceId` связывает client → server → AI.
  - Логи отправляются в `/logs/archive/{timestamp}/client` и `server`.
- При `error_rate` > 5%:
  - Поднимаем флаг и определяем `mode 2`.
  - Отправляем уведомление через `logs/archive/alerts`.

## Примеры

- Пример Рабочей задачи: `README.md` → `TOC` → `diff`.
- Пример диагностической задачи: `asyncPending` остаётся true, polling зависает на 5 минут.
- Полезно: описывать ожидания, тесты, шаги проверки и `traceId`.

## Мониторинг и сигналы

- Отслеживаем `cycle_time`, `task_success_rate`, `error_rate`, `pending_queue_age` через `/runtime/metrics.json`.
- Если `pending_queue_age` растёт > 30 минут — инициируем `task-add`.
- `task_success_rate` < 95% → заведём `diagnostic` задачу и поднимем `alert`.
- `error_rate` > 5% два цикла подряд → переключаемся в режим 2.
- Проверяем `health` сервисов (3000, 11434, 11435) перед `task-execute`.

## Чеклист перед запуском агента

1. Убедиться, что `DEV_STATE.md` актуален (facts, blockers, owners).
2. Проверить `/tasks/templates/` на подходящие шаблоны.
3. Связать задачу с документами (README, ADR, proposals).
4. Запустить `task-execute`, записать `traceId` и snapshot состояния.
5. Сохранить результат, обновить статус, запустить `task-cleanup`.

## Сценарии и примеры

- Рабочая задача: `README.md` → `TOC` → `diff` → `archive`.
- Диагностика: `asyncPending` → log → `mode2` → `pending` diagnostic.
- Очистка: `task-cleanup` после серии `task-execute`.
