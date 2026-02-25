# Требования к пакету @mcp/terminal-server-core

## Дата создания
2025-11-29 15:55:00

## Контекст
Пакет `@mcp/terminal-server-core` содержит ядро MCP Terminal Server - основной сервер, базовые классы для модулей, систему валидации и утилиты кодирования.

## Фаза проекта
02-foundation

## Требования

### Core Server

#### ✅ Текущие файлы (РЕАЛИЗОВАНО в текущей структуре)

**Текущее расположение кода:**
- ✅ `mcp/server/CoreServer.cjs` - основной сервер с модульной архитектурой (⚠️ файл отсутствует, используется mcp-server.cjs напрямую)
- ✅ `mcp/server/core/ModuleBase.cjs` - базовый класс для всех модулей
- ✅ `mcp/server/Validation.cjs` - система валидации путей и параметров
- ✅ `mcp/server/utils/encoding-utils.cjs` - утилиты для работы с кодировками

**Планы миграции (будущее):**
- ⏳ `packages/core/mcp-server-core/src/CoreServer.cjs` - планируется миграция
- ⏳ `packages/core/mcp-server-core/src/core/ModuleBase.cjs` - планируется миграция
- ⏳ `packages/core/mcp-server-core/src/Validation.cjs` - планируется миграция
- ⏳ `packages/core/mcp-server-core/src/utils/encoding-utils.cjs` - планируется миграция

### Функциональность

#### CoreServer

**Требования:**
- [x] Модульная архитектура сервера
- [x] Регистрация модулей через `registerModule()`
- [x] Обработка JSON-RPC запросов (JSON-RPC 2.0)
- [x] Инициализация сервера через `handleInitialize()`
- [x] Список инструментов через `handleToolsList()`
- [x] Вызов инструментов через `handleToolsCall()`
- [x] Логирование всех операций
- [x] Обработка ошибок
- [x] Управление жизненным циклом модулей (регистрация, инициализация, очистка)
- [x] Поддержка версионирования модулей
- [x] Включение/выключение модулей (enabled/disabled)
- [x] Получение статуса модулей
- [x] Обработка запросов к модулям через `handleRequest()`

**Детали реализации:**
- Сервер хранит зарегистрированные модули в коллекции
- Каждый модуль имеет уникальный ID, генерируемый при инициализации
- Модули могут быть включены/выключены без перезапуска сервера
- Все запросы к модулям проходят через единый интерфейс `handleRequest()`
- Ошибки модулей обрабатываются через централизованный errorHandler
- Логирование выполняется через logger сервера
- **Версионирование API модулей:** Поддержка версионирования API модулей (v1, v2, и т.д.)
- **Кэширование инструментов:** Список инструментов модулей кэшируется для оптимизации производительности
- **Динамическая регистрация:** Модули регистрируются только при инициализации сервера (не поддерживается динамическая регистрация/отмена во время работы)

**Интеграция:**
- Использует `@mcp/terminal-utils` для утилит (CommandConverter, DebugSystem, Workdir)
- Предоставляет базовый класс `ModuleBase` для модулей
- Интегрируется с handlers из `@mcp/terminal-handlers`
- Использует внешние библиотеки: `@libs/validation`, `@libs/error-management`

#### ModuleBase

**Требования:**
- [x] Базовый класс для всех модулей сервера
- [x] Методы: `processRequest()`, `getTools()`, `handleRequest()`
- [x] Генерация уникального ID для модуля (формат: `{name}-{timestamp}-{random}`)
- [x] Логирование инициализации модуля
- [x] Обработка ошибок через errorHandler
- [x] Валидация через validationUtils
- [x] Управление состоянием модуля (enabled/disabled)
- [x] Получение статуса модуля (getStatus)
- [x] Получение возможностей модуля (getCapabilities)
- [x] Очистка ресурсов модуля (cleanup)
- [x] Валидация схем данных (validateSchema)
- [x] Логирование через серверный logger

**Детали реализации:**
- Конструктор принимает `server` и `options` (name, version, description, enabled)
- По умолчанию модуль включен (`enabled: true`)
- Версия модуля по умолчанию: `1.0.0`
- Метод `processRequest()` должен быть реализован в наследниках (абстрактный)
- Метод `handleRequest()` обрабатывает запросы с проверкой enabled и логированием
- Метод `getCapabilities()` возвращает информацию о модуле и его инструментах
- Метод `handleError()` обрабатывает ошибки с контекстом модуля
- **Middleware поддержка:** Поддержка middleware для обработки запросов (до/после processRequest)
- **Плагин-система:** Плагин-система для расширения функциональности модулей не поддерживается
- **Метрики производительности:** Метрики производительности (время выполнения запросов) не поддерживаются

**Интерфейс:**
```javascript
class ModuleBase {
  constructor(server, options = {})
  generateId() // Возвращает уникальный ID
  async handleRequest(id, args) // Обработка запроса с проверками
  async processRequest(id, args) // Абстрактный метод (должен быть реализован)
  getTools() // Возвращает список инструментов модуля
  getCapabilities() // Возвращает возможности модуля
  getStatus() // Возвращает статус модуля
  setEnabled(enabled) // Включение/выключение модуля
  handleError(error, context) // Обработка ошибок
  async cleanup() // Очистка ресурсов
  validateSchema(schema, data) // Валидация схемы данных
  log(level, message, data) // Логирование через сервер
}
```

