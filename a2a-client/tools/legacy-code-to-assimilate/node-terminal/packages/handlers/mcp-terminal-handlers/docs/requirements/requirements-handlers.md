# Требования к пакету @mcp/terminal-handlers

## Дата создания
2025-11-29 15:55:00

## Контекст
Пакет `@mcp/terminal-handlers` содержит обработчики команд MCP Terminal Server для обработки JSON-RPC запросов и выполнения команд терминала.

## Фаза проекта
03-core

## Требования

### Handlers

#### ✅ Текущие файлы (РЕАЛИЗОВАНО в текущей структуре)

**Terminal Handler:**
- ✅ `handlers/terminal-handler.cjs` - обработчик терминальных команд (текущее расположение)
- ✅ `handlers/terminal-handler-core.cjs` - ядро обработчика терминала (текущее расположение)
- ⏳ `packages/handlers/mcp-terminal-handlers/src/terminal-handler.cjs` - планируется миграция
  - Обработка JSON-RPC запросов для терминала
  - Управление сессионными переменными (CWD, dir stack)
  - Интеграция с системой безопасности
  - Интеграция с аналитикой

**Run Terminal Cmd Handler:**
- ✅ `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд (текущее расположение)
- ⏳ `packages/handlers/mcp-terminal-handlers/src/run-terminal-cmd-handler.cjs` - планируется миграция
  - Выполнение команд через execa
  - Обработка таймаутов
  - Фоновый режим

**Tools List Handler:**
- ✅ `handlers/tools-list-handler.cjs` - обработчик списка инструментов (текущее расположение)
- ⏳ `packages/handlers/mcp-terminal-handlers/src/tools-list-handler.cjs` - планируется миграция
  - Возврат списка доступных инструментов MCP
  - Формирование схем инструментов

### Функциональность

#### Terminal Handler

**Требования:**
- [x] Обработка запросов `tools/call` с `name: "terminal"`
- [x] Поддержка действий: exec, workspace, mode, history
- [x] Управление сессионными переменными:
  - `terminal_session_cwd` - текущая сессионная директория
  - `terminal_dir_stack` - стек директорий
  - `terminal_initial_cwd` - начальная директория
  - `terminal_history_count` - счетчик истории
  - `terminal_cwd_change_tracker` - отслеживание изменений CWD
- [x] Интеграция с системой безопасности (analyzeCommand)
- [x] Интеграция с аналитикой (recordCommandMetric, recordSecurityMetric)
- [x] Валидация workspace перед выполнением команд
- [x] Конвертация команд через CommandConverter

#### Run Terminal Cmd Handler

**Требования:**
- [x] Выполнение команд через execa
- [x] Обработка таймаутов (настраиваемый, по умолчанию 120 сек)
- [x] Фоновый режим для длительных процессов
- [x] Обработка stdout/stderr
- [x] Логирование выполнения команд

#### Tools List Handler

**Требования:**
- [x] Возврат списка доступных инструментов MCP
- [x] Формирование схем инструментов (inputSchema)
- [x] Описание инструментов
- [x] Интеграция с модулями для получения их инструментов

### Интеграция

**Требования:**
- [x] Регистрация handlers в CoreServer
- [x] Использование модулей из `@mcp/terminal-modules`
- [x] Использование утилит из `@mcp/terminal-utils`
- [x] Использование перехватчиков из `@mcp/terminal-interceptors`
- [x] Интеграция с системой безопасности

### Используется в

- Корневой проект (`mcp-server.cjs`) - регистрация handlers
- MCP клиенты - использование через JSON-RPC

## Статус
✅ РЕАЛИЗОВАНО

## Связанные файлы
- `packages/handlers/mcp-terminal-handlers/src/terminal-handler.cjs` - обработчик терминала
- `packages/handlers/mcp-terminal-handlers/src/run-terminal-cmd-handler.cjs` - обработчик выполнения команд
- `packages/handlers/mcp-terminal-handlers/src/tools-list-handler.cjs` - обработчик списка инструментов

