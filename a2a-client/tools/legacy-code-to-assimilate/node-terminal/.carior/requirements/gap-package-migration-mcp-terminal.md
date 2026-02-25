# Gap: Миграция MCP Terminal Server на пакетную архитектуру

## Владелец
Requirements Sync Coordinator

## Дата создания
2025-11-29 15:45:54

## Дата обновления
2025-11-29 16:30:00

## План миграции

Миграция проекта MCP Terminal Server на пакетную архитектуру с созданием логически сгруппированных пакетов в `packages/` для улучшения модульности, переиспользования и управления зависимостями.

**Важно:** Модули FileOperations, Search, Archive и Test были удалены из проекта и не подлежат миграции.

**Контекст проекта:**
- Проект является серверным приложением (MCP Terminal Server), не веб-приложением
- Все пакеты находятся в одном репозитории через npm workspaces
- Пакеты используются только внутри проекта, не публикуются отдельно
- Нет процесса сборки (build) - код выполняется напрямую через Node.js
- Нет независимого версионирования пакетов - все пакеты в одной версии проекта (2.0.0)

**npm workspaces:**
- Встроенная поддержка в npm (начиная с версии 7+)
- Позволяет использовать локальные пакеты через их имена (например, `@mcp/terminal-utils`)
- Автоматически разрешает зависимости между пакетами
- Настраивается через секцию `workspaces` в корневом package.json

## Связанные файлы
- `mcp/server/` - модульная архитектура сервера
- `mcp/server/modules/` - модули сервера (только Terminal, Atomic, PowerShell, Interceptor)
- `handlers/` - обработчики команд
- `mcp/interceptors/` - перехватчики команд
- `mcp/` - утилиты и вспомогательные системы
- `lib/` - библиотеки
- `tests/` - тесты для миграции в пакеты
- `packages/` - целевая директория для пакетов

## Содержание

### Проблема

Текущая структура проекта монолитная, все компоненты находятся в корне проекта. Это затрудняет:
- Переиспользование компонентов в других проектах
- Независимое тестирование модулей
- Управление зависимостями
- Масштабирование проекта
- Логическую организацию кода по функциональным областям

**Важно:** Проект не является веб-приложением, поэтому:
- ❌ Нет процесса сборки (build) для пакетов
- ❌ Нет версионирования отдельных пакетов (все пакеты в одной версии проекта)
- ❌ Нет публикации пакетов в npm registry
- ❌ Нет дополнительных инструментов управления пакетами (Lerna, Nx, Turborepo) - используется только npm workspaces
- ✅ Используется npm workspaces для организации пакетов в одном репозитории

### Текущая ситуация

#### ⚠️ Удаленные модули (НЕ МИГРИРУЮТСЯ)

**Модули, которые были удалены из проекта:**
- ❌ `mcp/server/modules/FileOperations.cjs` - **УДАЛЕН**, не мигрируется
- ❌ `mcp/server/modules/Search.cjs` - **УДАЛЕН**, не мигрируется
- ❌ `mcp/server/modules/Archive.cjs` - **УДАЛЕН**, не мигрируется
- ❌ `mcp/server/modules/Test.cjs` - **УДАЛЕН**, не мигрируется

**Связанные файлы, которые также удалены:**
- ❌ `lib/archive-adapter.cjs` - **УДАЛЕН** (использовался только Archive модулем)
- ❌ Тесты для FileOperations, Search, Archive, Test модулей - **УДАЛЕНЫ**

#### Существующие файлы для миграции

**Core Server (существующие в `mcp/server/`):**
- ✅ `mcp/server/CoreServer.cjs` - основной сервер → мигрировать в `packages/mcp-server-core/src/CoreServer.cjs`
- ✅ `mcp/server/core/ModuleBase.cjs` - базовый класс для модулей → мигрировать в `packages/mcp-server-core/src/core/ModuleBase.cjs`
- ✅ `mcp/server/Validation.cjs` - валидация → мигрировать в `packages/mcp-server-core/src/Validation.cjs`
- ✅ `mcp/server/utils/encoding-utils.cjs` - утилиты кодирования → мигрировать в `packages/mcp-server-core/src/utils/encoding-utils.cjs`

**Модули сервера (существующие в `mcp/server/modules/`):**
- ✅ `mcp/server/modules/Terminal.cjs` - терминальные операции → мигрировать в `packages/mcp-terminal-modules/src/modules/Terminal.cjs`
- ✅ `mcp/server/modules/Atomic.cjs` - атомарные операции → мигрировать в `packages/mcp-terminal-modules/src/modules/Atomic.cjs`
- ✅ `mcp/server/modules/PowerShell.cjs` - PowerShell команды → мигрировать в `packages/mcp-terminal-modules/src/modules/PowerShell.cjs`
- ✅ `mcp/server/modules/Interceptor.cjs` - перехватчики команд → мигрировать в `packages/mcp-terminal-modules/src/modules/Interceptor.cjs`

