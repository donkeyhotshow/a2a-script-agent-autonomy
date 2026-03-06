# A2A Script Agent - Testing Framework

> **Иерархическая система тестирования с fail-fast логикой**

## Обзор

Система тестирования организована в **3 уровня** сложности с подуровнями. Каждый уровень проверяет все предыдущие + дополнительные аспекты. Применяется **fail-fast логика** - при первой ошибке выполнение останавливается для быстрого выявления проблем.

```
📊 Уровни тестирования
├── 🎯 Level 1: Basic Health Checks (30 сек)
│   ├── 1.1 Services - Доступность сервисов
│   ├── 1.2 Connectivity - Сетевая связность
│   └── 1.3 Basic API - Базовые эндпоинты
├── 🔗 Level 2: Component Integration (2-3 мин)
│   ├── 2.1 Individual - Отдельные компоненты
│   ├── 2.2 Interaction - Взаимодействие компонентов
│   └── 2.3 Persistence - Персистентность данных
└── 🚀 Level 3: End-to-End Workflows (6-16 мин)
    ├── 3.1 Workflow - Полные процессы
    ├── 3.2 CLI - CLI автоматизация
    └── 3.3 Performance - Производительность
```

## Быстрый старт

```bash
# Полное тестирование всех уровней
.\scripts\tests\run-all.ps1

# Только базовые проверки (быстро)
.\scripts\tests\run-all.ps1 -Level1Only

# Диагностический режим (с продолжением при ошибках)
.\scripts\tests\run-all.ps1 -ContinueOnError -Verbose

# Быстрый режим (пропустить долгие тесты)
.\scripts\tests\run-all.ps1 -Quick
```

## Детальное использование

### Запуск отдельных уровней

```bash
# Level 1: Базовые проверки
.\scripts\tests\level1\run.ps1

# Level 2: Интеграционные тесты
.\scripts\tests\level2\run.ps1

# Level 3: Полные E2E тесты
.\scripts\tests\level3\run.ps1
```

### Параметры командной строки

| Параметр | Описание |
|-----------|----------|
| `-Verbose` | Подробный вывод логов |
| `-ContinueOnError` | Продолжить выполнение при ошибках (диагностика) |
| `-Level1Only` | Только Level 1 (быстрые проверки) |
| `-Level2Only` | Только Level 2 (интеграция) |
| `-Level3Only` | Только Level 3 (полные тесты) |
| `-Quick` | Быстрый режим (пропустить долгие операции) |
| `-Light` | Облегченный режим (минимальная нагрузка) |

## Что проверяет каждый уровень

### Level 1: Basic Health Checks

**Цель**: Быстрая проверка доступности всех компонентов без нагрузки.

#### 1.1 Services (Доступность сервисов)
- ✅ A2A Server (порт 3000)
- ✅ Client API (порт 3001)
- ✅ AI Integration Proxy (порт 11435)
- ✅ Ollama (порт 11434)
- ✅ Docker services (PostgreSQL, Redis)

#### 1.2 Connectivity (Сетевая связность)
- ✅ DNS resolution (localhost)
- ✅ TCP connectivity (loopback)
- ✅ Port availability
- ✅ Internet connectivity

#### 1.3 Basic API (Базовые эндпоинты)
- ✅ Health endpoints (`/health`)
- ✅ Basic API responses
- ✅ Service status endpoints

### Level 2: Component Integration

**Цель**: Проверка взаимодействия компонентов и внутренней логики.

#### 2.1 Individual (Отдельные компоненты)
- ✅ A2A Server: API, neuron processing, storage
- ✅ Client API: session management, tester API
- ✅ AI Integration: proxy, daemon, promises

#### 2.2 Interaction (Взаимодействие)
- ✅ Server ↔ Client API communication
- ✅ Server ↔ AI Integration workflow
- ✅ Database connectivity and operations

#### 2.3 Persistence (Персистентность)
- ✅ Storage API operations (PUT/GET/DELETE)
- ✅ Session data persistence
- ✅ Log file accessibility

### Level 3: End-to-End Workflows

**Цель**: Полная проверка пользовательских сценариев и производительности.

#### 3.1 Workflow (Полные процессы)
- ✅ Request creation and status tracking
- ✅ Storage operations workflow
- ✅ AI integration workflow

#### 3.2 CLI (CLI автоматизация)
- ✅ CLI status and ping commands
- ✅ Panel control via CLI
- ✅ Session management
- ✅ Automated test suites

#### 3.3 Performance (Производительность)
- ✅ API response times (< 1000ms)
- ✅ Concurrent requests handling
- ✅ Memory usage monitoring

