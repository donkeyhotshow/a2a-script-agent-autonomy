# Требования к Terminal

## Дата создания
2025-11-29 15:07:09

## Контекст
Терминальный модуль - основная функциональность MCP Terminal Server для выполнения команд терминала с поддержкой различных ОС, управления рабочими директориями и истории команд.

## Фаза проекта
03-core

## Требования

### Выполнение команд терминала

#### ✅ Существующие файлы (РЕАЛИЗОВАНО)

**Handlers:**
- ✅ `handlers/terminal-handler.cjs` - основной обработчик терминальных команд
- ✅ `handlers/terminal-handler-core.cjs` - ядро обработчика терминала
- ✅ `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд
- ✅ `handlers/tools-list-handler.cjs` - обработчик списка инструментов

**Модули:**
- ✅ `mcp/server/modules/Terminal.cjs` - модуль терминальных операций

**Утилиты:**
- ✅ `mcp/CommandConverter.cjs` - конвертация команд между ОС
- ✅ `mcp/Workdir.cjs`, `mcp/Workdir.mjs` - управление рабочими директориями
- ✅ `lib/command-executor-wrapper.cjs` - обертка для выполнения команд

#### ❌ Будущие файлы (ОТСУТСТВУЕТ / планируется)

- ❌ Background manager для управления фоновыми процессами (см. `docs/requirements/features/requirements-background-process-management.md`)
- ❌ Улучшенная система управления сессиями

### Функциональность

#### Выполнение команд

**Требования:**
- [x] Выполнение команд терминала через JSON-RPC
- [x] Поддержка таймаутов (настраиваемый, по умолчанию 120 сек)
- [x] Фоновый режим для длительных процессов (`is_background: true`)
- [ ] Чтение начального вывода при запуске в фоне (`readInitialOutput: true`, `initialOutputDelay`)
- [ ] Управление фоновыми процессами (список, статус, логи, остановка, завершение) - см. `requirements-background-process-management.md`
- [x] Автоматическое определение ОС (Windows, Linux, macOS)
- [x] Конвертация команд между ОС через CommandConverter
- [x] Эмуляция команд (isEmulatedCommand) для кроссплатформенности

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "terminal",
    "arguments": {
      "command": "ваша команда",
      "timeout": 120,
      "is_background": false,
      "cwd": "/path/to/workdir"
    }
  }
}
```

#### Управление рабочими директориями (Workspace)

**Требования:**
- [x] Установка рабочей директории через `workspace set`
- [x] Валидация путей рабочей директории
- [x] Сессионные директории для изоляции
- [x] Автоматическое переключение на рабочую директорию проекта
- [x] Виртуальная CWD с поддержкой сессий
- [x] Приоритет директорий: Сессионная CWD > Рабочая директория проекта > Системная CWD
- [x] Управление стеком директорий (pushd/popd)

**Формат:**
```json
{
  "action": "workspace",
  "subAction": "set",
  "command": "C:/apps/root/mcp/node-terminal"
}
```

**Сессионные переменные:**
- `terminal_session_cwd` - текущая сессионная директория
- `terminal_dir_stack` - стек директорий
- `terminal_initial_cwd` - начальная директория
- `terminal_history_count` - счетчик истории
- `terminal_cwd_change_tracker` - отслеживание изменений CWD

#### История команд

**Требования:**
- [x] Сохранение истории команд в `history/sessions/`
- [x] Уникальные идентификаторы сессий
- [x] Загрузка истории сессий
- [x] Экспорт истории команд
- [x] Статистика по командам
- [x] CLI для работы с историей
- [x] Валидация структуры глобальной истории через отдельный тест (`test-global-history.cjs`)
- [x] Наличие в глобальной истории примеров сложных команд ( с `;` и `&&`), отражающих реальные сценарии использования

**Файлы:**
- ✅ `history/sessions/{session-id}/` - директории сессий
- ✅ `history/CURRENT` - текущая активная сессия
- ✅ `data/global-history/commands.jsonl` - глобальная история команд

