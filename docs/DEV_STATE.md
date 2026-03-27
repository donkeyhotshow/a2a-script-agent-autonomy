# DEV_STATE - docs (2026-03-27)

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### Новый формат документации

Документация обновлена для отражения **нового формата протокола**:
- Action-key shape для execute/result
- Stateless A2A Server
- Keyword-based routing
- Step-based session storage
- Context fields: execution, history, workbench

---

## Структура документации

### docs/new-request-flow/ (НОВЫЙ ФОРМАТ)

| Раздел | Описание | Статус |
|--------|----------|--------|
| [PROTOCOL.md](new-request-flow/PROTOCOL.md) | Протокол (action-key shape) | ✅ Активно |
| [ARCHITECTURE.md](new-request-flow/ARCHITECTURE.md) | Архитектура системы | ✅ Активно |
| [SESSION-FLOW.md](new-request-flow/SESSION-FLOW.md) | Поток сессий | ✅ Активно |
| [SCHEMAS.md](new-request-flow/SCHEMAS.md) | JSON схемы | ✅ Активно |
| [DATA-FLOW.md](new-request-flow/DATA-FLOW.md) | Потоки данных | ✅ Активно |
| [SERVER-ARCHITECTURE.md](new-request-flow/SERVER-ARCHITECTURE.md) | Архитектура сервера | ✅ Активно |
| [ACTION-MAP.md](new-request-flow/ACTION-MAP.md) | Карта действий | ✅ Активно |
| [INTEGRATION.md](new-request-flow/INTEGRATION.md) | Интеграция | ✅ Активно |
| [WEB-UI.md](new-request-flow/WEB-UI.md) | Web UI компоненты | ✅ Активно |

### Документация проекта

| Раздел | Описание | Статус |
|--------|----------|--------|
| `docs/adr/` | Architecture Decision Records | ✅ Ведется |
| `docs/production/` | Продакшн и prod-test | ✅ Актуально |
| `proposals/` | Предложения по улучшениям | 📝 Требует обновления |
| `reports/` | Отчеты и аналитика | 📝 Требует обновления |

### Ключевые документы

#### Архитектурные решения (ADR)
- [ADR-0001: Simulations as Golden Standard](adr/ADR-0001-simulations-as-golden-standard.md)
- [AI Action Transform Pattern](new-request-flow/TRANSFORM-RUNTIME.md)
- [System Startup Guide](SYSTEM_STARTUP.md)

#### Тестирование
- [A2A Tester README](../a2a-client/tester/README.md)
- [Simulation Validation](new-request-flow/SIMULATION-VALIDATION.md)

#### Продакшн
- [Full Launch Plan](production/FULL_LAUNCH_PLAN.md)
- [Production Tests](production/PROD_TESTS.md)
- [Индекс (stub в `docs/production/`)](production/README.md)

---

## Основные изменения в документации

### 1. Протокол (PROTOCOL.md)

**Новое:**
- Action-key shape (ОБЯЗАТЕЛЬНО)
- Контекст с execution, history, workbench
- STATELESS сервер

### 2. Архитектура (ARCHITECTURE.md)

**Новое:**
- Stateless A2A Server
- Client API для хранения сессий
- Step-based storage

### 3. Схемы (SCHEMAS.md)

**Новое:**
- Server invoke request schema
- Server transform schemas
- Action-key validation

---

## Общая архитектура системы

- Репозиторий и сервисы: [`AGENTS.md`](../AGENTS.md) (порты, эндпоинты, потоки).
- Диаграммы протокола: [New request flow — ARCHITECTURE](new-request-flow/ARCHITECTURE.md).

---

## Статус обновлений

- **Последнее обновление:** 2026-03-27
- **Текущий фокус:** Синхронизация документации с кодом (новый формат)
- **Приоритет:** Обновление proposals и reports разделов
- **Примечание:** Основная документация в `docs/new-request-flow/` актуальна

---

*Обновлено: 2026-03-27*