**Handlers (существующие в `handlers/`):**
- ✅ `handlers/terminal-handler.cjs` - обработчик терминальных команд → мигрировать в `packages/mcp-terminal-handlers/src/terminal-handler.cjs`
- ✅ `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд → мигрировать в `packages/mcp-terminal-handlers/src/run-terminal-cmd-handler.cjs`
- ✅ `handlers/tools-list-handler.cjs` - обработчик списка инструментов → мигрировать в `packages/mcp-terminal-handlers/src/tools-list-handler.cjs`

**Перехватчики (существующие в `mcp/interceptors/`):**
- ✅ `mcp/interceptors/BaseInterceptor.cjs` - базовый класс перехватчиков → мигрировать в `packages/mcp-terminal-interceptors/src/BaseInterceptor.cjs`
- ✅ `mcp/interceptors/TestCommandInterceptor.cjs` - перехватчик тестовых команд → мигрировать в `packages/mcp-terminal-interceptors/src/TestCommandInterceptor.cjs`

**Утилиты (существующие в `mcp/`):**
- ✅ `mcp/CommandConverter.cjs` - конвертация команд → мигрировать в `packages/mcp-terminal-utils/src/CommandConverter.cjs`
- ✅ `mcp/DebugSystem.cjs` - система отладки → мигрировать в `packages/mcp-terminal-utils/src/DebugSystem.cjs`
- ✅ `mcp/SearchEngine.cjs` - система поиска → мигрировать в `packages/mcp-terminal-utils/src/SearchEngine.cjs`
- ✅ `mcp/Workdir.cjs` - управление рабочими директориями → мигрировать в `packages/mcp-terminal-utils/src/Workdir.cjs`
- ✅ `mcp/Workdir.mjs` - управление рабочими директориями (ESM) → мигрировать в `packages/mcp-terminal-utils/src/Workdir.mjs`
- ✅ `mcp/TestGetter.cjs` - получение тестов → мигрировать в `packages/mcp-terminal-utils/src/test/TestGetter.cjs`
- ✅ `mcp/TestInterceptor.cjs` - перехватчик тестов → мигрировать в `packages/mcp-terminal-utils/src/test/TestInterceptor.cjs`
- ✅ `mcp/test/TestActivityTracker.cjs` - трекер активности тестов → мигрировать в `packages/mcp-terminal-utils/src/test/TestActivityTracker.cjs`
- ✅ `mcp/test/TestMetrics.cjs` - метрики тестов → мигрировать в `packages/mcp-terminal-utils/src/test/TestMetrics.cjs`

**Библиотеки (существующие в `lib/`):**
- ✅ `lib/command-executor-wrapper.cjs` - обертка выполнения команд → мигрировать в `packages/mcp-terminal-utils/src/lib/command-executor-wrapper.cjs`

**Тесты (существующие в `tests/`):**
- ✅ `tests/unit/terminal-handler.test.cjs` - тесты терминала → мигрировать в `packages/mcp-terminal-handlers/tests/unit/terminal-handler.test.cjs`
- ✅ `tests/unit/atomic-handler.test.cjs` - тесты атомарных операций → мигрировать в `packages/mcp-terminal-modules/tests/unit/atomic-handler.test.cjs`
- ✅ `tests/unit/interceptors.test.cjs` - тесты перехватчиков → мигрировать в `packages/mcp-terminal-interceptors/tests/unit/interceptors.test.cjs`
- ✅ `tests/unit/server-core.test.cjs` - тесты ядра сервера → мигрировать в `packages/mcp-server-core/tests/unit/server-core.test.cjs`
- ✅ `tests/unit/server-modules.test.cjs` - тесты модулей → мигрировать в `packages/mcp-terminal-modules/tests/unit/server-modules.test.cjs`
- ✅ `tests/unit/command-validation.test.cjs` - тесты валидации → мигрировать в `packages/mcp-server-core/tests/unit/command-validation.test.cjs`
- ✅ `tests/unit/path-validation.test.cjs` - тесты валидации путей → мигрировать в `packages/mcp-server-core/tests/unit/path-validation.test.cjs`
- ✅ `tests/unit/config.test.cjs` - тесты конфигурации → мигрировать в `packages/mcp-server-core/tests/unit/config.test.cjs`
- ✅ `tests/unit/core-config.test.cjs` - тесты конфигурации ядра → мигрировать в `packages/mcp-server-core/tests/unit/core-config.test.cjs`
- ✅ `tests/unit/core-logger.test.cjs` - тесты логгера → мигрировать в `packages/mcp-server-core/tests/unit/core-logger.test.cjs`
- ✅ `tests/unit/mcp-core-components.test.cjs` - тесты MCP компонентов → мигрировать в соответствующие пакеты
- ✅ `tests/unit/domain-command-executor.test.cjs` - тесты выполнения команд → мигрировать в `packages/mcp-terminal-utils/tests/unit/command-executor.test.cjs`
- ✅ `tests/unit/domain-security-analyzer.test.cjs` - тесты безопасности → мигрировать в соответствующий пакет
- ✅ `tests/integration/` - интеграционные тесты → мигрировать в соответствующие пакеты в `tests/integration/`
- ✅ `tests/unit/__mocks__/` - моки → мигрировать в соответствующие пакеты в `tests/__mocks__/`

**Скрипты (существующие в `scripts/`):**
- ❓ Проверить необходимость миграции скриптов в отдельный пакет или оставить в корне проекта

#### Новые файлы для создания

**Структура пакета @mcp/terminal-server-core (создать с нуля):**
- 📝 `packages/mcp-server-core/package.json` - конфигурация npm пакета
- 📝 `packages/mcp-server-core/README.md` - документация пакета
- 📝 `packages/mcp-server-core/index.js` - точка входа пакета
- 📝 `packages/mcp-server-core/src/index.js` - экспорт основных классов
- 📝 `packages/mcp-server-core/src/types/` - TypeScript типы и декларации (.d.ts)
- 📝 `packages/mcp-server-core/docs/api/` - API документация (TypeDoc)
- 📝 `packages/mcp-server-core/docs/examples/` - примеры использования
- 📝 `packages/mcp-server-core/tests/unit/` - директория для unit тестов
- 📝 `packages/mcp-server-core/tests/integration/` - директория для интеграционных тестов
- 📝 `packages/mcp-server-core/tests/__mocks__/` - директория для моков
- 📝 `packages/mcp-server-core/jest.config.js` - конфигурация Jest для пакета
- 📝 `packages/mcp-server-core/vitest.config.js` - конфигурация Vitest для пакета (если используется)
- 📝 `packages/mcp-server-core/tsconfig.json` - конфигурация TypeScript для пакета

**Структура пакета @mcp/terminal-modules (создать с нуля):**
- 📝 `packages/mcp-terminal-modules/package.json` - конфигурация npm пакета
- 📝 `packages/mcp-terminal-modules/README.md` - документация пакета
- 📝 `packages/mcp-terminal-modules/index.js` - точка входа пакета
- 📝 `packages/mcp-terminal-modules/src/index.js` - экспорт всех модулей
- 📝 `packages/mcp-terminal-modules/src/types/` - TypeScript типы и декларации (.d.ts)
- 📝 `packages/mcp-terminal-modules/docs/api/` - API документация (TypeDoc)
- 📝 `packages/mcp-terminal-modules/docs/examples/` - примеры использования
- 📝 `packages/mcp-terminal-modules/tests/unit/` - директория для unit тестов
- 📝 `packages/mcp-terminal-modules/tests/integration/` - директория для интеграционных тестов
- 📝 `packages/mcp-terminal-modules/tests/__mocks__/` - директория для моков
- 📝 `packages/mcp-terminal-modules/jest.config.js` - конфигурация Jest для пакета
- 📝 `packages/mcp-terminal-modules/tsconfig.json` - конфигурация TypeScript для пакета

**Структура пакета @mcp/terminal-handlers (создать с нуля):**
- 📝 `packages/mcp-terminal-handlers/package.json` - конфигурация npm пакета
- 📝 `packages/mcp-terminal-handlers/README.md` - документация пакета
- 📝 `packages/mcp-terminal-handlers/index.js` - точка входа пакета
- 📝 `packages/mcp-terminal-handlers/src/index.js` - экспорт всех handlers
- 📝 `packages/mcp-terminal-handlers/src/types/` - TypeScript типы и декларации (.d.ts)
- 📝 `packages/mcp-terminal-handlers/docs/api/` - API документация (TypeDoc)
- 📝 `packages/mcp-terminal-handlers/docs/examples/` - примеры использования
- 📝 `packages/mcp-terminal-handlers/tests/unit/` - директория для unit тестов
- 📝 `packages/mcp-terminal-handlers/tests/integration/` - директория для интеграционных тестов
- 📝 `packages/mcp-terminal-handlers/tests/__mocks__/` - директория для моков
- 📝 `packages/mcp-terminal-handlers/jest.config.js` - конфигурация Jest для пакета
- 📝 `packages/mcp-terminal-handlers/tsconfig.json` - конфигурация TypeScript для пакета

**Структура пакета @mcp/terminal-interceptors (создать с нуля):**
- 📝 `packages/mcp-terminal-interceptors/package.json` - конфигурация npm пакета
- 📝 `packages/mcp-terminal-interceptors/README.md` - документация пакета
- 📝 `packages/mcp-terminal-interceptors/index.js` - точка входа пакета
- 📝 `packages/mcp-terminal-interceptors/src/index.js` - экспорт всех перехватчиков
- 📝 `packages/mcp-terminal-interceptors/src/types/` - TypeScript типы и декларации (.d.ts)
- 📝 `packages/mcp-terminal-interceptors/docs/api/` - API документация (TypeDoc)
- 📝 `packages/mcp-terminal-interceptors/docs/examples/` - примеры использования
- 📝 `packages/mcp-terminal-interceptors/tests/unit/` - директория для unit тестов
- 📝 `packages/mcp-terminal-interceptors/tests/integration/` - директория для интеграционных тестов
- 📝 `packages/mcp-terminal-interceptors/tests/__mocks__/` - директория для моков
- 📝 `packages/mcp-terminal-interceptors/jest.config.js` - конфигурация Jest для пакета
- 📝 `packages/mcp-terminal-interceptors/tsconfig.json` - конфигурация TypeScript для пакета

**Структура пакета @mcp/terminal-utils (создать с нуля):**
- 📝 `packages/mcp-terminal-utils/package.json` - конфигурация npm пакета
- 📝 `packages/mcp-terminal-utils/README.md` - документация пакета
- 📝 `packages/mcp-terminal-utils/index.js` - точка входа пакета
- 📝 `packages/mcp-terminal-utils/src/index.js` - экспорт всех утилит
- 📝 `packages/mcp-terminal-utils/src/types/` - TypeScript типы и декларации (.d.ts)
- 📝 `packages/mcp-terminal-utils/docs/api/` - API документация (TypeDoc)
- 📝 `packages/mcp-terminal-utils/docs/examples/` - примеры использования
- 📝 `packages/mcp-terminal-utils/tests/unit/` - директория для unit тестов
- 📝 `packages/mcp-terminal-utils/tests/integration/` - директория для интеграционных тестов
- 📝 `packages/mcp-terminal-utils/tests/__mocks__/` - директория для моков
- 📝 `packages/mcp-terminal-utils/jest.config.js` - конфигурация Jest для пакета
- 📝 `packages/mcp-terminal-utils/tsconfig.json` - конфигурация TypeScript для пакета

**Корневой package.json (обновить):**
- 📝 Обновить `package.json` для использования npm workspaces
- 📝 Добавить секцию `workspaces` с путями к пакетам
- 📝 Обновить скрипты тестирования для работы с workspace пакетами
- 📝 Обновить конфигурацию Jest/Vitest для работы с workspace
- 📝 НЕ добавлять процесс сборки (build) - код выполняется напрямую
- 📝 НЕ добавлять версионирование отдельных пакетов - все в одной версии проекта

#### Миграция документов требований

**Статус:** ✅ ЗАВЕРШЕНО

**Документы требований мигрированы в пакеты:**
- ✅ `docs/requirements/core/requirements-core-foundation.md` - разделы о Core Server → мигрированы в `packages/mcp-server-core/docs/requirements/requirements-core.md`
- ✅ `docs/requirements/terminal/requirements-terminal.md` - разделы о модулях → мигрированы в `packages/mcp-terminal-modules/docs/requirements/requirements-modules.md`
- ✅ `docs/requirements/features/requirements-features.md` - разделы о модулях → мигрированы в соответствующие пакеты
- ✅ Основные документы обновлены с ссылками на пакеты

**Созданные документы требований в пакетах:**
- ✅ `packages/mcp-server-core/docs/requirements/README.md` - описание структуры требований пакета
- ✅ `packages/mcp-server-core/docs/requirements/requirements-core.md` - базовые требования пакета
- ✅ `packages/mcp-terminal-modules/docs/requirements/README.md` - описание структуры требований пакета
- ✅ `packages/mcp-terminal-modules/docs/requirements/requirements-modules.md` - требования к модулям
- ✅ `packages/mcp-terminal-handlers/docs/requirements/README.md` - описание структуры требований пакета
- ✅ `packages/mcp-terminal-handlers/docs/requirements/requirements-handlers.md` - требования к handlers
- ✅ `packages/mcp-terminal-interceptors/docs/requirements/README.md` - описание структуры требований пакета
- ✅ `packages/mcp-terminal-interceptors/docs/requirements/requirements-interceptors.md` - требования к перехватчикам
- ✅ `packages/mcp-terminal-utils/docs/requirements/README.md` - описание структуры требований пакета
- ✅ `packages/mcp-terminal-utils/docs/requirements/requirements-utils.md` - требования к утилитам

### План миграции файлов

#### Этап 1: Структура пакетов

**Целевая структура:**
```
packages/
├── mcp-server-core/              # Ядро сервера
│   ├── src/
│   │   ├── CoreServer.cjs
│   │   ├── core/
│   │   │   └── ModuleBase.cjs
│   │   ├── Validation.cjs
│   │   └── utils/
│   │       └── encoding-utils.cjs
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── __mocks__/
│   ├── package.json
│   ├── README.md
│   ├── jest.config.js
│   └── docs/
│       └── requirements/
├── mcp-terminal-modules/          # Модули сервера
│   ├── src/
│   │   └── modules/
│   │       ├── Terminal.cjs
│   │       ├── Atomic.cjs
│   │       ├── PowerShell.cjs
│   │       └── Interceptor.cjs
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── __mocks__/
│   ├── package.json
│   ├── README.md
│   ├── jest.config.js
│   └── docs/
│       └── requirements/
├── mcp-terminal-handlers/        # Обработчики команд
│   ├── src/
│   │   ├── terminal-handler.cjs
│   │   ├── run-terminal-cmd-handler.cjs
│   │   └── tools-list-handler.cjs
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── __mocks__/
│   ├── package.json
│   ├── README.md
│   ├── jest.config.js
│   └── docs/
│       └── requirements/
├── mcp-terminal-interceptors/     # Перехватчики
│   ├── src/
│   │   ├── BaseInterceptor.cjs
│   │   └── TestCommandInterceptor.cjs
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── __mocks__/
│   ├── package.json
│   ├── README.md
│   ├── jest.config.js
│   └── docs/
│       └── requirements/
└── mcp-terminal-utils/           # Утилиты
    ├── src/
    │   ├── CommandConverter.cjs
    │   ├── DebugSystem.cjs
    │   ├── SearchEngine.cjs
    │   ├── Workdir.cjs
    │   ├── Workdir.mjs
    │   ├── test/
    │   │   ├── TestGetter.cjs
    │   │   ├── TestInterceptor.cjs
    │   │   ├── TestActivityTracker.cjs
    │   │   └── TestMetrics.cjs
    │   └── lib/
    │       └── command-executor-wrapper.cjs
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   └── __mocks__/
    ├── package.json
    ├── README.md
    ├── jest.config.js
    └── docs/
        └── requirements/
