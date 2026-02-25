# Требования к пакету @mcp/terminal-interceptors

## Дата создания
2025-11-29 15:55:00

## Контекст
Пакет `@mcp/terminal-interceptors` содержит перехватчики команд MCP Terminal Server для автоматического перехвата, оптимизации и мониторинга команд.

## Фаза проекта
03-core

## Требования

### Перехватчики

#### ✅ Текущие файлы (РЕАЛИЗОВАНО в текущей структуре)

**Base Interceptor:**
- ✅ `mcp/interceptors/BaseInterceptor.cjs` - базовый класс для перехватчиков (текущее расположение)
- ⏳ `packages/interceptors/mcp-terminal-interceptors/src/BaseInterceptor.cjs` - планируется миграция
  - Интерфейс: `canHandle()`, `handle()`, `getInfo()`
  - Валидация команд
  - Логирование действий
  - Приоритеты перехватчиков

**Test Command Interceptor:**
- ✅ `mcp/interceptors/TestCommandInterceptor.cjs` - перехватчик тестовых команд (priority: 200) (текущее расположение)
- ⏳ `packages/interceptors/mcp-terminal-interceptors/src/TestCommandInterceptor.cjs` - планируется миграция
  - Перехват команд: npm test, vitest, jest, yarn test, pnpm test
  - Интеграция с TestInterceptor
  - Рекомендации по запуску тестов

### Функциональность

#### Base Interceptor

**Требования:**
- [x] Базовый класс для всех перехватчиков
- [x] Метод `canHandle(command)` - проверка возможности обработки команды
- [x] Метод `handle(command, context)` - обработка команды
- [x] Метод `getInfo()` - получение информации о перехватчике
- [x] Валидация команд через `validateCommand()`
- [x] Логирование действий через `logAction()`
- [x] Управление приоритетами через `getPriority()`, `setPriority()`

**Интерфейс:**
```javascript
class BaseInterceptor {
  constructor()
  canHandle(command)
  async handle(command, context = {})
  getInfo()
  validateCommand(command)
  logAction(action, details = {})
  getPriority()
  setPriority(priority)
}
```

#### Test Command Interceptor

**Требования:**
- [x] Перехват тестовых команд (npm test, vitest, jest, yarn test, pnpm test)
- [x] Приоритет: 200 (высокий приоритет)
- [x] Интеграция с TestInterceptor из `@mcp/terminal-utils`
- [x] Предоставление рекомендаций по запуску тестов
- [x] Валидация команд перед обработкой

### Интеграция

**Требования:**
- [x] Использование в модуле Interceptor из `@mcp/terminal-modules`
- [x] Использование в handlers из `@mcp/terminal-handlers`
- [x] Регистрация перехватчиков в системе

### Используется в

- Пакет `@mcp/terminal-modules` - модуль Interceptor
- Пакет `@mcp/terminal-handlers` - handlers используют перехватчики
- Корневой проект - регистрация перехватчиков

## Статус
✅ РЕАЛИЗОВАНО

## Связанные файлы
- `packages/interceptors/mcp-terminal-interceptors/src/BaseInterceptor.cjs` - базовый класс
- `packages/interceptors/mcp-terminal-interceptors/src/TestCommandInterceptor.cjs` - перехватчик тестов

