# DEV_STATE - scripts (2026-03-24)

## Скрипты проекта

### Тестирование

| Что | Где | Запуск |
|-----|-----|--------|
| **Хаб проверок по частям стека** | [scripts/direct-tests/run-checks.ps1](direct-tests/run-checks.ps1) | `.\scripts\direct-tests\run-checks.ps1 -Scope LLM \| ServerLLM \| ClientServer \| Full` и др. |
| **Level 1–3 suite** | [scripts/tests/](tests/README.md) | `.\scripts\tests\run-all.ps1` |
| **Прямые тесты (runner'ы)** | [scripts/direct-tests/README.md](direct-tests/README.md) | RAG, SDK, AI, server sim, test-services/test-web-ui/test-a2a-client через `direct-tests\scripts\run-*.ps1` |

Тест-скрипты `test-services-basic.ps1`, `test-web-ui.ps1`, `test-a2a-client.ps1` лежат в **scripts/tests/**; вызов через них или через `scripts/direct-tests/scripts/run-*.ps1`.

### Основные скрипты

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `dev-launch.js` | Запуск всех сервисов в dev режиме | ✅ Работает |
| `prod-test.js` | Тестирование продакшн сборки | ✅ Работает |
| `orchestrator.js` | Оркестрация компонентов | ✅ Работает |
| `port-manager.js` | Управление портами сервисов | ✅ Работает |
| `wait-for-ports-free.js` | Ожидание освобождения портов | ✅ Работает |
| `tests/test-web-ui.ps1` | Web UI smoke test: Docker infra, server/api/Vite, browser launch, SSE verification | ✅ Работает |

### Генераторы кода

| Скрипт | Выход | Статус |
|--------|--------|--------|
| `generate-action-types.js` | TypeScript типы для actions | ✅ Работает |
| `generate-protocol-types.js` | Типы протокола | ✅ Работает |
| `generate-protocol-clients.js` | Клиентские SDK | ✅ Работает |

### Инструменты разработки

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `inspect-dist-transform.ts` | Инспекция трансформаций | ✅ Работает |
| `run-dist-transform.ts` | Запуск трансформаций | ✅ Работает |

### Web UI Smoke Test (`tests/test-web-ui.ps1`)

PowerShell скрипт для комплексного тестирования Web UI уровня.

#### Что тестирует:
- Запуск инфраструктуры (PostgreSQL + Redis через Docker)
- Health checks всех сервисов (/health endpoints)
- Запуск A2A Server (3000), Client API (3001), Vite dev server (5173)
- Открытие браузера и загрузка страницы
- Проверка SSE connectivity и real-time updates

#### Параметры:
- `-Browser`: chromium/firefox/edge (default: chromium)
- `-SkipBrowser`: headless режим для CI
- `-Port`, `-ClientApiPort`, `-ServerPort`: кастомные порты

#### Кто запускает:
- **Разработчики**: ручная верификация во время разработки
- **CI/CD**: автоматизированные headless запуски для регрессионного тестирования
- **QA инженеры**: полное тестирование с браузером и ручными шагами верификации

#### Требования:
- Docker (для инфраструктуры)
- Node.js/npm окружение
- Браузер (Chromium/Chrome, Firefox, или Edge)
- PowerShell (Windows) или PowerShell Core (кросс-платформенный)

#### Логи и артефакты:
- Вывод сервисов перенаправляется в `$env:TEMP\*.log`
- Автоматический сбор логов в `proxy_logs/$runId/` по завершении
- Результаты тестов сохраняются в `test-results/$runId.json`
- Временные логи очищаются после успешного сбора

### Статус обновлений

- **Последнее обновление:** 2026-03-24
- **Текущее состояние:** Все скрипты протестированы и работают
- **Приоритет:** Автоматизация рутинных задач
- **Примечание:** Web UI smoke test полностью функционален, готов для CI интеграции

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).
