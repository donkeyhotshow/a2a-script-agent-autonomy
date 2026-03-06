# 🚀 A2A Script Agent - Полная система smoke-тестирования

## Быстрый старт за 1 команду

```bash
npm run setup:smoke-system
```

Эта команда автоматически:
- ✅ Исправляет smoke-тест (переменные окружения для Vite)
- ✅ Тестирует все сервисы и интеграцию
- ✅ Создает pre-release процесс
- ✅ Настраивает автоматические ретроспективы
- ✅ Обновляет package.json
- ✅ Создает полную документацию

## Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │────│  Client API     │────│   A2A Server    │
│   (Port 5173)   │    │  (Port 3001)    │    │   (Port 3000)   │
│                 │    │                 │    │                 │
│ • Vite Dev      │    │ • SDK Server     │    │ • LLM Engine    │
│ • Vue.js App    │    │ • File System    │    │ • Sessions      │
│ • SSE Client    │    │ • Terminal       │    │ • Requests      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Infrastructure  │
                    │ • PostgreSQL    │
                    │ • Redis         │
                    │ • Docker        │
                    └─────────────────┘
```

## Использование системы

### 1. Полная настройка (рекомендуется)

```bash
npm run setup:smoke-system
```

### 2. Быстрая настройка (без детальных проверок)

```bash
npm run setup:smoke-system:quick
```

### 3. Только настройка (без тестов)

```bash
npm run setup:smoke-system:skip-tests
```

## Доступные команды после настройки

### Smoke-тестирование

```bash
# Быстрый тест (без браузера, ~2 мин)
npm run smoke-test

# Полный тест (с браузером, ~3 мин)
npm run smoke-test:full
```

### Pre-release валидация

```bash
# Полная проверка перед релизом (~5-10 мин)
npm run pre-release
```

### Ретроспективы и анализ

```bash
# Ежедневный анализ
npm run retrospective:daily

# Еженедельный анализ
npm run retrospective:weekly

# Настроить автоматические ретроспективы
npm run setup-retrospectives

# Протестировать ретроспективы
npm run test-retrospectives
```

## Что делает система

### 1. Исправление smoke-теста

**Проблема:** Vite dev server не получал переменные окружения PORT и CLIENT_API_PORT.

**Решение:** Автоматически добавляет правильные переменные окружения в скрипт запуска.

```powershell
# Было:
npm run dev

# Стало:
$env:PORT='5173'; $env:CLIENT_API_PORT='3001'; npm run dev
```

### 2. Тестирование интеграции

- ✅ Запуск всех сервисов (A2A Server, Client API, Web UI)
- ✅ Проверка health endpoints
- ✅ Тестирование SSE подключения
- ✅ Валидация межсервисного взаимодействия
- ✅ Сбор логов и метрик

### 3. Pre-release процесс

**Валидация включает:**
- Конфигурация системы
- Доступность Docker сервисов
- Smoke-тест всех компонентов
- Unit-тесты
- Integration-тесты
- Проверка сборки

### 4. Автоматические ретроспективы

**Ежедневно анализирует:**
- Успешность smoke-тестов (>95% цель)
- Наиболее проблемные компоненты
- Тренды производительности
- Рекомендации по улучшению

**Еженедельно:**
- Долгосрочные тренды
- Системные проблемы
- Предложения по оптимизации

## Структура файлов

```
scripts/
├── setup-complete-smoke-system.ps1    # 🎯 Главный скрипт настройки
├── test-web-ui.ps1                    # Smoke-тест (исправленный)
├── pre-release.js                     # Pre-release валидация
├── smoke-retrospective.js             # Анализ ретроспектив
└── setup-retrospectives.ps1           # Настройка расписания

test-results/
├── web-ui-smoke-*.json               # Результаты smoke-тестов
└── smoke-retrospective-*.json        # Отчеты ретроспектив

proxy_logs/
└── web-ui-smoke-*/                    # Детальные логи тестов
    ├── A2A Server.out.log
    ├── Client API.out.log
    └── Vite Dev Server.out.log

SMOKE_SYSTEM_README.md                 # 📖 Эта документация
```

## Мониторинг и метрики

### KPI системы

| Метрика | Цель | Мониторинг |
|---------|------|------------|
| Успешность smoke-теста | >95% | Ретроспективы |
| Время запуска сервисов | <30 сек | Smoke-тест |
| SSE heartbeat | 100% | Ретроспективы |
| Session persistence | 100% | Integration тесты |

### Автоматические отчеты

**Ежедневно (6:00 AM):**
- Анализ последних 24 часов
- Выявление трендов
- Предупреждения о проблемах

**Еженедельно (понедельник 6:00 AM):**
- Анализ последней недели
- Сравнение с предыдущими периодами
- Рекомендации по улучшению

## Устранение неисправностей

### Проблема: Порт уже используется

```bash
# Найти процесс
netstat -ano | findstr :5173

# Остановить процесс
taskkill /PID <PID> /F
```

### Проблема: Docker сервисы не запускаются

```bash
# Проверить статус
docker ps -a

# Перезапустить
docker compose down
docker compose up -d postgres redis
```

### Проблема: Vite не стартует

```bash
# Проверить переменные окружения
echo $env:PORT
echo $env:CLIENT_API_PORT

# Ручной запуск
$env:PORT=5173; $env:CLIENT_API_PORT=3001; npm run dev
```

## Расширение системы

### Добавление новых проверок

1. **В smoke-тест:** Отредактировать `scripts/test-web-ui.ps1`
2. **В pre-release:** Добавить в `scripts/pre-release.js`
3. **В ретроспективы:** Обновить `scripts/smoke-retrospective.js`

### Кастомные метрики

```javascript
// В smoke-retrospective.js
const customMetrics = {
  averageResponseTime: calculateAverageResponseTime(results),
  errorPatterns: analyzeErrorPatterns(results),
  performanceDegradation: detectPerformanceIssues(results)
};
```

## Безопасность

- ✅ Переменные окружения для чувствительных данных
- ✅ Валидация входных данных
- ✅ Ограничение прав доступа к логам
- ✅ Безопасное выполнение скриптов

---

**Система готова к использованию!** 🎉

**Создано:** Автоматически скриптом `setup-complete-smoke-system.ps1`
**Версия:** 1.0.0
**Статус:** Production Ready ✅