# Требования Core Foundation

## Дата создания
2025-11-29 15:07:09

## Исходный запрос пользователя
Адаптировать роль requirements-sync под проект MCP Terminal Server, заполнить новыми документами из фактов проекта, разделить на разделы, на несколько файлов для модульности.

## Улучшенная формулировка
Создать модульную структуру требований для проекта MCP Terminal Server на основе фактов из кодовой базы. Разделить требования на логические модули (core, terminal, security, testing, operations, features) для обеспечения единственного источника истины и упрощения синхронизации.

## Контекст
Проект MCP Terminal Server - это enterprise-grade сервер для безопасного выполнения команд терминала через MCP (Model Context Protocol). Проект использует модульную архитектуру, систему безопасности, автоматические подсказки и полное тестирование.

## Фаза проекта
02-foundation

## Требования
- [x] Создать структуру директорий для требований
- [x] Заполнить requirements-core-foundation.md основными требованиями
- [x] Заполнить requirements-terminal.md требованиями к терминалу
- [x] Заполнить requirements-security.md требованиями безопасности
- [x] Заполнить requirements-testing.md требованиями к тестированию
- [x] Заполнить requirements-operations.md операционными требованиями
- [x] Заполнить requirements-features.md требованиями к фичам
- [x] Создать requirements-status-tracker.md для отслеживания статуса
- [x] Адаптировать роль requirements-sync.md под проект

## Технические ограничения
- Проект использует Node.js ≥18.0.0
- TypeScript + CommonJS
- Модульная архитектура с базовым классом ModuleBase
- MCP протокол (JSON-RPC 2.0)
- Поддержка Windows, Linux, macOS

## Ожидаемый результат
Модульная структура требований с четкими границами ответственности, заполненная фактами из проекта, готовая к синхронизации через роль Requirements Sync Coordinator.

## Решение

### Summary

Core Foundation содержит основные требования к архитектуре, базовым классам, сервисам и конфигурации проекта MCP Terminal Server.

**Основные компоненты:**
- **Модульная архитектура** - проект организован в логические модули в `mcp/server/`
- Модульная архитектура сервера (`mcp/server/`)
- Базовый класс ModuleBase для модулей (`mcp/server/core/ModuleBase.cjs`)
- Система валидации и безопасности (`mcp/server/Validation.cjs`)
- Конфигурация и настройки

**Текущая структура:**
- ✅ `mcp/server/` - основной сервер и модули (CoreServer, ModuleBase, Validation, encoding-utils, 8 модулей)
- ✅ `mcp/interceptors/` - перехватчики команд (BaseInterceptor, TestCommandInterceptor)
- ✅ `mcp/` - утилиты (CommandConverter, DebugSystem, SearchEngine, Workdir, TestGetter, TestInterceptor)
- ✅ `handlers/` - обработчики команд (terminal-handler, run-terminal-cmd-handler, tools-list-handler, terminal-handler-core)
- ✅ `lib/` - библиотеки (archive-adapter, command-executor-wrapper)

**Планы миграции (будущее):**
- Пакетная архитектура в `packages/` - планируется (см. `gap-package-migration-mcp-terminal.md`)
- Требования для будущей пакетной архитектуры: `packages/*/docs/requirements/` (планируется)

### Сводный список файлов требований

| Файл | Назначение | Статус |
|------|-----------|--------|
| `core/requirements-core-foundation.md` | Главный файл Core Foundation | ✅ Создан |
| `terminal/requirements-terminal.md` | Требования к терминалу | ✅ Создан |
| `security/requirements-security.md` | Требования безопасности | ✅ Создан |
| `testing/requirements-testing.md` | Требования к тестированию | ✅ Создан |
| `operations/requirements-operations.md` | Операционные требования | ✅ Создан |
| `features/requirements-features.md` | Требования к фичам | ✅ Создан |
| `requirements-status-tracker.md` | Общий трекер статуса | ✅ Создан |

**Требования в пакетах:**
| Пакет | Файл требований | Статус |
|------|----------------|--------|
| `@mcp/terminal-server-core` (планируется) | `packages/core/mcp-server-core/docs/requirements/requirements-core.md` | ⏳ Планируется |
| `@mcp/terminal-modules` (планируется) | `packages/modules/mcp-terminal-modules/docs/requirements/requirements-modules.md` | ⏳ Планируется |
| `@mcp/terminal-handlers` (планируется) | `packages/handlers/mcp-terminal-handlers/docs/requirements/requirements-handlers.md` | ⏳ Планируется |
| `@mcp/terminal-interceptors` (планируется) | `packages/interceptors/mcp-terminal-interceptors/docs/requirements/requirements-interceptors.md` | ⏳ Планируется |
| `@mcp/terminal-utils` (планируется) | `packages/utils/mcp-terminal-utils/docs/requirements/requirements-utils.md` | ⏳ Планируется |

### Архитектура проекта

#### Модульная структура

