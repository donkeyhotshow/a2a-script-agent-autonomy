# Требования к управлению фоновыми процессами

## Дата создания
2025-12-03 19:00:00

## Контекст
MCP Terminal Server должен предоставлять возможность управления процессами, запущенными в фоновом режиме. Это включает отслеживание запущенных процессов, чтение их логов в реальном времени, управление их жизненным циклом (остановка, завершение) и получение статуса выполнения.

## Фаза проекта
05-development

## Связанные требования
- `docs/requirements/terminal/requirements-terminal.md` - базовые требования к терминалу и фоновому режиму
- `docs/requirements/operations/requirements-operations.md` - операционные требования

## Требования

### 1. Отслеживание фоновых процессов

#### 1.1 Хранение метаданных процессов
**Требования:**
- [ ] Хранить метаданные каждого фонового процесса:
  - `processId` (PID) - идентификатор процесса
  - `command` - исходная команда
  - `cwd` - рабочая директория на момент запуска
  - `startTime` - время запуска (ISO 8601)
  - `status` - статус процесса (`running`, `stopped`, `terminated`, `error`)
  - `logFile` - путь к файлу лога процесса
  - `sessionId` - идентификатор сессии MCP
  - `timeout` - таймаут выполнения (если установлен)
- [ ] Хранить метаданные в структурированном формате (JSON) в `data/background-processes/`
- [ ] Автоматически очищать записи завершенных процессов (опционально, настраиваемо)

#### 1.2 Регистрация процессов при запуске
**Требования:**
- [ ] При запуске команды с `is_background: true` автоматически регистрировать процесс
- [ ] Генерировать уникальный идентификатор процесса (`processId`)
- [ ] Создавать файл лога для процесса в `logs/background-processes/{processId}.log`
- [ ] Сохранять метаданные в `data/background-processes/{processId}.json`

### 2. Чтение логов процессов

#### 2.1 Чтение текущего лога процесса
**Требования:**
- [ ] Возможность прочитать текущий лог процесса по `processId`
- [ ] Поддержка чтения с начала файла или с последней позиции
- [ ] Возврат последних N строк лога (tail)
- [ ] Возврат всего лога процесса
- [ ] Поддержка фильтрации по уровню (stdout/stderr)

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "background_process",
    "arguments": {
      "action": "read_log",
      "processId": "abc123",
      "options": {
        "lines": 100,
        "from": "start",
        "filter": "all"
      }
    }
  }
}
```

**Формат ответа:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 Лог процесса abc123\n\n[2025-12-03T19:00:00.000Z] stdout: Starting process...\n[2025-12-03T19:00:01.000Z] stdout: Process initialized\n[2025-12-03T19:00:02.000Z] stderr: Warning: Low memory\n"
    }
  ]
}
```

#### 2.2 Чтение первого вывода с задержкой
**Требования:**
- [ ] При запуске процесса в фоне с опцией `readInitialOutput: true`:
  - [ ] Ждать указанное время (`initialOutputDelay`, по умолчанию 2 секунды)
  - [ ] Прочитать первый вывод процесса
  - [ ] Вернуть начальный вывод вместе с `processId`
  - [ ] Продолжить выполнение процесса в фоне
- [ ] Поддержка настраиваемой задержки (от 0.5 до 10 секунд)

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "terminal",
    "arguments": {
      "command": "npm run dev",
      "is_background": true,
      "readInitialOutput": true,
      "initialOutputDelay": 2
    }
  }
}
```

**Формат ответа:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Процесс запущен в фоне\n\nProcess ID: abc123\nLog file: logs/background-processes/abc123.log\n\nНачальный вывод:\n> npm run dev\n\n> app@1.0.0 dev\n> node server.js\n\nServer starting on port 3000..."
    }
  ],
  "metadata": {
    "processId": "abc123",
    "status": "running",
    "initialOutput": "> npm run dev\n\n> app@1.0.0 dev\n> node server.js\n\nServer starting on port 3000..."
  }
}
```

### 3. Управление процессами

#### 3.1 Получение списка процессов
**Требования:**
- [ ] Возможность получить список всех активных фоновых процессов
- [ ] Фильтрация по статусу (`running`, `stopped`, `all`)
- [ ] Фильтрация по сессии (`sessionId`)
- [ ] Сортировка по времени запуска (новые/старые)

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "background_process",
    "arguments": {
      "action": "list",
      "filters": {
        "status": "running",
        "sessionId": "session-123"
      }
    }
  }
}
```

**Формат ответа:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 Активные фоновые процессы:\n\n1. Process ID: abc123\n   Command: npm run dev\n   Status: running\n   Started: 2025-12-03T19:00:00.000Z\n   CWD: /path/to/project\n\n2. Process ID: def456\n   Command: python script.py\n   Status: running\n   Started: 2025-12-03T18:55:00.000Z\n   CWD: /path/to/other"
    }
  ],
  "metadata": {
    "processes": [
      {
        "processId": "abc123",
        "command": "npm run dev",
        "status": "running",
        "startTime": "2025-12-03T19:00:00.000Z",
        "cwd": "/path/to/project",
        "pid": 12345
      }
    ]
  }
}
```

#### 3.2 Получение статуса процесса
**Требования:**
- [ ] Возможность получить детальный статус процесса по `processId`
- [ ] Информация о статусе (running/stopped/terminated)
- [ ] Время работы процесса (uptime)
- [ ] Размер лог-файла
- [ ] Последние строки лога (опционально)

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "background_process",
    "arguments": {
      "action": "status",
      "processId": "abc123"
    }
  }
}
```

#### 3.3 Остановка процесса (graceful shutdown)
**Требования:**
- [ ] Возможность остановить процесс gracefully (SIGTERM)
- [ ] Ожидание завершения процесса (с таймаутом)
- [ ] Обновление статуса процесса на `stopped`
- [ ] Сохранение финального лога

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "background_process",
    "arguments": {
      "action": "stop",
      "processId": "abc123",
      "timeout": 10
    }
  }
}
```

