# Операционные требования

## Дата создания
2025-11-29 15:07:09

## Контекст
Операционные требования для развертывания, мониторинга, логирования и управления MCP Terminal Server.

## Фаза проекта
10-deployment

## Требования

### Развертывание

#### ✅ Существующие файлы (РЕАЛИЗОВАНО)

- ✅ `Dockerfile` - контейнеризация
- ✅ `package.json` - зависимости и скрипты
- ✅ `.cursor/mcp.json` - конфигурация MCP сервера
- ✅ Скрипты запуска сервера

#### ❌ Будущие файлы (ОТСУТСТВУЕТ / планируется)

- ❌ Kubernetes манифесты
- ❌ Helm charts
- ❌ CI/CD пайплайны

### Функциональность

#### Запуск сервера

**Требования:**
- [x] Запуск через `npm run server`
- [x] Фоновый запуск с логированием (`npm run server:bg`)
- [x] Запуск с timestamp в лог-файле (`npm run server:bg:timestamp`)
- [x] Остановка фонового сервера (`npm run server:stop`)
- [x] Мониторинг логов в реальном времени (`npm run server:tail`)

**Скрипты:**
- `npm run dev` - запуск в dev режиме
- `npm run start` - запуск сервера
- `npm run server` - запуск MCP сервера

#### Конфигурация

**Требования:**
- [x] Конфигурация через `.cursor/mcp.json`
- [x] Переменные окружения для настройки
- [x] Настройка таймаутов
- [x] Настройка уровней логирования
- [x] Выбор версии сервера (standard/fixed)

**Конфигурация:**
```json
{
  "terminal": {
    "debug": {
      "useFixedVersion": true
    }
  }
}
```

#### Логирование

**Требования:**
- [x] Логи в `logs/` директории
- [x] Уровни логирования (debug, info, warn, error)
- [x] Перехват console.log/console.error для MCP протокола
- [x] Логирование всех операций
- [x] Ротация логов

**Логи:**
- `logs/mcp-server.log` - основные логи
- `logs/mcp-calls/` - логи вызовов MCP
- `logs/wrapper-simple.log` - логи обертки

#### Мониторинг и метрики

**Требования:**
- [x] Метрики производительности
- [x] Метрики безопасности (recordSecurityMetric)
- [x] Метрики команд (recordCommandMetric)
- [x] Метрики сессий (recordSessionMetric)
- [x] Системные метрики (recordSystemMetric)
- [x] Метрики производительности (recordPerformanceMetric)
- [x] Экспорт метрик (exportMetrics)
- [x] Генерация отчетов (generateReport, saveReport)
- [x] Очистка метрик (cleanupMetrics)

**Скрипты:**
- `npm run mcp:diagnostics` - диагностика сервера
- `npm run mcp:monitor` - мониторинг сервера
- `npm run mcp:test` - тест мониторинга

**Мониторинг:**
- `scripts/mcp-monitor.cjs` - скрипт мониторинга
- Проверка каждые 30 секунд (checkInterval)
- Максимальный размер логов: 10MB
- Логирование в `logs/mcp-monitor.log`

#### Управление зависимостями

**Требования:**
- [x] npm зависимости в `package.json`
- [x] Версии зависимостей фиксированы
- [x] Security audit (`npm audit`)
- [x] Обновление зависимостей через отдельный цикл

**Скрипты:**
- `npm run security:audit` - проверка безопасности
- `npm run security:scan` - сканирование безопасности

#### Контейнеризация

**Требования:**
- [x] Dockerfile для контейнеризации
- [x] Сборка образа (`npm run docker:build`)
- [x] Запуск контейнера (`npm run docker:run`)

#### Wrapper система

**Требования:**
- [x] Supervising wrapper для управления сервером
- [x] Автоматический перезапуск при сбоях
- [x] Фильтрация stdout для чистого JSON-RPC
- [x] Health monitoring через heartbeat
- [x] Error Controller с классификацией ошибок
- [x] Status CLI для проверки состояния

**Файлы:**
- ✅ `scripts/wrapper/server-wrapper.cjs` - основной wrapper
- ✅ `server-wrapper-simple.cjs` - упрощенный wrapper (в корне проекта)
- ✅ `scripts/wrapper/status.cjs` - статус wrapper
- ✅ `docs/WRAPPER_COMPLETE_GUIDE.md` - полное руководство

**Логи:**
- `logs/wrapper-startup.log` - логи запуска (rolling 10MB)
- События: START, READY, RETRY, CRASH, DEGRADED

#### CI/CD интеграция

**Требования:**
- [x] Pre-commit хуки (lint-staged)
- [x] Pre-push проверки (`npm run ci`)
- [x] Автоматические тесты
- [x] Semantic release

**Скрипты:**
- `npm run ci` - полная проверка (lint, type-check, test, security)
- `npm run precommit` - pre-commit проверки

### Используется в

- `core/requirements-core-foundation.md` - конфигурация
- `terminal/requirements-terminal.md` - запуск и мониторинг
- `security/requirements-security.md` - мониторинг безопасности

## Статус
В процессе

## Новые требования

### Миграция на пакетную архитектуру

**Требование:** Мигрировать проект на пакетную архитектуру с созданием логически сгруппированных пакетов в `packages/`.

**Цель:** Улучшить модульность, переиспользование компонентов и управление зависимостями.

**Пакеты:**
- `@mcp/terminal-server-core` - ядро сервера (CoreServer, ModuleBase, Validation)
- `@mcp/terminal-modules` - модули сервера (Terminal, FileOperations, Search, Archive, Atomic, PowerShell, Interceptor, Test)
- `@mcp/terminal-handlers` - обработчики команд (terminal-handler, run-terminal-cmd-handler, tools-list-handler)
- `@mcp/terminal-interceptors` - перехватчики команд (BaseInterceptor, TestCommandInterceptor)
- `@mcp/terminal-utils` - утилиты (CommandConverter, DebugSystem, SearchEngine, Workdir, TestGetter, TestInterceptor)

**Документация миграции:**
- `docs/requirements/gap-package-migration-mcp-terminal.md` - детальный план миграции

**Статус миграции требований:** ✅ ЗАВЕРШЕНО (требования созданы для будущей архитектуры)

**Требования в пакетах (планируется):**
- `packages/core/mcp-server-core/docs/requirements/requirements-core.md` - требования для будущей пакетной архитектуры
- `packages/modules/mcp-terminal-modules/docs/requirements/requirements-modules.md` - требования для будущей пакетной архитектуры
- `packages/handlers/mcp-terminal-handlers/docs/requirements/requirements-handlers.md` - требования для будущей пакетной архитектуры
- `packages/interceptors/mcp-terminal-interceptors/docs/requirements/requirements-interceptors.md` - требования для будущей пакетной архитектуры
- `packages/utils/mcp-terminal-utils/docs/requirements/requirements-utils.md` - требования для будущей пакетной архитектуры

**Статус миграции кода:** ⏳ В ПРОЦЕССЕ (код работает в текущей структуре `mcp/`, `handlers/`, `lib/`)  
**Приоритет:** P0 (критично)  
**Оценка:** 2-3 недели

## Связанные файлы
- `package.json` - зависимости и скрипты
- `Dockerfile` - контейнеризация
- `.cursor/mcp.json` - конфигурация