**Инварианты глобальной истории (`data/global-history/commands.jsonl`):**
- [x] Каждая запись истории является корректным JSON-объектом
- [x] Обязательные поля записи: `id`, `timestamp`, `tool`, `command`, `cwd`, `sessionId`, `success`, `duration`
- [x] `timestamp` парсится в валидную дату
- [x] Для успешных команд (`success=true`) код выхода не больше 0
- [x] Для неуспешных команд (`success=false`) присутствует текст ошибки в `stderr` или `error`
- [x] В истории присутствуют команды с несколькими выражениями (например, `cd ...; node ...`, `cd ... && node ...`)
- [x] Нарушение любого инварианта приводит к падению теста `test-global-history.cjs`

**CLI команды:**
- `npm run test:history` - работа с историей
- `npm run test:history:show` - показать историю
- `npm run test:history:stats` - статистика
- `npm run test:history:search` - поиск
- `npm run test:history:export` - экспорт
- `npm run test:history:cleanup` - очистка

#### Модульная архитектура

**Требования:**
- [x] Структурированные действия (workspace, mode, history)
- [x] Расширяемая система модулей через ModuleBase
- [x] Регистрация модулей в CoreServer
- [x] Изоляция функциональности по модулям

**Модули:**
- ✅ `mcp/server/modules/Terminal.cjs` - терминальные операции (v1.0.0)
  - Действия: exec, history, mode, workspace
  - Поддержка readonly режима
  - Интеграция с сессиями и историей
- ✅ `mcp/server/modules/FileOperations.cjs` - файловые операции (v2.0.0)
  - Действия: list, read, write, copy, move, delete, exists, info, mkdir, rmdir
  - Метрики операций
  - Подсказки для операций
- ✅ `mcp/server/modules/Search.cjs` - поиск (v1.0.0)
  - Действия: find, replace, grep
  - Рекурсивный поиск
  - Dry-run режим для replace
- ✅ `mcp/server/modules/Archive.cjs` - архивирование (v2.0.0)
  - Действия: create, extract, list, info, search, validate, statistics, cleanup
  - Поддержка ZIP, TAR
  - Статистика и валидация
- ✅ `mcp/server/modules/Atomic.cjs` - атомарные операции (v1.0.0)
  - Предопределенные наборы: cleanup-temp, create-backup, migration-setup
  - Пользовательские наборы операций
  - Dry-run и откат
- ✅ `mcp/server/modules/PowerShell.cjs` - PowerShell команды (v1.0.0)
  - Действия: exec, fix, suggest
  - Автоматическое исправление ошибок
  - Предложения по улучшению
- ✅ `mcp/server/modules/Interceptor.cjs` - перехватчики команд (v1.0.0)
  - Действия: register, remove, stats, intercept
  - Встроенные перехватчики: pwd, ls, cd
  - Метрики производительности
- ✅ `mcp/server/modules/Test.cjs` - тестирование (v1.0.0)
  - Действия: run, list, status, coverage, validate, cleanup
  - Поддержка unit, integration, all, specific тестов
  - Парсинг результатов тестов

### Обработка ошибок

**Требования:**
- [x] Валидация входных параметров
- [x] Обработка ошибок выполнения команд
- [x] Логирование ошибок
- [x] Информативные сообщения об ошибках

### Производительность

**Требования:**
- [x] Асинхронное выполнение команд
- [x] Таймауты для предотвращения зависаний
- [x] Оптимизация частых операций
- [x] Метрики производительности

### Используется в

- `security/requirements-security.md` - безопасность выполнения команд
- `testing/requirements-testing.md` - тестирование терминала
- `features/requirements-features.md` - история команд, хинты
- `operations/requirements-operations.md` - мониторинг и логирование

## Статус
✅ РЕАЛИЗОВАНО - требования синхронизированы с текущей структурой кода

## Связанные файлы

**Handlers:**
- `handlers/terminal-handler.cjs` - основной обработчик
- `handlers/terminal-handler-core.cjs` - ядро обработчика
- `handlers/run-terminal-cmd-handler.cjs` - обработчик выполнения команд
- `handlers/tools-list-handler.cjs` - обработчик списка инструментов

**Модули:**
- `mcp/server/modules/Terminal.cjs` - модуль терминала

**Утилиты:**
- `mcp/CommandConverter.cjs` - конвертер команд
- `mcp/Workdir.cjs`, `mcp/Workdir.mjs` - управление рабочими директориями
- `lib/command-executor-wrapper.cjs` - обертка для выполнения команд

**Планы миграции (будущее):**
- Требования для будущей пакетной архитектуры: `packages/*/docs/requirements/` (планируется)