#### 3.4 Принудительное завершение процесса (kill)
**Требования:**
- [ ] Возможность принудительно завершить процесс (SIGKILL)
- [ ] Использовать только если graceful shutdown не сработал
- [ ] Обновление статуса процесса на `terminated`
- [ ] Сохранение лога до момента завершения

**Формат запроса:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "background_process",
    "arguments": {
      "action": "kill",
      "processId": "abc123"
    }
  }
}
```

### 4. Новый MCP Tool: `background_process`

#### 4.1 Описание tool
**Требования:**
- [ ] Создать новый MCP tool `background_process` для управления фоновыми процессами
- [ ] Tool должен быть зарегистрирован в `mcp-server.cjs`
- [ ] Handler должен быть в `handlers/background-process-handler.cjs`

#### 4.2 Действия (actions)
**Требования:**
- [ ] `list` - получить список процессов
- [ ] `status` - получить статус процесса
- [ ] `read_log` - прочитать лог процесса
- [ ] `stop` - остановить процесс gracefully
- [ ] `kill` - принудительно завершить процесс
- [ ] `cleanup` - очистить завершенные процессы

#### 4.3 Схема параметров
```typescript
interface BackgroundProcessArguments {
  action: 'list' | 'status' | 'read_log' | 'stop' | 'kill' | 'cleanup';
  processId?: string;
  options?: {
    lines?: number;
    from?: 'start' | 'end' | 'last_position';
    filter?: 'all' | 'stdout' | 'stderr';
    status?: 'running' | 'stopped' | 'terminated' | 'all';
    sessionId?: string;
  };
  timeout?: number;
}
```

### 5. Интеграция с существующим фоновым режимом

#### 5.1 Обновление `terminal` tool
**Требования:**
- [ ] Добавить опцию `readInitialOutput` в параметры `terminal` tool
- [ ] Добавить опцию `initialOutputDelay` для настройки задержки
- [ ] При запуске в фоне автоматически регистрировать процесс
- [ ] Возвращать `processId` в ответе при запуске в фоне

#### 5.2 Обновление `CommandExecutorWrapper`
**Требования:**
- [ ] При запуске в фоне сохранять PID процесса
- [ ] Создавать файл лога для процесса
- [ ] Записывать stdout/stderr в лог-файл
- [ ] Поддерживать чтение начального вывода с задержкой

### 6. Структура данных

#### 6.1 Файлы процессов
**Требования:**
- [ ] Метаданные: `data/background-processes/{processId}.json`
- [ ] Логи: `logs/background-processes/{processId}.log`
- [ ] Индекс процессов: `data/background-processes/index.json` (опционально)

#### 6.2 Формат метаданных процесса
```json
{
  "processId": "abc123",
  "command": "npm run dev",
  "cwd": "/path/to/project",
  "startTime": "2025-12-03T19:00:00.000Z",
  "status": "running",
  "logFile": "logs/background-processes/abc123.log",
  "sessionId": "session-123",
  "pid": 12345,
  "timeout": 3600,
  "initialOutput": "> npm run dev\n\n> app@1.0.0 dev\n..."
}
```

### 7. Безопасность

#### 7.1 Изоляция процессов
**Требования:**
- [ ] Процессы должны быть изолированы по сессиям
- [ ] Пользователь может управлять только процессами своей сессии
- [ ] Валидация `processId` перед выполнением действий

#### 7.2 Ограничения
**Требования:**
- [ ] Максимальное количество одновременных фоновых процессов на сессию (настраиваемо, по умолчанию 10)
- [ ] Максимальный размер лог-файла (настраиваемо, по умолчанию 10MB)
- [ ] Автоматическая ротация логов при превышении размера

### 8. Обработка ошибок

#### 8.1 Ошибки
**Требования:**
- [ ] Обработка случая, когда процесс не найден (`processId` не существует)
- [ ] Обработка случая, когда процесс уже завершен
- [ ] Обработка ошибок чтения лог-файла
- [ ] Обработка ошибок управления процессом (нет прав, процесс не существует)

#### 8.2 Сообщения об ошибках
**Требования:**
- [ ] Понятные сообщения об ошибках на русском языке
- [ ] Коды ошибок для программной обработки
- [ ] Детальная информация для отладки (в debug режиме)

## Технические ограничения

- Использование только Node.js API для управления процессами (`child_process`)
- Поддержка Windows, Linux, macOS
- Совместимость с существующей архитектурой MCP Terminal Server

## Ожидаемый результат

1. Новый MCP tool `background_process` для управления фоновыми процессами
2. Обновленный `terminal` tool с поддержкой `readInitialOutput`
3. Система отслеживания и управления фоновыми процессами
4. Документация и примеры использования

## Приоритет

**ВЫСОКИЙ** - критично для полноценной работы с длительными процессами

## Связанные файлы

- `handlers/terminal-handler.cjs` - текущая реализация терминала
- `lib/command-executor-wrapper.cjs` - выполнение команд
- `mcp-server.cjs` - регистрация MCP tools
- `docs/requirements/terminal/requirements-terminal.md` - базовые требования к терминалу

## Статус

- [ ] Не начато
- [ ] В процессе
- [ ] Завершено

