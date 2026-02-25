# Требования пакета @mcp/terminal-modules

## Описание

Пакет `@mcp/terminal-modules` содержит все модули MCP Terminal Server - терминальные операции, атомарные операции, PowerShell команды и перехватчики.

## Структура требований

- `requirements-modules.md` - основные требования к модулям
- `README.md` - этот файл

## Компоненты пакета

### Модули

**Текущее расположение кода:**
- `mcp/server/modules/Terminal.cjs` - терминальные операции (v1.0.0)
- `mcp/server/modules/Atomic.cjs` - атомарные операции (v1.0.0)
- `mcp/server/modules/PowerShell.cjs` - PowerShell команды (v1.0.0)
- `mcp/server/modules/Interceptor.cjs` - перехватчики команд (v1.0.0)

**Планы миграции (будущее):**
- `packages/modules/mcp-terminal-modules/src/modules/Terminal.cjs` - планируется миграция
- `packages/modules/mcp-terminal-modules/src/modules/Atomic.cjs` - планируется миграция
- `packages/modules/mcp-terminal-modules/src/modules/PowerShell.cjs` - планируется миграция
- `packages/modules/mcp-terminal-modules/src/modules/Interceptor.cjs` - планируется миграция

## Зависимости

- `@mcp/terminal-server-core` - базовый класс ModuleBase
- `@mcp/terminal-utils` - утилиты (CommandConverter, DebugSystem, SearchEngine, Workdir)
- `@mcp/terminal-interceptors` - перехватчики (BaseInterceptor)

## Используется в

**Текущая структура:**
- Корневой проект (`mcp-server.cjs`) - регистрация модулей
- Handlers в `handlers/` - используют модули

**Планы миграции (будущее):**
- Пакет `@mcp/terminal-handlers` - handlers будут использовать модули

## Связанные документы

- Требования к терминалу: [`docs/requirements/terminal/requirements-terminal.md`](../../../../docs/requirements/terminal/requirements-terminal.md)
- Требования к фичам: [`docs/requirements/features/requirements-features.md`](../../../../docs/requirements/features/requirements-features.md)
- Gap-файл миграции: [`docs/requirements/gap-package-migration-mcp-terminal.md`](../../../../docs/requirements/gap-package-migration-mcp-terminal.md)

