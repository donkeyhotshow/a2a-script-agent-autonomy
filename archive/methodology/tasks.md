# Текущие задачи и планы

**Канон (коротко):** см. `AGENTS.md` — под таблицей Quick Reference блок **«Empty queue — mandatory»** и пункт чеклиста 5.

**Анти-паттерн (ошибка):** «Очередь пуста → можно остановиться». **Верно:** пустая очередь = **обязательный** шаг: подчистить чеклисты/DEV_STATE → найти работу → вписать задачи, затем снова обычный цикл.

**Анти-паттерн (испытания API):** «Health OK + один create/next/async → отчёт готов». **Верно:** для задач про проверку Client API, сессий или Red Room — (1) **агентская сессия** через Client API: `POST /sessions` с **`mode: "agent"`** + **`task`**, затем `/next` + poll `/async` (как в `AGENTS.md`); (2) `GET …/sessions/{id}` после async, не только ack; (3) артефакты шагов под `a2a-client/storage/sessions/{id}/` где доступно; (4) **все пять стадий Red Room** из таблицы §5 [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) либо явный список «не вышло после K лишних `/next`»; (5) **Minimal Acceptance Checklist** в конце того файла — каждый пункт или пометка N/A с причиной. **При сбоях** — добавить задачи в `tasks/pending/` и обновить `DEV_STATE`, чтобы **другие** сессии агента выполнили фикс/повторную проверку. См. [`START-PROMPT-UNLIM.md`](../START-PROMPT-UNLIM.md) → *Ручные испытания Client API* (там же: **invalid**-отчёты).

**Правило:** `tasks/pending/` пусто и нечего делать ⇒ это **не** конец работы ⇒ **сначала** чеклисты/DEV_STATE подчистить, **потом** найти и **вписать** новые задачи (ниже).

## Пустая очередь (нет задач)

Если **нечего исполнять** (`tasks/pending/` пусто, чеклисты закрыты): **не останавливаться**. Сначала **подчистить** `DEV_STATE.md` (корень и модули) от лишнего выполненного и шума, затем **найти** новую работу (код, симы, риски, бэклог) и **вписать** конкретные пункты в DEV_STATE и при необходимости в `tasks/pending/`. После этого снова обычный цикл `task-add` / `task-execute` / `task-cleanup`.

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

**В репозитории нет** каталога `methodology/proposals/` (исторические ссылки убраны из этого файла). Планирование: [`tasks/`](../tasks/) (в т.ч. [`tasks/system-improvement-priorities.md`](../tasks/system-improvement-priorities.md)), [`docs/adr/`](../docs/adr/), `DEV_STATE.md`.

| Вариант | Описание | Сложность | Риск |
|---------|----------|-----------|------|
| 1 | Модульные цепочки (split schemas) | Высокая | Высокий |
| 2 | Эволюционные улучшения | Низкая | Низкий |

**Рекомендация:** выбрать вариант 2 (эволюционный подход).

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
- Храним сноски на `tasks/`, `docs/adr/`, `GLOSSARY.md`.
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
