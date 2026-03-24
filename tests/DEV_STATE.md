# DEV_STATE - tests (2026-03-06)

## Тестовая инфраструктура

### Структура тестов

| Компонент | Расположение | Типы тестов | Статус | CLI Интеграция |
|-----------|--------------|-------------|--------|---------------|
| a2a-server | [a2a-server/tests/](a2a-server/tests/) | Unit, Integration, E2E, Simulation | ✅ Активная разработка | - |
| a2a-client | [a2a-client/tests/](a2a-client/tests/) | Unit, Integration, E2E | ✅ Активная разработка | - |
| a2a-client/packages | В каждом пакете | Unit, Functional | ✅ Активная разработка | - |
| a2a-client/tester | [a2a-client/tester/tests/](a2a-client/tester/tests/) | CLI, Integration, Automation | ✅ Готово | ✅ CLI управление |

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

### Типы тестов

#### Unit Tests (Модульные)
- **Расположение:** `tests/unit/`
- **Цель:** Тестирование отдельных функций и сервисов
- **Инструменты:** Jest, mocks
- **Статус:** ✅ Работают

#### Integration Tests (Интеграционные)
- **Расположение:** `tests/integration/`
- **Цель:** Тестирование взаимодействия компонентов
- **Инструменты:** Supertest, реальная БД
- **Статус:** ✅ Работают

#### E2E Tests (End-to-End)
- **Расположение:** `tests/e2e/`
- **Цель:** Полный цикл тестирования
- **Инструменты:** Playwright, реальные сервисы
- **Статус:** ✅ Работают

#### Simulation Tests (Симуляционные)
- **Расположение:** `tests/simulation/`
- **Цель:** Тестирование на основе симуляций (golden standard)
- **Инструменты:** Кастомные симуляции
- **Статус:** ✅ Работают

#### CLI Tests (Командная строка)
- **Расположение:** `a2a-client/tester/tests/`
- **Цель:** Автоматизированное тестирование через CLI интерфейс
- **Инструменты:** CLI команды, SSE мониторинг, автоматизация
- **Статус:** ✅ Готово к использованию
- **Команды:**
  - `node cli.js test --suite panels` - Тестирование панелей
  - `node cli.js test --suite sessions` - Тестирование сессий
  - `node cli.js test --suite commands` - Тестирование команд
  - `node cli.js test --suite performance` - Тестирование производительности
  - `node cli.js test --interactive` - Интерактивное тестирование

### Mock инфраструктура

| Тип | Расположение | Назначение |
|-----|--------------|------------|
| LLM Mocks | `tests/mocks/llm/` | Мокирование LLM ответов |
| HTTP Mocks | `tests/mocks/http/` | Мокирование HTTP запросов |
| Filesystem Mocks | `tests/mocks/filesystem/` | Виртуальная файловая система |
| Server Mocks | `tests/helpers/mock-server.ts` | Express сервер для тестирования |
| CLI Mocks | `a2a-client/tester/lib/` | Утилиты для CLI тестирования |
| SSE Mocks | `a2a-client/tester/lib/sse-client.js` | Мокирование SSE соединений |

### Статус и метрики

- **Общее покрытие:** ~85%
- **Последний запуск:** ✅ Все тесты проходят
- **CI/CD:** Интегрировано с GitHub Actions
- **CLI тестирование:** ✅ Работает, автоматизированные проверки
- **Приоритет:** Поддержание качества и скорости тестов

### CLI Тестирование

#### Доступные тест-сьюты

```bash
# Панельное тестирование
node cli.js test --suite panels
# ✓ show_panel, ✓ hide_panel, ✓ move_panel, ✓ resize_panel

# Сессионное тестирование
node cli.js test --suite sessions
# ✓ create_session, ✓ list_sessions, ✓ switch_session

# Тестирование команд
node cli.js test --suite commands
# ✓ ping, ✓ echo, ✓ command_response, ✓ error_handling

# Тестирование производительности
node cli.js test --suite performance
# ✓ latency, ✓ concurrent_commands, ✓ large_payload

# Полное тестирование
node cli.js test --interactive
# Интерактивный выбор тест-сьют для запуска
```

#### Метрики CLI тестов

- **Команды протестированы:** 15+ различных команд
- **Покрытие сценариев:** Панели, сессии, команды, производительность
- **Интеграция:** SSE, WebSocket, HTTP API
- **Автоматизация:** Полностью автоматизированные тесты