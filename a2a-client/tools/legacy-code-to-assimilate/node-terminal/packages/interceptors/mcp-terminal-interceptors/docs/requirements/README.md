# Требования пакета @mcp/terminal-interceptors

## Описание

Пакет `@mcp/terminal-interceptors` содержит перехватчики команд MCP Terminal Server - базовый класс для перехватчиков и перехватчик тестовых команд.

## Структура требований

- `requirements-interceptors.md` - основные требования к перехватчикам
- `README.md` - этот файл

## Компоненты пакета

### Перехватчики

**Текущее расположение кода:**
- `mcp/interceptors/BaseInterceptor.cjs` - базовый класс для перехватчиков
- `mcp/interceptors/TestCommandInterceptor.cjs` - перехватчик тестовых команд (priority: 200)

**Планы миграции (будущее):**
- `packages/interceptors/mcp-terminal-interceptors/src/BaseInterceptor.cjs` - планируется миграция
- `packages/interceptors/mcp-terminal-interceptors/src/TestCommandInterceptor.cjs` - планируется миграция

## Зависимости

- Нет внешних зависимостей (базовый пакет)

## Используется в

**Текущая структура:**
- Модуль `mcp/server/modules/Interceptor.cjs` - использует BaseInterceptor
- Handlers в `handlers/` - используют перехватчики

**Планы миграции (будущее):**
- Пакет `@mcp/terminal-modules` - модуль Interceptor будет использовать BaseInterceptor
- Пакет `@mcp/terminal-handlers` - handlers будут использовать перехватчики

## Связанные документы

- Gap-файл миграции: [`docs/requirements/gap-package-migration-mcp-terminal.md`](../../../../docs/requirements/gap-package-migration-mcp-terminal.md)