## Время выполнения

| Уровень | Время | Когда использовать |
|---------|-------|-------------------|
| Level 1 | 30 сек | Частые проверки, CI/CD |
| Level 2 | 2-3 мин | После изменений в компонентах |
| Level 3 | 6-16 мин | Перед релизом, полная валидация |
| All Levels | 8-20 мин | Ночное тестирование, полный аудит |

## Стратегия fail-fast

### Принцип работы
1. **Level 1** выполняется всегда первым
2. При **первой ошибке** в уровне - остановка выполнения
3. **Следующие уровни не запускаются** до исправления ошибок
4. Используйте `-ContinueOnError` для диагностики всех проблем сразу

### Преимущества
- ⚡ **Быстрое выявление** проблем
- 💰 **Экономия ресурсов** - не тратить время на заведомо проблемные тесты
- 🎯 **Четкая локализация** - ошибка указывает на конкретный уровень/компонент

## Диагностика и отладка

### При неудачных тестах

```bash
# Детальная диагностика с продолжением
.\scripts\tests\run-all.ps1 -ContinueOnError -Verbose

# Тестирование отдельных подуровней
.\scripts\tests\level1\1-services\run.ps1 -Verbose
.\scripts\tests\level2\2-interaction\run.ps1 -Verbose

# Быстрые проверки без нагрузки
.\scripts\tests\run-all.ps1 -Quick -Light
```

### Распространенные проблемы

| Проблема | Возможная причина | Решение |
|----------|------------------|---------|
| Level 1 fails | Сервисы не запущены | `npm run dev` |
| Port conflicts | Другие процессы | `netstat -ano`, `taskkill` |
| Database issues | PostgreSQL не работает | `docker-compose up -d` |
| AI not available | Ollama не запущен | `ollama serve` |
| Slow responses | Высокая нагрузка | `-Light` режим |

## Интеграция с CI/CD

### GitHub Actions пример

```yaml
- name: Run Tests
  run: .\scripts\tests\run-all.ps1 -Level1Only

- name: Full Integration Tests
  run: .\scripts\tests\run-all.ps1 -ContinueOnError
  if: github.event_name == 'push'
```

### Локальная разработка

```bash
# Перед коммитом
.\scripts\tests\run-all.ps1 -Level1Only

# После изменений в API
.\scripts\tests\level2\run.ps1

# Перед релизом
.\scripts\tests\run-all.ps1
```

## Структура файлов

```
scripts/tests/
├── run-all.ps1           # Главный runner всех уровней
├── README.md             # Эта документация
├── level1/               # Базовые проверки
│   ├── run.ps1          # Runner Level 1
│   ├── README.md        # Описание Level 1
│   ├── 1-services/      # Проверка сервисов
│   ├── 2-connectivity/  # Сетевая связность
│   └── 3-basic-api/     # Базовые API
├── level2/               # Интеграционные тесты
│   ├── run.ps1          # Runner Level 2
│   ├── README.md        # Описание Level 2
│   ├── 1-individual/    # Отдельные компоненты
│   ├── 2-interaction/   # Взаимодействие
│   └── 3-persistence/   # Персистентность
└── level3/               # E2E тесты
    ├── run.ps1          # Runner Level 3
    ├── README.md        # Описание Level 3
    ├── 1-workflow/      # Полные процессы
    ├── 2-cli/           # CLI автоматизация
    └── 3-performance/   # Производительность
```

## Советы по использованию

1. **Ежедневная разработка**: `Level1Only` для быстрой проверки
2. **После изменений**: Запускайте соответствующий уровень
3. **Перед коммитом**: Минимум Level 1 + измененные компоненты
4. **CI/CD**: Level 1 для быстрых проверок, полное тестирование ночью
5. **Отладка**: `-ContinueOnError -Verbose` для полной диагностики

## Расширение системы

### Добавление новых тестов

1. Создайте тест в соответствующем подуровне
2. Добавьте его в `test-*.ps1` файл
3. Обновите документацию
4. Протестируйте с `-Verbose` флагом

### Кастомные конфигурации

```bash
# Кастомные порты
$env:A2A_SERVER_PORT = "3005"
.\scripts\tests\run-all.ps1

# Кастомные таймауты
$env:TEST_TIMEOUT = "30"
.\scripts\tests\run-all.ps1
```

## Поддержка и помощь

- 📖 **Документация**: `workflows/troubleshooting.md`
- 🐛 **Отладка**: Используйте `-Verbose -ContinueOnError`
- 📊 **Метрики**: Проверяйте логи в `a2a-server/logs/`
- 🔧 **CLI помощь**: `node cli.js --help`