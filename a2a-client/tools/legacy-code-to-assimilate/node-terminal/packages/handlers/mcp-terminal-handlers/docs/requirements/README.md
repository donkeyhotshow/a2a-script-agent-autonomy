# Требования пакета @mcp/terminal-handlers

## Описание

Пакет `@mcp/terminal-handlers` содержит обработчики команд MCP Terminal Server - обработчик терминальных команд, обработчик выполнения команд и обработчик списка инструментов.

## Структура требований

- `requirements-handlers.md` - основные требования к handlers
- `README.md` - этот файл

## Компоненты пакета

### Handlers

**Текущее расположение кода:**
- `handlers/terminal-handler.cjs` - обработчик терминальных команд
- `handlers/terminal-handler-core.cjs` - ядро обработчика терминала
- `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд
- `handlers/tools-list-handler.cjs` - обработчик списка инструментов

**Планы миграции (будущее):**
- `packages/handlers/mcp-terminal-handlers/src/terminal-handler.cjs` - планируется миграция
- `packages/handlers/mcp-terminal-handlers/src/run-terminal-cmd-handler.cjs` - планируется миграция
- `packages/handlers/mcp-terminal-handlers/src/tools-list-handler.cjs` - планируется миграция

## Зависимости

- `@mcp/terminal-server-core` - CoreServer для регистрации handlers
- `@mcp/terminal-modules` - модули для обработки запросов
- `@mcp/terminal-utils` - утилиты (CommandConverter, Workdir)
- `@mcp/terminal-interceptors` - перехватчики команд

## Используется в

**Текущая структура:**
- Корневой проект (`mcp-server.cjs`) - регистрация handlers

**Планы миграции (будущее):**
- Пакет `@mcp/terminal-server-core` - handlers будут регистрироваться в CoreServer

## Связанные документы

- Требования к терминалу: [`docs/requirements/terminal/requirements-terminal.md`](../../../../docs/requirements/terminal/requirements-terminal.md)
- Gap-файл миграции: [`docs/requirements/gap-package-migration-mcp-terminal.md`](../../../../docs/requirements/gap-package-migration-mcp-terminal.md)