```

**Маппинг миграции Core Server:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `mcp/server/CoreServer.cjs` | `packages/mcp-server-core/src/CoreServer.cjs` | Мигрировать |
| `mcp/server/core/ModuleBase.cjs` | `packages/mcp-server-core/src/core/ModuleBase.cjs` | Мигрировать |
| `mcp/server/Validation.cjs` | `packages/mcp-server-core/src/Validation.cjs` | Мигрировать |
| `mcp/server/utils/encoding-utils.cjs` | `packages/mcp-server-core/src/utils/encoding-utils.cjs` | Мигрировать |

**Маппинг миграции модулей (только существующие):**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `mcp/server/modules/Terminal.cjs` | `packages/mcp-terminal-modules/src/modules/Terminal.cjs` | Мигрировать |
| `mcp/server/modules/Atomic.cjs` | `packages/mcp-terminal-modules/src/modules/Atomic.cjs` | Мигрировать |
| `mcp/server/modules/PowerShell.cjs` | `packages/mcp-terminal-modules/src/modules/PowerShell.cjs` | Мигрировать |
| `mcp/server/modules/Interceptor.cjs` | `packages/mcp-terminal-modules/src/modules/Interceptor.cjs` | Мигрировать |

**Маппинг миграции handlers:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `handlers/terminal-handler.cjs` | `packages/mcp-terminal-handlers/src/terminal-handler.cjs` | Мигрировать |
| `handlers/run-terminal-cmd-handler.cjs` | `packages/mcp-terminal-handlers/src/run-terminal-cmd-handler.cjs` | Мигрировать |
| `handlers/tools-list-handler.cjs` | `packages/mcp-terminal-handlers/src/tools-list-handler.cjs` | Мигрировать |

**Маппинг миграции перехватчиков:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `mcp/interceptors/BaseInterceptor.cjs` | `packages/mcp-terminal-interceptors/src/BaseInterceptor.cjs` | Мигрировать |
| `mcp/interceptors/TestCommandInterceptor.cjs` | `packages/mcp-terminal-interceptors/src/TestCommandInterceptor.cjs` | Мигрировать |

**Маппинг миграции утилит:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `mcp/CommandConverter.cjs` | `packages/mcp-terminal-utils/src/CommandConverter.cjs` | Мигрировать |
| `mcp/DebugSystem.cjs` | `packages/mcp-terminal-utils/src/DebugSystem.cjs` | Мигрировать |
| `mcp/SearchEngine.cjs` | `packages/mcp-terminal-utils/src/SearchEngine.cjs` | Мигрировать |
| `mcp/Workdir.cjs` | `packages/mcp-terminal-utils/src/Workdir.cjs` | Мигрировать |
| `mcp/Workdir.mjs` | `packages/mcp-terminal-utils/src/Workdir.mjs` | Мигрировать |
| `mcp/TestGetter.cjs` | `packages/mcp-terminal-utils/src/test/TestGetter.cjs` | Мигрировать |
| `mcp/TestInterceptor.cjs` | `packages/mcp-terminal-utils/src/test/TestInterceptor.cjs` | Мигрировать |
| `mcp/test/TestActivityTracker.cjs` | `packages/mcp-terminal-utils/src/test/TestActivityTracker.cjs` | Мигрировать |
| `mcp/test/TestMetrics.cjs` | `packages/mcp-terminal-utils/src/test/TestMetrics.cjs` | Мигрировать |
| `lib/command-executor-wrapper.cjs` | `packages/mcp-terminal-utils/src/lib/command-executor-wrapper.cjs` | Мигрировать |

**Маппинг миграции тестов:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `tests/unit/terminal-handler.test.cjs` | `packages/mcp-terminal-handlers/tests/unit/terminal-handler.test.cjs` | Мигрировать |
| `tests/unit/atomic-handler.test.cjs` | `packages/mcp-terminal-modules/tests/unit/atomic-handler.test.cjs` | Мигрировать |
| `tests/unit/interceptors.test.cjs` | `packages/mcp-terminal-interceptors/tests/unit/interceptors.test.cjs` | Мигрировать |
| `tests/unit/server-core.test.cjs` | `packages/mcp-server-core/tests/unit/server-core.test.cjs` | Мигрировать |
| `tests/unit/server-modules.test.cjs` | `packages/mcp-terminal-modules/tests/unit/server-modules.test.cjs` | Мигрировать |
| `tests/unit/command-validation.test.cjs` | `packages/mcp-server-core/tests/unit/command-validation.test.cjs` | Мигрировать |
| `tests/unit/path-validation.test.cjs` | `packages/mcp-server-core/tests/unit/path-validation.test.cjs` | Мигрировать |
| `tests/unit/config.test.cjs` | `packages/mcp-server-core/tests/unit/config.test.cjs` | Мигрировать |
| `tests/unit/core-config.test.cjs` | `packages/mcp-server-core/tests/unit/core-config.test.cjs` | Мигрировать |
| `tests/unit/core-logger.test.cjs` | `packages/mcp-server-core/tests/unit/core-logger.test.cjs` | Мигрировать |
| `tests/unit/domain-command-executor.test.cjs` | `packages/mcp-terminal-utils/tests/unit/command-executor.test.cjs` | Мигрировать |
| `tests/integration/` | Соответствующие пакеты в `tests/integration/` | Мигрировать |
| `tests/unit/__mocks__/` | Соответствующие пакеты в `tests/__mocks__/` | Мигрировать |

#### Этап 2: Миграция по группам

**Группа 1: Core Server (Приоритет P0)**
1. Создать структуру `packages/mcp-server-core/`
2. Мигрировать CoreServer.cjs, ModuleBase.cjs, Validation.cjs, encoding-utils.cjs
3. Создать package.json с зависимостями
4. Мигрировать тесты в `tests/unit/` и `tests/integration/`
5. Создать jest.config.js для пакета
6. Обновить импорты в корневом mcp-server.cjs

**Группа 2: Утилиты (Приоритет P0)**
1. Создать структуру `packages/mcp-terminal-utils/`
2. Мигрировать все утилиты
3. Создать package.json
4. Мигрировать тесты в `tests/unit/` и `tests/integration/`
5. Создать jest.config.js для пакета
6. Обновить зависимости в Core Server

**Группа 3: Модули (Приоритет P1)**
1. Создать структуру `packages/mcp-terminal-modules/`
2. Мигрировать только существующие модули (Terminal, Atomic, PowerShell, Interceptor)
3. Обновить зависимости на Core Server и Utils
4. Мигрировать тесты в `tests/unit/` и `tests/integration/`
5. Создать jest.config.js для пакета
6. Создать package.json

**Группа 4: Handlers (Приоритет P1)**
1. Создать структуру `packages/mcp-terminal-handlers/`
2. Мигрировать все handlers
3. Мигрировать тесты в `tests/unit/` и `tests/integration/`
4. Создать jest.config.js для пакета
5. Обновить зависимости
6. Создать package.json

**Группа 5: Перехватчики (Приоритет P2)**
1. Создать структуру `packages/mcp-terminal-interceptors/`
2. Мигрировать перехватчики
3. Мигрировать тесты в `tests/unit/` и `tests/integration/`
4. Создать jest.config.js для пакета
5. Обновить зависимости
6. Создать package.json

**Группа 6: Обновление зависимостей (Приоритет P0)**
1. Обновить все импорты в мигрированных файлах на новые пути пакетов
2. Обновить зависимости между пакетами в package.json (npm workspaces)
3. Настроить npm workspaces в корневом package.json
4. Обновить внешние зависимости (@libs/*) если необходимо
5. НЕ добавлять процесс сборки - код выполняется напрямую через Node.js
6. НЕ добавлять версионирование отдельных пакетов - все в одной версии проекта

**Группа 7: Тестирование (Приоритет P0)**
1. Обновить корневой jest.config.js для работы с npm workspaces пакетами
2. Обновить корневой vitest.config.js для работы с npm workspaces пакетами
3. Создать скрипты для запуска тестов всех пакетов
4. Обновить npm scripts в корневом package.json
5. Проверить работу всех тестов после миграции
6. НЕ добавлять E2E тесты на уровне всего проекта (если не требуется)

**Группа 8: TypeScript типы и документация (Приоритет P1)**
1. Создать TypeScript типы (.d.ts) для каждого пакета
2. Настроить TypeDoc для генерации API документации для каждого пакета (отдельно для каждого пакета)
3. Создать примеры использования для каждого пакета
4. Обновить README.md каждого пакета с примерами
5. НЕ создавать процесс сборки (build) - код выполняется напрямую через Node.js

**Группа 9: Интеграция (Приоритет P0)**
1. Обновить корневой package.json для workspace
2. Обновить все импорты в проекте
3. Обновить документацию
4. Проверить работу всего проекта

### Обновление зависимостей

#### Зависимости между пакетами (npm workspaces)

**Важно:** Все пакеты находятся в одном репозитории и используют npm workspaces для локальных зависимостей.

**@mcp/terminal-server-core:**
- Локальные зависимости (workspace): `@mcp/terminal-utils`
- Внешние зависимости: `@libs/validation`, `@libs/error-management`
- Версия: совпадает с версией проекта (2.0.0)

**@mcp/terminal-modules:**
- Локальные зависимости (workspace): `@mcp/terminal-server-core`, `@mcp/terminal-utils`, `@mcp/terminal-interceptors`
- Внешние зависимости: `@libs/system/file-operations`, `@libs/error-management`
- Версия: совпадает с версией проекта (2.0.0)

**@mcp/terminal-handlers:**
- Локальные зависимости (workspace): `@mcp/terminal-server-core`, `@mcp/terminal-modules`, `@mcp/terminal-utils`, `@mcp/terminal-interceptors`
- Внешние зависимости: `execa`, `@libs/system/*`
- Версия: совпадает с версией проекта (2.0.0)

**@mcp/terminal-interceptors:**
- Локальные зависимости (workspace): нет (базовый пакет)
- Внешние зависимости: нет
- Версия: совпадает с версией проекта (2.0.0)

**@mcp/terminal-utils:**
- Локальные зависимости (workspace): нет (базовый пакет)
- Внешние зависимости: `@libs/system/*`
- Версия: совпадает с версией проекта (2.0.0)

**Примечание:** npm workspaces позволяет использовать локальные пакеты через их имена (например, `@mcp/terminal-utils`) без необходимости публикации в npm registry. Все пакеты находятся в одном репозитории и имеют одну версию проекта.

#### Обновление импортов

**Паттерны обновления импортов (npm workspaces):**
- `require('../core/ModuleBase.cjs')` → `require('@mcp/terminal-server-core/core/ModuleBase')`
- `require('../../Validation.cjs')` → `require('@mcp/terminal-server-core/Validation')`
- `require('../CommandConverter.cjs')` → `require('@mcp/terminal-utils/CommandConverter')`
- `require('../../modules/Terminal.cjs')` → `require('@mcp/terminal-modules/modules/Terminal')`
- `require('../interceptors/BaseInterceptor.cjs')` → `require('@mcp/terminal-interceptors/BaseInterceptor')`

**Примечание:** npm workspaces автоматически разрешает локальные зависимости через их имена в package.json. Не требуется процесс сборки или публикации пакетов.

### Критерии успешной миграции

- [ ] Все файлы мигрированы в соответствующие пакеты
- [ ] Удаленные модули (FileOperations, Search, Archive, Test) не мигрированы
- [ ] Все пакеты имеют package.json с корректными зависимостями (workspace)
- [ ] Все импорты обновлены и работают
- [ ] Все тесты мигрированы в соответствующие пакеты
- [ ] Все тесты проходят успешно в каждом пакете
- [ ] Каждый пакет имеет свою конфигурацию Jest/Vitest
- [ ] TypeScript типы (.d.ts) созданы для каждого пакета
- [ ] API документация (TypeDoc) сгенерирована для каждого пакета отдельно
- [ ] Примеры использования созданы для каждого пакета
- [x] Документация обновлена
- [x] Требования мигрированы в пакеты ✅ ЗАВЕРШЕНО
- [ ] Корневой проект использует npm workspaces
- [ ] Нет дублирования кода между пакетами
- [ ] Каждый пакет может быть использован независимо (в рамках проекта)
- [ ] Тесты запускаются из корня проекта для всех пакетов
- [ ] npm workspaces корректно разрешает локальные зависимости
- [ ] Нет процесса сборки (build) - код выполняется напрямую
- [ ] Все пакеты имеют одну версию (версия проекта)

### Риски и mitigation

- **Риск:** Нарушение работы существующего кода при миграции
- **Mitigation:** Поэтапная миграция с тестированием после каждого этапа, создание бэкапов

- **Риск:** Сложность обновления импортов
- **Mitigation:** Использование автоматических инструментов для обновления импортов, проверка через линтер

- **Риск:** Проблемы с зависимостями между пакетами
- **Mitigation:** Четкое определение зависимостей, использование workspace для разработки

- **Риск:** Потеря истории Git при перемещении файлов
- **Mitigation:** Использование `git mv` для сохранения истории

- **Риск:** Проблемы с тестами после миграции
- **Mitigation:** Миграция тестов вместе с кодом, обновление путей в тестах, проверка работы тестов после каждого этапа

### Зависимости

- Node.js ≥18.0.0
- npm ≥9.0.0 (поддержка workspaces)
- Все существующие зависимости проекта
- Jest/Vitest для тестирования
- TypeScript для типов (опционально, для .d.ts файлов)
- TypeDoc для API документации (опционально)

**npm workspaces:**
- Все пакеты в одном репозитории
- npm workspaces для управления локальными зависимостями
- Все пакеты в одной версии проекта
- Нет процесса сборки - код выполняется напрямую через Node.js

### Следующие шаги

1. Создать структуру директорий пакетов
2. Начать миграцию с Core Server (P0)
3. Мигрировать утилиты (P0)
4. Мигрировать модули (P1) - только существующие (Terminal, Atomic, PowerShell, Interceptor)
5. Мигрировать handlers (P1)
6. Мигрировать перехватчики (P2)
7. Мигрировать тесты в соответствующие пакеты
8. Обновить зависимости между пакетами (npm workspaces)
9. Обновить импорты во всех файлах
10. Обновить корневой package.json для npm workspaces
11. Обновить конфигурацию тестирования
12. Проверить работу всех тестов
13. Создать TypeScript типы для каждого пакета (P1)
14. Настроить TypeDoc для генерации API документации каждого пакета (P1)
15. Создать примеры использования для каждого пакета (P1)

**Статус:** ⏳ В ПРОЦЕССЕ  
**Приоритет:** P0 (критично)  
**Оценка:** 2-3 недели  
**Объем:** ~35 файлов для миграции (без удаленных модулей)

## ✅ Миграция документов требований - ЗАВЕРШЕНО

**Документы требований мигрированы в пакеты:**

- ✅ `packages/mcp-server-core/docs/requirements/requirements-core.md` - требования к ядру сервера
- ✅ `packages/mcp-terminal-modules/docs/requirements/requirements-modules.md` - требования к модулям
- ✅ `packages/mcp-terminal-handlers/docs/requirements/requirements-handlers.md` - требования к handlers
- ✅ `packages/mcp-terminal-interceptors/docs/requirements/requirements-interceptors.md` - требования к перехватчикам
- ✅ `packages/mcp-terminal-utils/docs/requirements/requirements-utils.md` - требования к утилитам

**Основные документы обновлены:**
- ✅ `docs/requirements/core/requirements-core-foundation.md` - обновлен с ссылками на пакеты
- ✅ `docs/requirements/terminal/requirements-terminal.md` - обновлен с ссылками на пакеты
- ✅ `docs/requirements/features/requirements-features.md` - обновлен с ссылками на пакеты
- ✅ `docs/requirements/README.md` - обновлен с информацией о пакетной архитектуре

**Статус миграции требований:** ✅ ЗАВЕРШЕНО
