# Требования пакета @mcp/terminal-server-core

## Описание

Пакет `@mcp/terminal-server-core` содержит ядро MCP Terminal Server - основной сервер, базовые классы для модулей, систему валидации и утилиты кодирования.

## Структура требований

- `requirements-core.md` - основные требования к ядру сервера
- `README.md` - этот файл

## Компоненты пакета

### Core Server

**Текущее расположение кода:**
- `mcp/server/CoreServer.cjs` - основной сервер с модульной архитектурой (⚠️ файл отсутствует, используется mcp-server.cjs напрямую)
- `mcp/server/core/ModuleBase.cjs` - базовый класс для всех модулей
- `mcp/server/Validation.cjs` - система валидации путей и параметров
- `mcp/server/utils/encoding-utils.cjs` - утилиты для работы с кодировками

**Планы миграции (будущее):**
- `packages/core/mcp-server-core/src/CoreServer.cjs` - планируется миграция
- `packages/core/mcp-server-core/src/core/ModuleBase.cjs` - планируется миграция
- `packages/core/mcp-server-core/src/Validation.cjs` - планируется миграция
- `packages/core/mcp-server-core/src/utils/encoding-utils.cjs` - планируется миграция

## Зависимости

- `@mcp/terminal-utils` - утилиты (CommandConverter, DebugSystem, Workdir)

## Используется в

**Текущая структура:**
- Корневой проект (`mcp-server.cjs`)
- Модули в `mcp/server/modules/` - используют ModuleBase
- Handlers в `handlers/` - используют CoreServer

**Планы миграции (будущее):**
- Пакет `@mcp/terminal-modules` - модули будут использовать ModuleBase
- Пакет `@mcp/terminal-handlers` - handlers будут использовать CoreServer

## Связанные документы

- Основные требования: [`docs/requirements/core/requirements-core-foundation.md`](../../../../docs/requirements/core/requirements-core-foundation.md)
- Gap-файл миграции: [`docs/requirements/gap-package-migration-mcp-terminal.md`](../../../../docs/requirements/gap-package-migration-mcp-terminal.md)

