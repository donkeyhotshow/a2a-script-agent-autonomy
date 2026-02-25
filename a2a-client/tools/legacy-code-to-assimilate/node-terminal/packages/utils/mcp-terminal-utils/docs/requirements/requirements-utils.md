# Требования к пакету @mcp/terminal-utils

## Дата создания
2025-11-29 15:55:00

## Контекст
Пакет `@mcp/terminal-utils` содержит утилиты и вспомогательные системы MCP Terminal Server для поддержки основной функциональности.

## Фаза проекта
02-foundation

## Требования

### Утилиты

#### ✅ Текущие файлы (РЕАЛИЗОВАНО в текущей структуре)

**Command Converter:**
- ✅ `mcp/CommandConverter.cjs` - конвертация команд между ОС (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/CommandConverter.cjs` - планируется миграция
  - Конвертация команд между Windows, Linux, macOS
  - Эмуляция команд (isEmulatedCommand)
  - Поддержка кроссплатформенности

**Debug System:**
- ✅ `mcp/DebugSystem.cjs` - система отладки (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/DebugSystem.cjs` - планируется миграция
  - Категории отладки (DEBUG_CATEGORIES)
  - Логирование отладочной информации
  - Переключение версий сервера (standard/fixed)

**Search Engine:**
- ✅ `mcp/SearchEngine.cjs` - система поиска (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/SearchEngine.cjs` - планируется миграция
  - Поиск по файлам
  - Grep-подобный поиск
  - Рекурсивный обход
  - Тесты: 34 теста ✅

**Workdir:**
- ✅ `mcp/Workdir.cjs` - управление рабочими директориями (CommonJS) (текущее расположение)
- ✅ `mcp/Workdir.mjs` - управление рабочими директориями (ESM) (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/Workdir.cjs` - планируется миграция
- ⏳ `packages/utils/mcp-terminal-utils/src/Workdir.mjs` - планируется миграция
  - Управление рабочими директориями
  - Сессионные директории
  - Валидация путей
  - Виртуальная CWD с поддержкой сессий
  - Приоритет: Сессионная CWD > Рабочая директория проекта > Системная CWD

**Test Utils:**
- ✅ `mcp/TestGetter.cjs` - получение тестов (текущее расположение)
- ✅ `mcp/TestInterceptor.cjs` - перехватчик тестов (текущее расположение)
- ✅ `mcp/test/TestActivityTracker.cjs` - трекер активности тестов (текущее расположение)
- ✅ `mcp/test/TestMetrics.cjs` - метрики тестов (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/TestGetter.cjs` - планируется миграция
- ⏳ `packages/utils/mcp-terminal-utils/src/TestInterceptor.cjs` - планируется миграция
- ⏳ `packages/utils/mcp-terminal-utils/src/test/TestActivityTracker.cjs` - планируется миграция
- ⏳ `packages/utils/mcp-terminal-utils/src/test/TestMetrics.cjs` - планируется миграция

**Libraries:**
- ✅ `lib/archive-adapter.cjs` - адаптер архивирования (текущее расположение)
- ✅ `lib/command-executor-wrapper.cjs` - обертка выполнения команд (текущее расположение)
- ⏳ `packages/utils/mcp-terminal-utils/src/lib/archive-adapter.cjs` - планируется миграция
- ⏳ `packages/utils/mcp-terminal-utils/src/lib/command-executor-wrapper.cjs` - планируется миграция

### Функциональность

#### Command Converter

**Требования:**
- [x] Конвертация команд между ОС (Windows ↔ Linux ↔ macOS)
- [x] Эмуляция команд через `isEmulatedCommand()`
- [x] Список эмулированных команд через `listEmulatedCommands()`
- [x] Поддержка различных синтаксисов команд

#### Debug System

**Требования:**
- [x] Категории отладки (DEBUG_CATEGORIES)
- [x] Логирование отладочной информации
- [x] Переключение версий сервера (standard/fixed)
- [x] Контроль уровня детализации логирования

#### Search Engine

**Требования:**
- [x] Поиск по файлам
- [x] Grep-подобный поиск
- [x] Рекурсивный обход директорий
- [x] Фильтрация результатов
- [x] Тесты: 34 теста ✅

#### Workdir

**Требования:**
- [x] Управление рабочими директориями
- [x] Сессионные директории для изоляции
- [x] Валидация путей
- [x] Виртуальная CWD с поддержкой сессий
- [x] Приоритет директорий: Сессионная CWD > Рабочая директория проекта > Системная CWD
- [x] Поддержка CommonJS и ESM

#### Test Utils

**Требования:**
- [x] Получение тестов через TestGetter
- [x] Перехват тестов через TestInterceptor
- [x] Трекинг активности тестов
- [x] Метрики тестов

#### Libraries

**Требования:**
- [x] Адаптер архивирования для работы с архивами
- [x] Обертка выполнения команд для безопасного выполнения

### Интеграция

**Требования:**
- [x] Использование в CoreServer из `@mcp/terminal-server-core`
- [x] Использование в модулях из `@mcp/terminal-modules`
- [x] Использование в handlers из `@mcp/terminal-handlers`
- [x] Использование в перехватчиках из `@mcp/terminal-interceptors`

### Используется в

- Все пакеты проекта используют утилиты
- Корневой проект использует утилиты

## Статус
✅ РЕАЛИЗОВАНО

## Связанные файлы
- `packages/utils/mcp-terminal-utils/src/CommandConverter.cjs` - конвертер команд
- `packages/utils/mcp-terminal-utils/src/DebugSystem.cjs` - система отладки
- `packages/utils/mcp-terminal-utils/src/SearchEngine.cjs` - система поиска
- `packages/utils/mcp-terminal-utils/src/Workdir.cjs` - управление директориями (CJS)
- `packages/utils/mcp-terminal-utils/src/Workdir.mjs` - управление директориями (ESM)
- `packages/utils/mcp-terminal-utils/src/TestGetter.cjs` - получение тестов
- `packages/utils/mcp-terminal-utils/src/TestInterceptor.cjs` - перехватчик тестов
- `packages/utils/mcp-terminal-utils/src/test/TestActivityTracker.cjs` - трекер активности
- `packages/utils/mcp-terminal-utils/src/test/TestMetrics.cjs` - метрики тестов
- `lib/archive-adapter.cjs` - адаптер архивирования (текущее расположение)
- `lib/command-executor-wrapper.cjs` - обертка выполнения команд (текущее расположение)
- `packages/utils/mcp-terminal-utils/src/lib/archive-adapter.cjs` - планируется миграция
- `packages/utils/mcp-terminal-utils/src/lib/command-executor-wrapper.cjs` - планируется миграция

