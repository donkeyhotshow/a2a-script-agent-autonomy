# DEV_STATE - docs (2026-03-24)

## Документация проекта

### Структура документации

| Раздел | Описание | Статус |
|--------|----------|--------|
| `new-request-flow/` | Архитектура нового протокола запросов | ✅ Активная разработка |
| `a2a-server/docs/production/` (stub: [`docs/production/README.md`](production/README.md)) | Продакшн и prod-test | ✅ Актуально |
| `proposals/` | Предложения по улучшениям компонентов | 📝 Требует обновления |
| `adr/` | Architecture Decision Records | ✅ Ведется |
| `reports/` | Отчеты и аналитика | 📝 Требует обновления |
| `processed/` | Обработанная документация | ✅ Архив |

### Ключевые документы

#### Архитектурные решения
- [ADR-0001: Simulations as Golden Standard](adr/ADR-0001-simulations-as-golden-standard.md)
- [AI Action Transform Pattern](../a2a-server/docs/AI-ACTION-TRANSFORM-PATTERN.md)
- [System Startup Guide](SYSTEM_STARTUP.md)

#### Тестирование
- [A2A Tester README](../a2a-client/tester/README.md)

#### Продакшн
- [Full Launch Plan](../a2a-server/docs/production/FULL_LAUNCH_PLAN.md)
- [Production Tests](../a2a-server/docs/production/PROD_TESTS.md)
- [Индекс (stub в `docs/production/`)](production/README.md)

### Статус обновлений

- **Последнее обновление:** 2026-03-24
- **Текущий фокус:** Синхронизация документации с кодом
- **Приоритет:** Обновление proposals и reports разделов

### Общая архитектура системы

- Репозиторий и сервисы: [`AGENTS.md`](../AGENTS.md) (порты, эндпоинты, потоки).
- Диаграммы протокола: [New request flow — ARCHITECTURE](new-request-flow/ARCHITECTURE.md).