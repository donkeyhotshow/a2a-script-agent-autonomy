# DEV_STATE - scripts (2026-03-27)

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### Удалённые скрипты

Следующие скрипты были **УДАЛЕНЫ** и больше недоступны:
- ❌ `dev-launch.js` - запуск всех сервисов
- ❌ `prod-test.js` - тестирование продакшн сборки
- ❌ `orchestrator.js` - оркестрация компонентов
- ❌ `generate-action-types.js` - генератор типов
- ❌ `generate-protocol-types.js` - генератор типов протокола
- ❌ `generate-protocol-clients.js` - генератор SDK
- ❌ `inspect-dist-transform.ts` - инспекция трансформаций
- ❌ `run-dist-transform.ts` - запуск трансформаций

### Доступные скрипты

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `port-manager.js` | Управление портами сервисов | ✅ Работает |
| `wait-for-ports-free.js` | Ожидание освобождения портов | ✅ Работает |
| `start-a2a-server.bat` | Запуск A2A Server | ✅ Работает |
| `start-ai-integration.bat` | Запуск AI Integration | ✅ Работает |
| `start-client-api.bat` | Запуск Client API | ✅ Работает |
| `start-ollama.bat` | Запуск Ollama | ✅ Работает |
| `start-web-ui.bat` | Запуск Web UI | ✅ Работает |

---

## Тестирование

| Что | Где | Запуск |
|-----|-----|--------|
| **Хаб проверок по частям стека** | [scripts/direct-tests/run-checks.ps1](direct-tests/run-checks.ps1) | `.\scripts\direct-tests\run-checks.ps1 -Scope LLM \| ServerLLM \| ClientServer \| Full` |
| **Level 1–3 suite** | [scripts/tests/](tests/README.md) | `.\scripts\tests\run-all.ps1` |
| **Прямые тесты (runner'ы)** | [scripts/direct-tests/README.md](direct-tests/README.md) | RAG, SDK, AI, server sim |

Тест-скрипты `test-services-basic.ps1`, `test-web-ui.ps1`, `test-a2a-client.ps1` лежат в **scripts/tests/**; вызов через них или через `scripts/direct-tests/scripts/run-*.ps1`.

---

## Web UI Smoke Test (`tests/test-web-ui.ps1`)

PowerShell скрипт для комплексного тестирования Web UI уровня.

### Что тестирует:
- Запуск инфраструктуры (PostgreSQL + Redis через Docker)
- Health checks всех сервисов (/health endpoints)
- Запуск A2A Server (3000), Client API (3001), Vite dev server (5173)
- Открытие браузера и загрузка страницы
- Проверка SSE connectivity и real-time updates

### Параметры:
- `-Browser`: chromium/firefox/edge (default: chromium)
- `-SkipBrowser`: headless режим для CI
- `-Port`, `-ClientApiPort`, `-ServerPort`: кастомные порты

### Кто запускает:
- **Разработчики**: ручная верификация во время разработки
- **CI/CD**: автоматизированные headless запуски для регрессионного тестирования
- **QA инженеры**: полное тестирование с браузером

### Требования:
- Docker (для инфраструктуры)
- Node.js/npm окружение
- Браузер (Chromium/Chrome, Firefox, или Edge)
- PowerShell (Windows) или PowerShell Core (кросс-платформенный)

### Логи и артефакты:
- Вывод сервисов перенаправляется в `$env:TEMP\*.log`
- Автоматический сбор логов в `proxy_logs/$runId/`
- Результаты тестов сохраняются в `test-results/$runId.json`
- Временные логи очищаются после успешного сбора

---

## Тестирование (Новый формат)

### Проверка сервисов

```bash
# Тест 1: A2A Server (stateless)
curl -s http://localhost:3000/health
# Результат: {"status":"ok","mode":"stateless","version":"..."}

# Тест 2: Invoke (sync mode)
curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{"task":"Привет","sync":true}'
# Результат: {"success":true,"data":{"sync":true,"execute":{...}}}

# Тест 3: Client API
curl -s http://localhost:5173/api/a2a/projects

# Тест 4: AI Hub
curl -s http://localhost:11434/daemon/status
```

---

## Статус обновлений

- **Последнее обновление:** 2026-03-27
- **Текущее состояние:** Удалённые скрипты убраны из документации
- **Приоритет:** Поддержание актуальных скриптов

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

---

*Обновлено: 2026-03-27*