**Зависимости:**
- `@libs/validation/validation/validation-utils.cjs` - валидация
- `@libs/error-management/error-handler/error-utils.js` - обработка ошибок

#### Validation

**Требования:**
- [x] Валидация путей (validateAndResolveCwd)
- [x] Проверка параметров выполнения команд (validateExecRunParams)
- [x] Валидация файловых операций (validateFsParams)
- [x] Проверка безопасности путей (validatePathWithCategories)
- [x] Нормализация путей
- [x] Валидация Windows-специфичных путей
- [x] Проверка существования директорий через fs.stat
- [x] Валидация категорий путей (WORKSPACE, DOCS_CONFIG, SOURCE_CODE, TESTS, TEMP_LOGS, WORK_REPORTS, ARCHIVE, BUILD_DIST)
- [x] Проверка запрещенных паттернов путей (FORBIDDEN_PATH_PATTERNS)
- [x] Предоставление предложений по улучшению путей

**Детали реализации:**
- `validateAndResolveCwd()` - валидация и разрешение рабочей директории
  - Проверка типа (должна быть строка)
  - Проверка на пустоту
  - **Кроссплатформенная валидация:** Поддержка валидации путей для разных ОС одновременно (Windows, Linux, macOS)
  - Windows-специфичная валидация (форматы путей, UNC paths)
  - Нормализация URL-кодирования
  - Расширение путей через `expandPath()`
  - Проверка существования через `fs.stat` или `fileUtils.getFileStats`
  - Возвращает `{valid: true, path: resolved}` или `{valid: false, error: message}`
  - **Кастомные категории:** Кастомные категории путей (пользовательские паттерны) не поддерживаются
  - **Кэширование:** Кэширование результатов проверки путей не поддерживается

- `validateExecRunParams()` - валидация параметров выполнения команд
  - `command`: обязательная строка, не пустая
  - `timeout`: число, положительное, максимум 3600 сек (1 час), по умолчанию 120 сек
  - `is_background`: boolean, по умолчанию false
  - `cwd`: строка или null, по умолчанию null
  - Возвращает `{errors: [], validated: {}}`

- `validateFsParams()` - валидация параметров файловых операций
  - Поддерживает действия: list, read, write, delete, copy, move
  - Валидация путей с категориями для каждого действия
  - Дополнительные параметры: start, end (для read), recursive (для delete)
  - Возвращает `{errors: [], validated: {}}`

- `validatePathWithCategories()` - валидация путей с категориями
  - Нормализация пути (замена `\` на `/`, удаление `./`, удаление завершающего `/`)
  - Проверка запрещенных паттернов
  - Проверка категорий путей
  - Предоставление предложений для улучшения
  - Возвращает `{isValid: boolean, category: string, error: string, details: {}}`

**Зависимости:**
- `@libs/system/server-utils/index.cjs` - ALLOWED_PATH_CATEGORIES, FORBIDDEN_PATH_PATTERNS
- `@libs/system/path-utils/index.js` - PathUtils для разрешения путей
- `../Workdir.cjs` - expandPath, getCurrentDir
- `@libs/validation/validation/validation-utils.cjs` - validationUtils
- `@libs/error-management/error-handler/error-utils.js` - errorUtils

#### Encoding Utils

**Требования:**
- [x] Работа с различными кодировками (UTF-8, UTF-16, Windows-1251, и др.)
- [x] Конвертация между кодировками
- [x] Определение кодировки файлов
- [x] Обработка BOM (Byte Order Mark)
- [x] Автоматическое определение кодировки при чтении файлов
- [x] Сохранение файлов с указанной кодировкой
- [x] Обработка ошибок кодирования

**Детали реализации:**
- Утилиты для работы с кодировками файлов
- **Автоматическое определение кодировки:** Автоматическое определение кодировки файла при чтении, если кодировка не указана
- Обработка BOM для корректного чтения файлов
- Конвертация между различными кодировками (UTF-8, UTF-16, Windows-1251, и др.)
- Используется в модулях FileOperations для чтения/записи файлов
- **Fallback-кодировки:** Fallback-кодировки при ошибках чтения не поддерживаются
- **Логирование конвертации:** Логирование всех операций конвертации кодировок не поддерживается

**Примечание:** Детальная реализация encoding-utils требует дополнительного анализа кодовой базы для уточнения конкретных функций и API.

### Используется в

- Корневой проект (`mcp-server.cjs`) - точка входа
- Пакет `@mcp/terminal-modules` - все модули наследуются от ModuleBase
- Пакет `@mcp/terminal-handlers` - handlers используют CoreServer

## Статус
✅ РЕАЛИЗОВАНО

## Связанные файлы
- `packages/core/mcp-server-core/src/CoreServer.cjs` - основной сервер
- `packages/core/mcp-server-core/src/core/ModuleBase.cjs` - базовый класс
- `packages/core/mcp-server-core/src/Validation.cjs` - валидация
- `packages/core/mcp-server-core/src/utils/encoding-utils.cjs` - утилиты кодирования

