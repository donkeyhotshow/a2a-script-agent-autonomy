# Тесты кодировок для node-terminal

## Обзор

Этот набор тестов предназначен для проверки корректной обработки различных кодировок текста в приложении node-terminal, включая Unicode, PowerShell интеграцию и файловые операции.

## ⚠️ Важные обновления (2025-12-03)

### Исправления в CommandExecutorWrapper
- ✅ **Unicode кодировка**: Автоматическая установка UTF-8 в PowerShell перед выполнением команды
  - `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
  - `[Console]::InputEncoding = [System.Text.Encoding]::UTF8`
  - `$OutputEncoding = [System.Text.Encoding]::UTF8`
- ✅ **Обработка таймаута**: Корректная обработка превышения таймаута (код 124)
- ✅ **Фоновый режим**: Обработка ошибок запуска в фоновом режиме
- ✅ **Большой вывод**: Исправлена потеря данных при большом выводе

### Обновленные тесты
- `tests/unit/command-executor-wrapper.test.cjs` - добавлены тесты для всех исправлений:
  - `testUnicodeEncoding()` - проверка Unicode символов (кириллица, китайские иероглифы, эмодзи)
  - `testTimeoutHandling()` - проверка обработки таймаута
  - `testLargeOutput()` - проверка большого вывода (100+ строк)
  - `testBackgroundMode()` - проверка фонового режима
  - `testEncodingSetup()` - проверка установки UTF-8 кодировки

## Структура тестов

### 1. `encoding-diagnostics.test.cjs`
Основные тесты диагностики проблем с кодировкой:
- **EncodingUtils**: Тестирование утилит кодировок
  - `detectEncoding()` - определение кодировки буфера
  - `convertEncoding()` - конвертация между кодировками
  - `validateEncoding()` - валидация кодировок
  - `fixEncodingIssues()` - исправление проблем кодировки
  - `analyzeEncodingIssues()` - анализ проблем

- **EncodingTester**: Интеграционные тесты
  - Тестирование вывода команд
  - Анализ проблем с кодировкой
  - Генерация отчетов

### 2. `powershell-unicode-tests.cjs`
Тесты PowerShell интеграции с Unicode:
- **PowerShellIntegration**: Основной класс интеграции
  - `isPowerShellCommand()` - определение PowerShell команд
  - `getEncodingSettings()` - настройки кодировки
  - `setEncoding()` - установка кодировки
  - `convertCommand()` - конвертация команд
  - `processOutput()` - обработка вывода
  - `createSafeCommand()` - безопасные команды

- **ProcessManager**: Менеджер процессов
  - Выполнение команд
  - Обработка результатов

- **PowerShellUnicodeTester**: Комплексные тесты
  - Определение команд PowerShell
  - Настройки кодировки консоли
  - Переменные с кириллицей
  - Файловые операции
  - JSON с кириллицей
  - Сложные команды

### 3. `file-read-mode.test.cjs`
Тесты чтения файлов с учетом кодировок:
- **FileOperations**: Базовые операции с файлами
  - Чтение начала/конца файлов
  - Режимы чтения (строки, символы)
  - Валидация параметров

- **Encoding Integration**: Интеграция с кодировками
  - Чтение файлов различных кодировок
  - Автоматическое определение кодировки
  - Исправление проблем кодировки
  - Анализ проблем кодировки

## Mock объекты

### EncodingUtils (`./__mocks__/encoding-utils.mock.js`)
Предоставляет методы для работы с кодировками:
```javascript
const encodingUtils = new EncodingUtils();

// Определение кодировки
const encoding = encodingUtils.detectEncoding(buffer);

// Конвертация
const result = encodingUtils.convertEncoding(text, 'cp1251', 'utf8');

// Исправление проблем
const fixedText = encodingUtils.fixEncodingIssues(corruptedText);

// Анализ проблем
const analysis = encodingUtils.analyzeEncodingIssues(text);
```

### PowerShellIntegration (`./__mocks__/powershell-integration.mock.js`)
Интеграция с PowerShell:
```javascript
const ps = new PowerShellIntegration();

