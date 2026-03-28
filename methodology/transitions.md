# Переключение между режимами

**Сессии агента:** режимы work/debug ниже — про состояние системы. **Роли чата** (orchestrator vs executor) зафиксированы отдельно в `methodology/session-roles.md` и не смешиваются в одной сессии; обмен только через `tasks/`.

## Определение режима

AI Director определяет режим, анализируя `/tasks/pending/`, `/runtime/status.json` и `health` всех сервисов:

1. Если `/tasks/pending/` не пуст — автоматический переход в режим 2.
2. Если есть ошибки health (Ollama, AI Hub, A2A Server) — удерживаем режим 2 до восстановления.
3. Если очередь пуста и нет override — режим 1 выполняет задачи.
4. Явное указание `(mode=work|debug|maintenance)` в запросе блокирует автоматический выбор на 30 минут или до стабилизации очереди.

## Триггеры режима 2

- Ошибки в логах (`execute = null`, `asyncPending = true`, timeouts).
- Появление `pending` задач с тегом `diagnostic`.
- Пользователь запросил `mode=debug`.
- `runtime/metrics.json` показывает `error_rate` >5% два цикла подряд.
- Режим 1 застрял (нет прогресса три цикла, не обновляется файл, таймаут >5 мин).

## Переключение в режим 2

1. Остановить script agent (если работает).
2. Сохранить контекст: `/runtime/mode1_context.json`, последние логи, `pending` snapshot.
3. Запустить diagnostics: `mode2.md` (scrpt + export + analyze).
4. Записать `logs/archive/{timestamp}/mode_switch.json`.
5. Обновить `/runtime/status.json` (`current_mode="debug"`, `trigger_reason`, `next_check`).

## Внутренние проверки

- Проверка 1: все файлы pending либо в обработке, либо имеют новые описания.
- Проверка 2: `pending_tasks_count` отражает текущее состояние (int).
- Проверка 3: Gray Room cleared (`asyncPending` false).
- Проверка 4: health-checks pass.
- Если какая-либо проверка не пройдена → остаёмся в режиме 2, логируем предупреждение `/logs/archive/{timestamp}/warnings.json`.

## Команды для переходов

- `curl http://localhost:5173/api/a2a/sessions/{id}/next` с результатом.
- `curl http://localhost:5173/api/a2a/sessions/{id}/async` для polling.
- `curl http://localhost:3000/health`, `curl http://localhost:11434/health`, `curl http://localhost:11435/api/tags` для проверки сервисов.
- При возвращении в режим 1 запускаем `task-cleanup`, `task-add`, затем `task-execute`.
- При уходе в режим 3 запускаем maintenance scripts (`logs rotate`, `backup`, `integrity check`).

## Режим 1 возвращается, когда

1. Все задачи, вызвавшие режим 2, либо решены, либо обновлены.
2. `/tasks/pending/` пуст, `pending_tasks_count=0`.
3. `runtime/status.json` обновлён; `current_mode="work"`, `trigger_reason` описан.
4. Второй цикл подтверждает стабильность (нет новых ошибок, timeout не превышает порог).
5. Публикуем пост-релиз: `logs/archive/{timestamp}/mode_switch.json`, `runtime/retrospective-{timestamp}.json`.

## Роли режимов

- **Режим 1:** основной исполнитель — исполняет задачи, логирует результат, не инициирует сложные обследования.
- **Режим 2:** отладка и балансировка — читает логи, фиксит, очищает очередь.
- **Режим 3 (обслуживание):** выполняет ротацию логов, целостность файлов, бэкапы; запускается вручную или по порогу.

## Диагностика переходов

- При каждой ошибке фиксируем `trigger_reason`, `traceId`, `open issues`.
- Включаем `issues_encountered`, `issues_resolved` в `runtime/retrospective`.
- Если переход блокируется — добавляем `warnings.json` и уведомляем операцию (например, Slack, `AGENTS.md`).
- Отчёт должен включать: `mode switch`, `issues`, `lessons learned`, `improvements`.

## Поддержка администрирования

- Документируем команды для ручного переключения в `docs/procedures`.
- Автоматизируем health-check pipeline: `curl health` → `log` → `metrics`.
- Проверяем `runtime/metrics.json` после каждого переключения.

## Пример логики

```
if pending > 0 and current_mode == work:
    switch_to_mode2()
elif health_fails and current_mode != debug:
    log_warning()
    switch_to_mode2()
elif pending == 0 and current_mode == debug:
    verify_checks()
    switch_to_mode1()
```

## Как реагировать на override

- Override `mode=debug` активируется через API и помечается в `/runtime/status.json`.
- Override остаётся активным минимум 30 минут или пока проблемы не решены.
- При override логируем `override_active=true`, `override_expires_at`.

## Ручные процедуры

- Для ручного переключения используем `scripts/switch-mode.{ps1,sh}`:
  1. Сохраняются `pending` и текущий `status`.
  2. Запускается diagnostics, если требуется.
  3. Обновляется `mode switch log`.
- `override_active` остаётся `true` до выполнения checklist.

## Контроль качества переходов

- После каждого перехода проверяем `/runtime/metrics.json`, `/logs/archive/*`.
- Добавляем запись в `/logs/archive/{timestamp}/mode_switch_summary.txt`.
- При нестабильности предыдущего перехода Gray Room удерживает system до следующего цикла.

## Документация

- Обновляем `docs/procedures/` после каждого изменения логики.
- Регистрируем новые команды в `AGENTS.md`.
---
*Этот файл содержится в 100-150 строках, чтобы дополнять `methodology/INDEX.md` и не разрастаться.* 