**Основной сервер:**
- `mcp-server.cjs` - точка входа MCP сервера
- `mcp/server/CoreServer.cjs` - основной сервер с модульной архитектурой (⚠️ файл отсутствует, используется mcp-server.cjs напрямую)
- `mcp/server/core/ModuleBase.cjs` - базовый класс для модулей
- `mcp/server/Validation.cjs` - валидация путей и параметров
- `mcp/server/utils/encoding-utils.cjs` - утилиты для работы с кодировками

**Модули сервера:**
- ✅ `mcp/server/modules/Terminal.cjs` - терминальные операции (v1.0.0)
  - Выполнение команд терминала
  - Управление рабочими директориями (workspace)
  - История команд и сессий
  - Режимы выполнения (readonly)
- ✅ `mcp/server/modules/FileOperations.cjs` - файловые операции (v2.0.0)
  - Чтение, запись, копирование, перемещение файлов
  - Создание и удаление директорий
  - Проверка существования файлов
  - Метрики операций
  - Подсказки для операций
- ✅ `mcp/server/modules/Search.cjs` - поиск и правки (v1.0.0)
  - Поиск по файлам (find)
  - Замена текста (replace)
  - Grep-подобный поиск
  - Рекурсивный обход
- ✅ `mcp/server/modules/Archive.cjs` - архивирование (v2.0.0)
  - Создание архивов (ZIP, TAR)
  - Извлечение архивов
  - Просмотр содержимого
  - Поиск в архивах
  - Валидация архивов
  - Статистика и очистка
- ✅ `mcp/server/modules/Atomic.cjs` - атомарные операции (v1.0.0)
  - Предопределенные наборы операций
  - Пользовательские операции
  - Dry-run режим
  - Откат изменений
- ✅ `mcp/server/modules/PowerShell.cjs` - PowerShell команды (v1.0.0)
  - Выполнение PS команд
  - Автоматическое исправление ошибок
  - Предложения по улучшению
  - Обработка кодировок
- ✅ `mcp/server/modules/Interceptor.cjs` - перехватчики команд (v1.0.0)
  - Автоматический перехват команд
  - Оптимизация для Windows
  - Проверка безопасности
  - Метрики производительности
  - Регистрация пользовательских перехватчиков
- ✅ `mcp/server/modules/Test.cjs` - тестирование (v1.0.0)
  - Запуск unit/integration тестов
  - Покрытие кода
  - Валидация модулей
  - Очистка тестовых данных

**Handlers:**
- ✅ `handlers/terminal-handler.cjs` - обработчик терминальных команд
  - Обработка JSON-RPC запросов для терминала
  - Управление сессионными переменными (CWD, dir stack)
  - Интеграция с системой безопасности
  - Интеграция с аналитикой
