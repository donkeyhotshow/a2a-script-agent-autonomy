# Текущие задачи и планы

## Подготовка к режиму 1
- `task-cleanup`, `task-add`, `task-execute` — основной цикл.
- Цель: поддерживать очередь в порядке, создавать и исполнять реально нужные задания.
### Задачи
| # | Задача | Статус | Примечание |
|---|--------|--------|-----------|
| 1 | Организовать тест диалога | In Progress | AI говорит «всё работает», но диалог упирается |
| 2 | Сохранение состояния страницы | Done | Скрипт выведен |
| 3 | Экспорт debug-состояния | To Do | Для анализа AI |

## Предложения по развитию
**Документы:** [proposals/](proposals/)

| Вариант | Описание | Сложность | Риск |
|---------|----------|-----------|------|
| 1 | Модульные цепочки (split schemas) | Высокая | Высокий |
| 2 | Эволюционные улучшения | Низкая | Низкий |

**Рекомендация:** выбрать вариант 2 (эволюционный подход).

Подробнее: [proposals/00-comparison/README.md](proposals/00-comparison/README.md)

## План действий (режим 2)
```
Шаг 1: Создать тест-скрипт (save-page-state.js)
        │
        ▼
Шаг 2: Выполнить на http://localhost:5173
        │
        ▼
Шаг 3: Экспортировать в logs/archive/debug/
        │
        ▼
Шаг 4: AI анализирует → находит проблему
        │
        ▼
Шаг 5: Исправить
        │
        ▼
Шаг 6: Переход в режим 1
```

## Следующие шаги
1. Сейчас: режим 2 — диагностика диалога.
2. После исправления: переход в режим 1.
3. В режиме 1: стабильная автономная работа.

## Backlog и метки
- Задачи, созданные более 14 дней назад, перемещаем в `Backlog`.
- Каждая backlog-задача содержит поля: `createdAt`, `blockerReason`, `status`.
- Метки: `Ready`, `In Progress`, `Blocked`, `Done`.
- Добавляем `owner`, `impact`, `priority`.

## Би-диагностика
- Используем `methodology/mode2.md` для диагностики, затем переписываем описание в `tasks`.
- Если задача требует внимания режима 2 — добавляем `diagnostic=true`, `relatedLogs`.
- При закрытии — пишем `results` в `/logs/archive/{timestamp}/operations.log`.

## Контрольные группы
- Разбиваем задачи по категориям: `client`, `server`, `integration`, `docs`.
- Каждая категория имеет owner, priority, target (например, `docs` → `README`, `GLOSSARY`).
- Для больших багов создаём `task-series`, объединяя подзадачи через `relatedIssues`.

## Документация и ссылки
- Храним сноски на `proposals/`, `docs/ADR-*`, `GLOSSARY.md`.
- Ссылки на `methodology/mode1.md` и `mode2.md` добавляем в каждую задачу из `tasks/pending`.
- Для важных заказов назначаем `owner` и `reviewer`, чтобы подтверждать качество.

## Координация между модулями
- `a2a-client`, `a2a-server` и `ai-integration` обмениваться статусом через `runtime/status.json`.
- `tasks/pending` служит интерфейсом между режимами 1 и 2 — изменения фиксируются в `logs`.
- Когда задача требует `ai-integration`, добавляем `integration=true` и `timeout`.
- Все перемещения задач между статусами логируются в `/logs/archive/transition.log`.

## Метрики задач
- Для каждой задачи фиксируем:
  - `createdAt`
  - `estimatedTime`
  - `actualTime`
  - `recursive attempts`
- `task_success_rate` рассчитывается как `(completed / (completed + failed))`.
- Если `actualTime` превышает `estimatedTime` более чем в 2 раза, инициируем `post-mortem`.

## Обновление списка
- Каждую неделю обновляем `tasks/README.md` с описанием очереди.
- Используем `scripts/report-tasks.js` для генерации summary.
- Добавляем `methodology/tasks.md` ссылку на `reports/` (если доступны).

## Еще один план
- Триместр: выделяем блок `maintenance` (log rotation) и `upgrade`.
- Записываем `tracking` для моделей: `Gray Room`, `health`.

## Пример готовой задачи

- `title`: «Обновить README диаграмму».
- `description`: «Проверить структуру, обновить `component map`, добавить ссылки».
- `inputs`: `README.md`, `docs/architecture.md`.
- `criteria`: `diagram updated`, `diff проверен`, `CI passed`.
- `owner`: `docs-team`.
- `priority`: `medium`.

## Распределение ресурсов
- При добавлении задачи фиксируем: estimated time, required services, risk level.
- Используем `task-add` для создания `maintenance windows` (например, log rotation).
- Запланированные `maintenance` задачи записываем как `task-maintenance`.
