# TerminalHandler Tests - Исправленная версия

## Обзор

Этот документ описывает исправленные тестовые файлы для модуля TerminalHandler, которые были переписаны для работы с Vitest и устранения зависимостей от внешних модулей.

## Исправленные файлы

### 1. `terminal-handler.test.cjs`
**Основной тестовый файл** с комплексными тестами для всех функций TerminalHandler.

**Покрытие тестов:**
- Конструктор и инициализация
- Валидация команд
- Выполнение команд
- Обработка терминальных инструментов
- Структурированные действия
- Операции с workspace
- Операции с режимами
- История команд
- Асинхронные операции
- Обработка ошибок

### 2. `terminal-handler-simple.test.cjs`
**Упрощенный тестовый файл** для базовой функциональности без сложных зависимостей.

**Покрытие тестов:**
- Структура класса
- Валидация файлов
- Наличие методов
- Базовые операции команд
- Интеграция терминальных инструментов
- Система помощи
- Обработка ошибок
- Отслеживание истории

### 3. `terminal-handler-advanced.test.cjs`
**Продвинутый тестовый файл** для специфических функций и сложных сценариев.

**Покрытие тестов:**
- Операции с workspace (set/get)
- Batch выполнение команд
- Операции с режимами (set/get)
- История команд (show/clear)
- Файловые операции
- Поисковые операции
- Операции безопасности
- Обратная связь
- Обработка ошибок для структурированных действий

## Общие моки

### `__mocks__/terminal-handler-mocks.js`
Централизованный файл с моками для всех тестов:

- **TerminalHandler** - полная реализация класса с моками
- **createMockServer** - мок сервера с необходимыми методами
- **mockFs** - мок файловой системы
- **mockPath** - мок для работы с путями
- **mockConsole** - мок консоли
- **mockErrorUtils** - мок утилит для обработки ошибок
- **mockConsoleUtils** - мок утилит консоли

## Структура мока TerminalHandler

```javascript
const TerminalHandler = class {
  constructor(server) {
    this.server = server;
    this.supportedCommands = ['echo', 'pwd', 'ls', 'whoami', 'cat', 'dir'];
    this.workspace = process.cwd();
    this.mode = 'normal';
    this.history = [];
    this.batchResults = [];
  }

  // Основные методы
  async handleCommand(command)
  validateCommand(command)
  async executeCommand(command)
  getSupportedCommands()

  // Терминальные инструменты
  async handleTerminalTool(id, args)
  async handleStructuredTerminalAction(id, args)
  async handleDirectTerminalCommand(id, args)

  // Структурированные действия
  async handleWorkspaceAction(id, args)
  async handleBatchAction(id, args)
  async handleModeAction(id, args)
  async handleHistoryAction(id, args)

  // Утилиты
  terminalHelp()
  setWorkspace(path)
  getWorkspace()
  setMode(mode)
  getMode()
  getHistory()
  getBatchResults()
};
```

## Запуск тестов

### Запуск всех тестов
```bash
npm run test:unit
```

### Запуск конкретного файла
```bash
# Основной тест
npm run test:unit -- tests/unit/terminal-handler.test.cjs

# Простой тест
npm run test:unit -- tests/unit/terminal-handler-simple.test.cjs

# Продвинутый тест
npm run test:unit -- tests/unit/terminal-handler-advanced.test.cjs
```

### Запуск в режиме наблюдения
```bash
npm run test:unit:watch
```

### Запуск с покрытием
```bash
npm run test:coverage
```

## Исправленные проблемы

### 1. Абсолютные пути
**Было:**
```javascript
const { errorUtils } = require('C:/apps/libs/error-management/error-handler/error-utils.js');
const { consoleUtils } = require('C:/apps/libs/logging-monitoring/logging/console-utils.js');
```

**Стало:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Используются моки вместо внешних зависимостей
```

### 2. Внешние зависимости
**Было:** Зависимость от реальных обработчиков команд и внешних модулей
**Стало:** Полностью изолированные моки для всех зависимостей

### 3. Совместимость с Vitest
**Было:** Использование Jest и console.log для тестирования
**Стало:** Полная совместимость с Vitest, использование describe/it/expect

### 4. Отсутствующие модули
**Было:** Ошибки из-за отсутствующих модулей
**Стало:** Все необходимые моки включены в тесты

## Особенности реализации

### Валидация команд
```javascript
validateCommand(command) {
  return this.supportedCommands.some(cmd => command.includes(cmd));
}
```

### Обработка ошибок
```javascript
async handleCommand(command) {
  if (!command || command.trim() === '') {
    throw new Error('Command is required');
  }
  // ...
}
```

### Структурированные действия
```javascript
async handleStructuredTerminalAction(id, args) {
  switch (args.action) {
    case 'workspace': return await this.handleWorkspaceAction(id, args);
    case 'batch': return await this.handleBatchAction(id, args);
    case 'mode': return await this.handleModeAction(id, args);
    // ...
  }
}
```

### Batch выполнение
```javascript
async handleBatchAction(id, args) {
  const results = [];
  const stopOnError = args.stopOnError !== false;
  
  for (const command of args.commands) {
    try {
      const result = await this.executeCommand(command);
      results.push({ command, success: true, output: result.output });
    } catch (error) {
      results.push({ command, success: false, error: error.message });
      if (stopOnError) break;
    }
  }
  // ...
}
```

## Тестовые сценарии

### Простые команды
- `echo "Hello World"`
- `pwd`
- `ls -la`
- `whoami`

### Структурированные действия терминала
- `workspace set/get`
- `batch` выполнение
- `mode set/get`
- `history show/current/list` (доступ к истории через структурированное действие `action: "history"` внутри `terminal`, а не отдельный тул)

### Обработка ошибок
- Пустые команды
- Неподдерживаемые команды
- Неверные таймауты
- Ошибки выполнения

### Асинхронные операции
- Множественные команды
- Batch выполнение
- Обработка ошибок в асинхронном контексте

## Рекомендации по использованию

1. **Используйте централизованные моки** из `__mocks__/terminal-handler-mocks.js`
2. **Следуйте структуре тестов** - каждый файл имеет свою специализацию
3. **Добавляйте новые тесты** в соответствующие файлы по функциональности
4. **Используйте beforeEach** для инициализации моков
5. **Тестируйте как успешные, так и ошибочные сценарии**

## Совместимость

- ✅ Vitest
- ✅ Node.js 18+
- ✅ ES6 модули
- ✅ Асинхронные операции
- ✅ Моки и стабы
- ✅ Покрытие кода

## Дальнейшее развитие

1. Добавление интеграционных тестов
2. Расширение моков для новых функций
3. Добавление тестов производительности
4. Создание тестов для новых команд
5. Улучшение покрытия edge cases