- ✅ `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд
  - Выполнение команд через execa
  - Обработка таймаутов
  - Фоновый режим
- ✅ `handlers/tools-list-handler.cjs` - обработчик списка инструментов
  - Возврат списка доступных инструментов MCP
- ✅ `handlers/terminal-handler-core.cjs` - ядро обработчика терминала

**Перехватчики:**
- ✅ `mcp/interceptors/BaseInterceptor.cjs` - базовый класс для перехватчиков
  - Интерфейс: `canHandle()`, `handle()`, `getInfo()`
  - Валидация команд
  - Логирование действий
  - Приоритеты перехватчиков
- ✅ `mcp/interceptors/TestCommandInterceptor.cjs` - перехватчик тестовых команд (priority: 200)
  - Перехват команд: npm test, vitest, jest, yarn test, pnpm test
  - Интеграция с TestInterceptor
  - Рекомендации по запуску тестов

#### Базовые классы и интерфейсы

**ModuleBase:**
- `mcp/server/core/ModuleBase.cjs` - базовый класс для всех модулей
- Методы: `processRequest()`, `getTools()`
- Регистрация модулей в CoreServer

**CommandConverter:**
- `mcp/CommandConverter.cjs` - конвертация команд между ОС
- Эмуляция команд (isEmulatedCommand)
- Поддержка Windows, Linux, macOS

**Validation:**
- `mcp/server/Validation.cjs` - валидация путей (validateAndResolveCwd)
- Проверка параметров выполнения
- Валидация файловых операций

#### Общие сервисы

**DebugSystem:**
- `mcp/DebugSystem.cjs` - система отладки
- Категории отладки (DEBUG_CATEGORIES)
- Логирование отладочной информации
- Переключение версий сервера (standard/fixed)

**SearchEngine:**
- `mcp/SearchEngine.cjs` - поиск по файлам
- Grep-подобный поиск
- Рекурсивный обход

**Workdir:**
- `mcp/Workdir.cjs` - управление рабочими директориями (CommonJS)
- `mcp/Workdir.mjs` - управление рабочими директориями (ESM)
- Сессионные директории
- Валидация путей
- Виртуальная CWD с поддержкой сессий
- Приоритет: Сессионная CWD > Рабочая директория проекта > Системная CWD

**TestGetter:**
- `mcp/TestGetter.cjs` - получение информации о тестах

**TestInterceptor:**
- `mcp/TestInterceptor.cjs` - перехватчик тестовых команд

**Библиотеки:**
- `lib/archive-adapter.cjs` - адаптер для работы с архивами
- `lib/command-executor-wrapper.cjs` - обертка для выполнения команд

#### Конфигурация

**Конфигурация сервера:**
- `.cursor/mcp.json` - конфигурация MCP сервера
  - Выбор версии сервера (standard/fixed)
  - Настройки отладки
  - Настройки поведения терминала
- `package.json` - зависимости и скрипты
- Переменные окружения для настройки:
  - `LOG_LEVEL` - уровень логирования (debug, info, warn, error)
  - `MCP_TEST_MODE` - режим тестирования
  - `NODE_ENV` - окружение (development, production)
  - `MCP_USE_FIXED_VERSION` - использование исправленной версии

**Таймауты:**
- Настраиваемые таймауты выполнения команд
- Таймауты по умолчанию (120 сек)
- Фоновый режим для длительных процессов

**Логирование:**
- Уровни логирования (debug, info, warn, error)
- Логи в `logs/` директории:
  - `logs/mcp-server.log` - основные логи сервера
  - `logs/mcp-calls/` - логи вызовов MCP
  - `logs/wrapper-simple.log` - логи обертки
  - `logs/wrapper-startup.log` - логи запуска обертки
- Перехват console.log/console.error для MCP протокола
- Ротация логов (maxSize: 5MB, maxFiles: 3)
- Фильтрация JSON в stdout (только JSON-RPC ответы)

### Захардкоженные места

**Требуется вынести в конфигурацию:**
- ❓ Таймауты по умолчанию (сейчас 120 сек для терминала, 30000 мс для exec)
- ❓ Пути к логам (сейчас `logs/`)
- ❓ Максимальный размер файлов для обработки (сейчас 1MB для команд, 10MB для тестов)
- ❓ Ограничения на опасные команды
- ❓ Уровни сжатия архивов (сейчас 6)
- ❓ Максимальный размер логов (сейчас 5MB)

**Приоритет:** P1 (важно для гибкости конфигурации)

### Текущая архитектура

**Статус:** ✅ РЕАЛИЗОВАНО - код работает в текущей структуре

**Структура проекта:**
- `mcp/server/` - основной сервер и модули
  - `mcp/server/core/` - базовые классы (ModuleBase, error-core-adapter)
  - `mcp/server/modules/` - модули сервера (8 модулей: Terminal, FileOperations, Search, Archive, Atomic, PowerShell, Interceptor, Test)
  - `mcp/server/utils/` - утилиты сервера (encoding-utils)
  - `mcp/server/Validation.cjs` - валидация
- `mcp/interceptors/` - перехватчики команд (BaseInterceptor, TestCommandInterceptor)
- `mcp/` - утилиты (CommandConverter, DebugSystem, SearchEngine, Workdir, TestGetter, TestInterceptor)
- `handlers/` - обработчики команд (terminal-handler, run-terminal-cmd-handler, tools-list-handler, terminal-handler-core)
- `lib/` - библиотеки (archive-adapter, command-executor-wrapper)

**Планы миграции (будущее):**
- Gap-файл: `docs/requirements/gap-package-migration-mcp-terminal.md` - детальный план миграции на пакетную архитектуру
- Требования в пакетах: `packages/*/docs/requirements/` - требования для будущей пакетной архитектуры (планируется)

### Используется в

- `terminal/requirements-terminal.md` - базовые классы для терминала
- `security/requirements-security.md` - валидация и безопасность
- `testing/requirements-testing.md` - тестирование базовых классов
- `operations/requirements-operations.md` - конфигурация и развертывание

## Результат

Создан главный файл Core Foundation с описанием архитектуры, базовых классов, сервисов и конфигурации проекта.

## Статус
Завершено

## Связанные файлы

**Основные требования:**
- `docs/requirements/core/requirements-core-foundation.md` - создан
- `docs/requirements/README.md` - создан
- `docs/requirements/terminal/requirements-terminal.md` - создан
- `docs/requirements/security/requirements-security.md` - создан
- `docs/requirements/testing/requirements-testing.md` - создан
- `docs/requirements/operations/requirements-operations.md` - создан
- `docs/requirements/features/requirements-features.md` - создан
- `docs/requirements/requirements-status-tracker.md` - создан

**Планы миграции (будущее):**
- Требования для будущей пакетной архитектуры: `packages/*/docs/requirements/` (планируется)
- Gap-файл: `docs/requirements/gap-package-migration-mcp-terminal.md` - детальный план миграции

**Роль синхронизации:**
- `.carior/roles/requirements-sync/requirements-sync.md` - адаптирован

