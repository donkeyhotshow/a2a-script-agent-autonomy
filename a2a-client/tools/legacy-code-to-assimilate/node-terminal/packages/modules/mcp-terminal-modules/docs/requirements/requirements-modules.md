# Требования к пакету @mcp/terminal-modules

## Дата создания
2025-11-29 15:55:00

## Контекст
Пакет `@mcp/terminal-modules` содержит все модули MCP Terminal Server для выполнения различных операций через MCP протокол.

## Фаза проекта
03-core

## Требования

### Модули сервера

#### ✅ Текущие файлы (РЕАЛИЗОВАНО в текущей структуре)

**Terminal Module (v1.0.0):**
- ✅ `mcp/server/modules/Terminal.cjs` - терминальные операции (текущее расположение)
- ⏳ `packages/modules/mcp-terminal-modules/src/modules/Terminal.cjs` - планируется миграция
  - Действия: exec, history, mode, workspace
  - Выполнение команд терминала через `execAsync` (child_process)
  - Управление рабочими директориями (workspace) через `getCurrentDir`, `setCurrentDir`
  - История команд и сессий через `listSessions`, `loadSessionRecords`, `persistHistoryRecord`
  - Режимы выполнения (readonly) через `isReadonly`, `isReadonlyAllowed`
  - Поддержка таймаутов (по умолчанию 30000 мс)
  - Поддержка фонового режима (`is_background`)
  - **Отмена выполнения команд:** Поддержка отмены выполнения только для команд, запущенных в фоновом режиме (is_background: true)
  - **Потоковая передача вывода:** Потоковая передача вывода команд (streaming stdout/stderr) не поддерживается
  - **История команд с фильтрацией:** Поддержка истории команд с фильтрацией по дате/команде
  - Максимальный размер буфера: 1MB
  - Интеграция с fileSystemUtils для работы с путями


**Atomic Module (v1.0.0):**
- ✅ `mcp/server/modules/Atomic.cjs` - атомарные операции (текущее расположение)
- ⏳ `packages/modules/mcp-terminal-modules/src/modules/Atomic.cjs` - планируется миграция
  - Действия: list-sets, show-set, execute-set, execute-operations, execute-single
  - Предопределенные наборы: cleanup-temp, create-backup, migration-setup
  - Пользовательские наборы операций
  - Dry-run режим для проверки операций перед выполнением
  - Откат изменений при ошибках
  - Поддержка паттернов в путях (pattern: true)
  - Интеграция с fileSystemUtils для файловых операций

**PowerShell Module (v1.0.0):**
- ✅ `mcp/server/modules/PowerShell.cjs` - PowerShell команды (текущее расположение)
- ⏳ `packages/modules/mcp-terminal-modules/src/modules/PowerShell.cjs` - планируется миграция
  - Действия: exec, fix, suggest
  - Выполнение команд через `execAsync` с shell: 'powershell.exe'
  - Автоматическое исправление ошибок (autoFix)
  - Предложения по улучшению команд (suggestFix)
  - Обработка ошибок через createPowerShellErrorHandler
  - Таймаут по умолчанию: 30000 мс
  - Максимальный размер буфера: 1MB

**Interceptor Module (v1.0.0):**
- ✅ `mcp/server/modules/Interceptor.cjs` - перехватчики команд (текущее расположение)
- ⏳ `packages/modules/mcp-terminal-modules/src/modules/Interceptor.cjs` - планируется миграция
  - Действия: register, remove, stats, intercept
  - Встроенные перехватчики: pwd, ls, cd
  - Регистрация пользовательских перехватчиков
  - Метрики производительности
  - Интеграция с BaseInterceptor из `@mcp/terminal-interceptors`


### Функциональность

#### Общие требования к модулям

**Требования:**
- [x] Все модули наследуются от ModuleBase из `@mcp/terminal-server-core`
- [x] Каждый модуль реализует `processRequest(id, args)`
- [x] Каждый модуль предоставляет `getTools()` для MCP протокола
- [x] Единообразная обработка ошибок
- [x] Логирование всех операций
- [x] Валидация входных параметров
- [x] Версионирование модулей (каждый модуль имеет версию)
- [x] Поддержка middleware через ModuleBase (до/после processRequest)
- [x] Единообразный формат ответов модулей
- [x] Поддержка включения/выключения модулей (enabled/disabled)

**Детали реализации:**
- Каждый модуль имеет уникальное имя, версию и описание
- Модули регистрируются в CoreServer при инициализации
- Все модули используют единый интерфейс ModuleBase для обработки запросов
- Ошибки модулей обрабатываются через централизованный errorHandler
- Логирование выполняется через logger сервера
- Валидация параметров выполняется через Validation из `@mcp/terminal-server-core`

#### Интеграция

**Требования:**
- [x] Регистрация модулей в CoreServer
- [x] Использование утилит из `@mcp/terminal-utils`
- [x] Использование перехватчиков из `@mcp/terminal-interceptors`
- [x] Интеграция с handlers из `@mcp/terminal-handlers`

### Используется в

- Корневой проект (`mcp-server.cjs`) - регистрация модулей
- Пакет `@mcp/terminal-handlers` - handlers используют модули
- Тесты - тестирование модулей

## Статус
✅ РЕАЛИЗОВАНО

## Связанные файлы
- `packages/modules/mcp-terminal-modules/src/modules/Terminal.cjs` - модуль терминала
- `packages/modules/mcp-terminal-modules/src/modules/Atomic.cjs` - модуль атомарных операций
- `packages/modules/mcp-terminal-modules/src/modules/PowerShell.cjs` - модуль PowerShell
- `packages/modules/mcp-terminal-modules/src/modules/Interceptor.cjs` - модуль перехватчиков

