# Level 2: Component Integration Tests

> **Компонентные тесты - проверка отдельных сервисов и их интеграции**

## Структура подуровней

```
level2/
├── 1-individual/   # Тесты отдельных компонентов
├── 2-interaction/  # Тесты взаимодействия между компонентами
├── 3-persistence/   # Тесты персистентности данных
└── run.ps1         # Запуск всех Level 2 тестов с fail-fast
```

## Принцип работы

- **Зависит от Level 1**: Все сервисы должны быть доступны
- **Компонентная изоляция**: Каждый сервис тестируется отдельно
- **Интеграционные проверки**: Взаимодействие между сервисами
- **Fail-fast**: Остановка при первой критической ошибке

## Тестируемые компоненты

### 1. Individual Components
- A2A Server (API, neuron processing, storage)
- Client API (session management, tester API)
- AI Integration (proxy, daemon, promises)
- Web UI (basic functionality, CLI integration)

### 2. Component Interactions
- Server ↔ Client API communication
- Server ↔ AI Integration workflow
- Client API ↔ Web UI integration
- Database connectivity and operations

### 3. Data Persistence
- Session storage and retrieval
- Request history persistence
- Promise queue management
- Log rotation and cleanup

## Запуск

```bash
# Полный Level 2 (после успешного Level 1)
.\scripts\tests\level2\run.ps1

# Или по отдельности
.\scripts\tests\level2\1-individual\run.ps1
.\scripts\tests\level2\2-interaction\run.ps1
.\scripts\tests\level2\3-persistence\run.ps1
```

## Требования

- ✅ Level 1 пройден успешно
- ✅ Все сервисы запущены и доступны
- ✅ База данных PostgreSQL работает
- ✅ Ollama запущен с моделью