// Определение команды
const isPS = ps.isPowerShellCommand(command);

// Обработка вывода
const processed = ps.processOutput(output);

// Безопасная команда
const safeCommand = ps.createSafeCommand(command);
```

### External Dependencies (`./__mocks__/external-dependencies.mock.js`)
Замена внешних зависимостей:
- `fileSystemUtils` - файловые операции
- `errorUtils` - обработка ошибок
- `consoleUtils` - вывод в консоль
- `CommandExecutor` - выполнение команд

## Запуск тестов

### Запуск всех тестов кодировок:
```bash
npm test -- --run tests/unit/encoding-diagnostics.test.cjs tests/unit/powershell-unicode-tests.cjs tests/unit/file-read-mode.test.cjs
```

### Запуск отдельных наборов:
```bash
# Тесты диагностики кодировок
npm test -- --run tests/unit/encoding-diagnostics.test.cjs

# Тесты PowerShell Unicode
npm test -- --run tests/unit/powershell-unicode-tests.cjs

# Тесты чтения файлов
npm test -- --run tests/unit/file-read-mode.test.cjs
```

### С покровом кода:
```bash
npm run test:coverage -- --run tests/unit/*encoding*.test.cjs
```

## Кодировки и сценарии тестирования

### Поддерживаемые кодировки:
- **UTF-8**: Основная кодировка для Unicode текста
- **CP1251**: Кодировка Windows для кириллицы
- **UTF-16**: 16-битная Unicode кодировка
- **ASCII**: Базовая 7-битная кодировка
- **Latin1/ISO-8859-1**: Западноевропейская кодировка

### Сценарии тестирования:
1. **Определение кодировки**: Анализ буфера для определения типа кодировки
2. **Конвертация**: Преобразование текста между различными кодировками
3. **Исправление проблем**: Обработка символов замены и некорректных последовательностей
4. **PowerShell интеграция**: Работа с командами PowerShell и Unicode
5. **Файловые операции**: Чтение файлов с учетом кодировки

## Структура отчетов

### Диагностический отчет:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "platform": "win32",
  "nodeVersion": "v18.17.0",
  "environment": {
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
    "PYTHONIOENCODING": "utf-8"
  },
  "summary": {
    "totalTests": 10,
    "successfulTests": 8,
    "failedTests": 2
  },
  "results": [...]
}
```

### Анализ проблем кодировки:
```json
{
  "hasIssues": true,
  "issues": [
    "Найдены символы замены Unicode (U+FFFD)",
    "Найдены некорректные последовательности UTF-8"
  ],
  "recommendations": [
    "Рекомендуется перекодировать файл из CP1251 в UTF-8",
    "Проверить источник файла на корректность кодировки"
  ],
  "confidence": 0.85
}
```

## Расширение тестов

### Добавление новой кодировки:
1. Добавить кодировку в `supportedEncodings` в `EncodingUtils`
2. Реализовать логику определения в `detectEncoding()`
3. Добавить тесты в соответствующие секции

### Добавление нового сценария:
1. Создать новый `describe` блок
2. Добавить тестовые случаи с `it()`
3. Использовать подходящие mock объекты
4. Проверить корректность работы

## Лучшие практики

1. **Использовать mocks**: Все внешние зависимости должны быть замоканы
2. **Тестировать граничные случаи**: Проверять пустые значения, некорректные входы
3. **Проверять ошибки**: Тестировать обработку исключительных ситуаций
4. **Документировать**: Добавлять понятные описания тестов
5. **Изолировать**: Каждый тест должен быть независимым

## Устранение неисправностей

### Проблема: "Input must be a Buffer"
**Решение**: Убедитесь, что передаете Buffer объект в методы кодировки

### Проблема: "Unsupported encoding"
**Решение**: Проверьте список поддерживаемых кодировок в `EncodingUtils`

### Проблема: Тесты не запускаются
**Решение**: Проверьте конфигурацию Vitest и пути к файлам

---

## Контакты

При возникновении вопросов или проблем обращайтесь к команде разработки node-terminal.
