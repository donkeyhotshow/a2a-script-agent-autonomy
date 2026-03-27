# DEV_STATE - docs (2026-03-27)

Текущее состояние документации проекта.

---

## Структура

| Раздел | Описание |
|--------|----------|
| **docs/new-request-flow/** | Основная документация (протокол, архитектура, схемы) |
| **docs/adr/** | Architecture Decision Records |
| **docs/production/** | Продакшн документация |
| **docs/troubleshooting/** | Устранение проблем |

---

## Ключевые документы

### Протокол

- [PROTOCOL.md](new-request-flow/PROTOCOL.md) - Протокол (action-key shape)
- [ARCHITECTURE.md](new-request-flow/ARCHITECTURE.md) - Архитектура системы
- [SESSION-FLOW.md](new-request-flow/SESSION-FLOW.md) - Поток сессий
- [SCHEMAS.md](new-request-flow/SCHEMAS.md) - JSON схемы

### Production

- [FULL_LAUNCH_PLAN.md](../a2a-server/docs/production/FULL_LAUNCH_PLAN.md) - Полный план запуска
- [PROD_TESTS.md](../a2a-server/docs/production/PROD_TESTS.md) - Production тесты

### Тестирование

- [simulations/SCHEMA.md](../simulations/SCHEMA.md) - Симуляции (golden fixtures)
- [AGENTS.md](../AGENTS.md) - Правила работы агентов

---

## Статус

- Основная документация в целом актуальна, но есть локальные зоны дрейфа
- ADR ведется
- Production docs готовы

---

## Текущие недоработки (Docs Debt)

- [ ] Синхронизировать описание обязательности simulation-файлов между `simulations/DEV_STATE.md`, `simulations/SCHEMA.md` и фактическим поведением `sim:validate` (сейчас есть расхождение по optional transforms).
- [ ] Обновить документы action-протоколов с открытым TODO, начиная с `docs/new-request-flow/PROTOCOLS/actions/scan-directory.md` (glob/grouping/cache) и связать с текущей реализацией.
- [ ] Добавить в docs отдельное правило чтения статуса: `valid` в симуляциях не означает `clean`, если остаются contract warnings.
- [ ] Закрыть пакет TODO в action-доках: `list-directory`, `grep-search`, `file-exists`, `run-script`, `edit-patch`, `scan-directory` (либо реализовано и документировано, либо помечено как ограничение контракта).
- [ ] Проверить ссылочную целостность state-доков: если модуль указан в root (`ai-integration`), для него должен существовать актуальный `DEV_STATE.md`.

---

## Как использовать DEV_STATE файлы

- `DEV_STATE.md` (root): только кросс-модульные риски, общий roadmap, интеграционные долги.
- `<module>/DEV_STATE.md`: только модульные задачи, проверки и known issues данного модуля.
- `docs/DEV_STATE.md`: единые правила ведения документации, терминология статусов, ссылка на каноничные источники.
- `simulations/DEV_STATE.md`: только состояние golden-фикстур, warning debt, coverage план по сценариям.

## Требования ведения и чистки

- Каждый state-файл обновляется до и после сессии (кратко: что изменилось, что осталось, как проверить).
- Нельзя оставлять взаимоисключающие статусы (например, “нет проблем” при открытых debt-задачах).
- У закрытых задач должен быть верифицируемый след (команда/проверка/артефакт), иначе задача не считается закрытой.
- Раз в неделю: ревизия устаревших задач, перенос заблокированных пунктов в backlog с причиной.
- Ссылки на несуществующие файлы/модули считаются документационным дефектом и должны фикситься в первую очередь.

---

*Обновлено: 2026-03-27*