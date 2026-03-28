# Улучшения методологии

## Метрики и KPI
> **Статус:** рекомендуется к внедрению.

| Метрика | Описание | Источник | Целевое значение |
|---------|----------|----------|------------------|
| `cycle_time` | Время одного цикла | Метапромпт | < 60 сек |
| `task_success_rate` | Процент успешно завершённых задач | `/tasks/pending/` | > 95% |
| `error_rate` | Ошибки на цикл | Логи | < 5% |
| `mode_switches` | Количество переходов режимов | `/runtime/status.json` | Минимум |
| `pending_queue_age` | Возраст старейшей задачи | `/tasks/pending/` | < 1 час |

**Реализация:**
- Генерировать `/runtime/metrics.json` после каждого цикла.
- Драйверы: status + metrics + logs доступны для дашборда.
- Если `pending_queue_age` растёт — инициировать `task-add` для балансировки.

## Роли режимов
- **Режим 1:** выполняет реальные задачи, не занимается отладкой. При ошибках создаёт диагностические `pending`.
- **Режим 2:** анализирует, фиксит, удаляет `pending` и пишет в `/logs/archive/`.
- **Режим 3:** обслуживание (лог ротация, целостность, бэкапы).

## Ретроспектива
Формат `/runtime/retrospective-{timestamp}.json`:
```
{
  "period": "2026-03-28T12:00:00Z - 2026-03-28T18:00:00Z",
  "mode_switches": [ ... ],
  "issues_encountered": [],
  "issues_resolved": [],
  "lessons_learned": [],
  "improvements_proposed": []
}
```
- Проводится после перехода из режима 2 в 1 и еженедельно.

## Краевые случаи
| Сценарий | Признак | Действие |
|----------|---------|----------|
| Диск заполнен | `/logs/archive` > X MB | Архивация/удаление |
| Ollama недоступен | `/health` fail | Retry + до 3 попыток → режим 2 |
| AI Integration недоступен | `/health` fail | Как по Ollama |
| Конфликт задач | идентичные timestamp | Добавить суффиксы |
| Повреждённый JSON | parse error | Переместить в `/tasks/failed/` |
| Таймаут сессии | >5 мин без ответа | Создать диагностику |
| Логи >10000 файлов | `zip` старые | Удалить архивные |

**Автоматическая защита:** перед каждым циклом проверять размер `/logs/archive/`, при >10000 файлов — создавать архив `oldest_{timestamp}.zip` и чистить.

## Политика хранения
| Тип данных | Максимальный возраст | Действие |
|------------|----------------------|----------|
| Runtime логи | 24 часа | Архивировать и удалять |
| Session | 7 дней | Архивировать |
| Debug | 3 дня | Удалять |
| Task результаты | 30 дней | Переместить в `/logs/archive/completed/` |

**Правило:** режим 1 при старте новой сессии очищает логи, режим 2 — только анализ.

## Политика качества кода
| Критерий | Требование | Проверка |
|----------|------------|----------|
| Полнота роутов | все endpoints реализованы | validate /api/* |
| Полнота модели | все поля редактируемы | нет hardcode |
| Обновление после апгрейда | синхронизация с предыдущей версией | diff |
| 100% покрытие | все use cases | no demo-only решения |
| Документация | всё описано | CHANGELOG.md |

### Процесс приёмки
```
ЕСЛИ задача = "реализовать фичу":
  1. Проверить что все роуты работают
  2. Проверить что все поля модели редактируемы
  3. Проверить что нет демо-патчей или временных решений
  4. Проверить документацию
  ЕСЛИ все проверки пройдены:
    → Задача завершена
  ИНАЧЕ:
    → Вернуть задачу на доработку
```

## Ретроспективы
- Каждая ретроспектива содержит: `period`, `mode_switches`, `issues_encountered`, `issues_resolved`, `lessons_learned`, `improvements_proposed`.
- Проводим при переходе из режима 2 → режим 1 или еженедельно.
- Отчёты попадают в `/runtime/retrospective-{timestamp}.json`.
- Используем их для пополнения `methodology/TODO.md`.

## Quick reference (дополнительно)
1. `curl http://localhost:5173/api/a2a/sessions -d '{"mode":"debug"}'`
2. `curl http://localhost:3000/health` — проверка A2A Server.
3. `curl http://localhost:11435/api/tags` — Ollama.
4. `curl http://localhost:5173/api/a2a/sessions/{id}/async` — асинхронный ответ.

## Автоматизация
- Добавить pre-commit hook, который проверяет `methodology/` структуру.
- Создать скрипт `scripts/check-methodology.sh` для валидации ссылок.
- В CI добавлять шаг `node scripts/validate-docs`.

## Быстрая справка
### API
```bash
curl -X POST http://localhost:5173/api/a2a/sessions -d '{"projectId":"system","mode":"work","task":"..."}'
curl http://localhost:5173/logs/archive/sessions/
curl http://localhost:5173/logs/archive/debug/
curl http://localhost:5173/api/a2a/sessions/{id}
curl http://localhost:5173/api/a2a/sessions/{id}/async
```

### Проверка сервисов
```bash
curl http://localhost:3000/health
curl http://localhost:11434/health
curl http://localhost:11435/api/tags
curl http://localhost:5173/api/a2a/projects
```
