# Требования пакета @mcp/terminal-utils

## Описание

Пакет `@mcp/terminal-utils` содержит утилиты и вспомогательные системы MCP Terminal Server - конвертация команд, система отладки, поиск, управление рабочими директориями, тестирование и библиотеки.

## Структура требований

- `requirements-utils.md` - основные требования к утилитам
- `README.md` - этот файл

## Компоненты пакета

### Утилиты

**Текущее расположение кода:**
- `mcp/CommandConverter.cjs` - конвертация команд между ОС
- `mcp/DebugSystem.cjs` - система отладки
- `mcp/SearchEngine.cjs` - система поиска
- `mcp/Workdir.cjs`, `mcp/Workdir.mjs` - управление рабочими директориями
- `mcp/TestGetter.cjs` - получение тестов
- `mcp/TestInterceptor.cjs` - перехватчик тестов
- `mcp/test/TestActivityTracker.cjs` - трекер активности тестов
- `mcp/test/TestMetrics.cjs` - метрики тестов
- `lib/archive-adapter.cjs` - адаптер архивирования
- `lib/command-executor-wrapper.cjs` - обертка выполнения команд

**Планы миграции (будущее):**
- `packages/utils/mcp-terminal-utils/src/CommandConverter.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/DebugSystem.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/SearchEngine.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/Workdir.cjs`, `src/Workdir.mjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/TestGetter.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/TestInterceptor.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/test/TestActivityTracker.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/test/TestMetrics.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/lib/archive-adapter.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/lib/command-executor-wrapper.cjs` - планируется миграция

## Зависимости

- Нет внешних зависимостей (базовый пакет утилит)

## Используется в

**Текущая структура:**
- Модули в `mcp/server/modules/` - используют утилиты
- Handlers в `handlers/` - используют утилиты
- Core Server в `mcp/server/` - использует утилиты

**Планы миграции (будущее):**
- Пакет `@mcp/terminal-server-core` - CoreServer будет использовать утилиты
- Пакет `@mcp/terminal-modules` - модули будут использовать утилиты
- Пакет `@mcp/terminal-handlers` - handlers будут использовать утилиты

## Связанные документы

- Требования к терминалу: [`docs/requirements/terminal/requirements-terminal.md`](../../../../docs/requirements/terminal/requirements-terminal.md)
- Требования к фичам: [`docs/requirements/features/requirements-features.md`](../../../../docs/requirements/features/requirements-features.md)
- Gap-файл миграции: [`docs/requirements/gap-package-migration-mcp-terminal.md`](../../../../docs/requirements/gap-package-migration-mcp-terminal.md)

