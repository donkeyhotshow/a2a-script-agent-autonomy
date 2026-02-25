# РАСШИРЕННАЯ АРХИТЕКТУРА: Unified Daemon и Ticket System v2.0

## 🎯 **КРИТИЧЕСКИ ВАЖНЫЕ ДЕТАЛИ И ПОЛНЫЙ ЖИЗНЕННЫЙ ЦИКЛ**

### **1. РАСШИРЕННАЯ СИСТЕМА ТИКЕТОВ**

**ПРИЧИНА:** Тикеты становятся главной системой управления с полным жизненным циклом.

**СЛЕДСТВИЕ:**
- ✅ **Система ID** для интеграции с другими системами
- ✅ **Полный жизненный цикл** тикетов
- ✅ **Конвейер обработки** с зависимостями
- ✅ **Поддержка всех типов** выполнения
- ✅ **Расширенная валидация** и мониторинг

**НОВЫЕ ТИПЫ ТИКЕТОВ:**
```javascript
const TICKET_TYPES = {
  PERPETUAL: 'perpetual',                    // Вечный демон
  SINGLE: 'single',                          // Одноразовое выполнение
  SCHEDULED: 'scheduled',                    // Запланированное выполнение
  SCHEDULED_PERPETUAL: 'scheduled_perpetual', // Запланированный вечный
  SCHEDULED_SINGLE: 'scheduled_single'       // Запланированный одноразовый
};
```

**СИСТЕМА ID:**
```javascript
const SYSTEM_IDS = {
  PROJECTS_MANAGER: 'projects-manager',
  TESTING_TASKMANAGER: 'testing-taskmanager',
  UNIFIED_DAEMON: 'unified-daemon',
  TICKET_SYSTEM: 'ticket-system',
  CUSTOM: 'custom'
};
```

### **2. ПОЛНЫЙ ЖИЗНЕННЫЙ ЦИКЛ ТИКЕТА**

**СТРУКТУРА ТИКЕТА:**
```json
{
  "id": "ticket-2024-001",
  "systemId": "unified-daemon",
  "type": "perpetual",
  "priority": 3,
  "status": "pending",
  
  "daemonConfig": {
    "name": "projects-manager",
    "command": "npm start",
    "cwd": "C:/apps/root/projects-manager",
    "env": {},
    "args": [],
    "port": 3012,
    "autoRestart": true,
    "maxRetries": 3,
    "saveOutput": false,
    "outputPath": null
  },

  "execution": {
    "strategy": "immediate",
    "timeout": 300000,
    "maxRetries": 3,
    "retryDelay": 5000,
    "killTimeout": 10000,
    "background": true
  },

  "schedule": {
    "cron": "0 */5 * * *",
    "timezone": "UTC",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "maxOccurrences": null
  },

  "lifecycle": {
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z",
    "started": null,
    "completed": null,
    "cancelled": null,
    "failed": null,
    "retryCount": 0,
    "lastRetry": null
  },

  "results": {
    "success": null,
    "exitCode": null,
    "output": {
      "stdout": "",
      "stderr": ""
    },
    "error": null,
    "performance": {
      "startTime": null,
      "endTime": null,
      "duration": null,
      "memoryUsage": null,
      "cpuUsage": null
    }
  },

  "pipeline": {
    "currentStep": 0,
    "steps": [],
    "dependencies": [],
    "triggers": []
  },

  "metadata": {
    "createdBy": "system",
    "description": "",
    "tags": [],
    "category": "general",
    "version": "1.0"
  }
}
```

### **3. РАСШИРЕННАЯ СИСТЕМА ОЧЕРЕДЕЙ**

**ПРИОРИТЕТЫ:**
```javascript
const TICKET_PRIORITIES = {
  CRITICAL: 1,      // Критический
  HIGH: 2,          // Высокий
  NORMAL: 3,        // Обычный
  LOW: 4,           // Низкий
  BACKGROUND: 5     // Фоновый
};
```

**ЛОГИКА ОЧЕРЕДИ:**
1. **Приоритетная обработка** - сначала CRITICAL, затем HIGH, и т.д.
2. **Зависимости** - тикеты ждут завершения зависимых тикетов
3. **Scheduled тикеты** - автоматическое добавление по расписанию
4. **Конвейер обработки** - пошаговое выполнение сложных операций

### **4. КОНВЕЙЕР ОБРАБОТКИ ТИКЕТОВ**

**СТРУКТУРА КОНВЕЙЕРА:**
```javascript
pipeline: {
  currentStep: 0,
  steps: [
    {
      id: "step-1",
      type: "command",
      action: "validate",
      config: {
        command: "npm test",
        timeout: 30000
      }
    },
    {
      id: "step-2", 
      type: "file",
      action: "backup",
      config: {
        path: "C:/apps/backup",
        operation: "copy"
      }
    },
    {
      id: "step-3",
      type: "validation",
      action: "check",
      config: {
        conditions: [
          { type: "file_exists", value: "package.json" },
          { type: "port_available", value: 3012 }
        ]
      }
    }
  ],
  dependencies: ["ticket-001", "ticket-002"],
  triggers: ["on_success", "on_failure"]
}
```

### **5. РАСШИРЕННАЯ ВАЛИДАЦИЯ**

**УРОВНИ ВАЛИДАЦИИ:**
1. **Структурная** - проверка обязательных полей
2. **Конфигурационная** - валидация настроек демона
3. **Системная** - проверка путей и прав доступа
4. **Безопасность** - проверка опасных команд
5. **Зависимости** - валидация связей между тикетами
6. **Расписание** - проверка cron выражений

**ВАЛИДАЦИЯ КОМАНД:**
```javascript
// Проверка опасных команд
const dangerousCommands = ['rm -rf', 'del /s', 'format', 'shutdown', 'taskkill /f'];

// Проверка путей
const pathValidation = await validatePath(daemonConfig.cwd);

// Проверка переменных окружения
const envValidation = validateEnvironment(daemonConfig.env);
```

## 🏗️ **АРХИТЕКТУРА КОМПОНЕНТОВ**

### **1. TicketStructure - Управление структурой**

**КРИТИЧЕСКИЕ ФУНКЦИИ:**
- `create(ticketData)` - Создание тикета с валидацией
- `updateStatus(ticket, status)` - Обновление статуса с временными метками
- `updateProcess(ticket, processData)` - Обновление информации о процессе
- `updateResults(ticket, results)` - Обновление результатов выполнения
- `canExecute(ticket)` - Проверка возможности выполнения
- `shouldRestart(ticket)` - Проверка необходимости перезапуска
- `getNextPipelineStep(ticket)` - Получение следующего шага конвейера

### **2. TicketFactory - Создание типовых тикетов**

**ФАБРИЧНЫЕ МЕТОДЫ:**
```javascript
// Вечный тикет
TicketFactory.createPerpetualTicket(daemonConfig, options)

// Одноразовый тикет  
TicketFactory.createSingleTicket(daemonConfig, options)

// Запланированный вечный тикет
TicketFactory.createScheduledPerpetualTicket(daemonConfig, schedule, options)

// Запланированный одноразовый тикет
TicketFactory.createScheduledSingleTicket(daemonConfig, schedule, options)

// Тикет с конвейером
TicketFactory.createPipelineTicket(daemonConfig, pipelineSteps, options)
```

### **3. TicketQueue - Расширенная система очередей**

**ОСОБЕННОСТИ:**
- **Приоритетные очереди** - отдельные очереди для каждого приоритета
- **Зависимости** - ожидание завершения зависимых тикетов
- **Scheduled тикеты** - автоматическое добавление по расписанию
- **Статистика** - детальная аналитика очереди
- **Callbacks** - события для интеграции с внешними системами

**МЕТОДЫ:**
```javascript
// Добавление тикета
await queue.addTicket(ticket)

// Обработка очереди
await queue.processQueue()

// Проверка scheduled тикетов
await queue.checkScheduledTickets()

// Завершение тикета
await queue.completeTicket(ticketId, result)

// Отмена тикета
await queue.cancelTicket(ticketId)
```

### **4. TicketValidator - Расширенная валидация**

**УРОВНИ ВАЛИДАЦИИ:**
1. **Структурная** - проверка полей и типов
2. **Конфигурационная** - валидация настроек демона
3. **Системная** - проверка путей и прав
4. **Безопасность** - проверка опасных операций
5. **Зависимости** - валидация связей
6. **Расписание** - проверка cron выражений

**МЕТОДЫ:**
```javascript
// Полная валидация тикета
const validation = await validator.validateTicket(ticket)

// Валидация конфигурации демона
const daemonValidation = await validator.validateDaemonConfig(daemonConfig)

// Валидация расписания
const scheduleValidation = validator.validateSchedule(schedule)

// Валидация конвейера
const pipelineValidation = await validator.validatePipeline(pipeline)
```

### **5. TicketSystem - Основная система**

**ИНИЦИАЛИЗАЦИЯ:**
```javascript
const ticketSystem = new TicketSystem({
  dataPath: 'C:/apps/data/tickets',
  maxConcurrentTickets: 5,
  autoStart: false,
  enableValidation: true,
  enableQueue: true
});

await ticketSystem.initialize();
```

**ОСНОВНЫЕ МЕТОДЫ:**
```javascript
// Создание тикета
const ticket = await ticketSystem.createTicket(ticketData)

// Создание типового тикета
const ticket = await ticketSystem.createTicketByType(
  TICKET_TYPES.PERPETUAL, 
  daemonConfig, 
  options
)

// Запуск тикета
await ticketSystem.startTicket(ticketId)

// Остановка тикета
await ticketSystem.stopTicket(ticketId)

// Получение статуса
const status = await ticketSystem.getTicketStatus(ticketId)

// Получение всех тикетов с фильтрами
const tickets = await ticketSystem.getAllTickets({
  status: TICKET_STATUSES.RUNNING,
  systemId: SYSTEM_IDS.UNIFIED_DAEMON,
  type: TICKET_TYPES.PERPETUAL
})
```

## 🔄 **ПРИЧИННО-СЛЕДСТВЕННЫЕ ЦЕПОЧКИ**

### **Цепочка 1: Создание и выполнение тикета**

```
1. Создание тикета через TicketStructure.create()
   ↓
2. Валидация через TicketValidator.validateTicket()
   ↓
3. Сохранение через TicketManager.createTicket()
   ↓
4. Добавление в очередь через TicketQueue.addTicket()
   ↓
5. Обработка очереди через TicketQueue.processQueue()
   ↓
6. Выполнение через TicketExecutor.execute()
   ↓
7. Обновление результатов через TicketStructure.updateResults()
   ↓
8. Завершение через TicketQueue.completeTicket()
```

### **Цепочка 2: Конвейер обработки**

```
1. Проверка зависимостей через TicketQueue.checkDependencies()
   ↓
2. Выполнение шага через TicketStructure.getNextPipelineStep()
   ↓
3. Валидация шага через TicketValidator.validatePipelineStep()
   ↓
4. Выполнение действия (command/file/validation)
   ↓
5. Обновление шага через TicketStructure.updatePipelineStep()
   ↓
6. Переход к следующему шагу или завершение конвейера
```

### **Цепочка 3: Scheduled тикеты**

```
1. Периодическая проверка через TicketQueue.checkScheduledTickets()
   ↓
2. Вычисление следующего времени через calculateNextExecution()
   ↓
3. Проверка времени выполнения через TicketStructure.isScheduledTime()
   ↓
4. Добавление в очередь через TicketQueue.addTicket()
   ↓
5. Обработка как обычного тикета
   ↓
6. Обновление расписания для perpetual тикетов
```

## 📊 **СТАТИСТИКА И МОНИТОРИНГ**

### **Системная статистика:**
```javascript
{
  system: {
    totalTickets: 150,
    activeTickets: 3,
    completedTickets: 120,
    failedTickets: 5,
    queuedTickets: 22,
    systemStartTime: "2024-01-01T00:00:00Z",
    isRunning: true,
    isInitialized: true,
    uptime: 86400000
  },
  executor: {
    totalExecuted: 150,
    currentlyRunning: 3,
    queued: 22,
    killed: 8,
    replaced: 15,
    queueLength: 22,
    maxConcurrent: 5
  },
  queue: {
    totalQueued: 150,
    totalProcessed: 150,
    totalCompleted: 120,
    totalFailed: 5,
    totalCancelled: 3,
    averageWaitTime: 5000,
    averageProcessTime: 30000,
    queueSizes: {
      "1": 2,  // CRITICAL
      "2": 5,  // HIGH
      "3": 10, // NORMAL
      "4": 3,  // LOW
      "5": 2   // BACKGROUND
    }
  },
  validator: {
    totalErrors: 15,
    ticketsWithErrors: 8,
    cacheSize: 50
  }
}
```

## 🚨 **КРИТИЧЕСКИЕ СЦЕНАРИИ**

### **Сценарий 1: Сложный конвейер с зависимостями**

```
Тикет A: Валидация проекта
Тикет B: Создание резервной копии (зависит от A)
Тикет C: Развертывание (зависит от B)
Тикет D: Тестирование (зависит от C)

РЕЗУЛЬТАТ:
- A выполняется первым
- B ждет завершения A
- C ждет завершения B  
- D ждет завершения C
- Все в очереди BACKGROUND до готовности зависимостей
```

### **Сценарий 2: Scheduled тикеты с разными приоритетами**

```
CRITICAL: Мониторинг системы (каждые 5 минут)
HIGH: Резервное копирование (каждый час)
NORMAL: Очистка логов (каждый день)
LOW: Аналитика (каждую неделю)

РЕЗУЛЬТАТ:
- CRITICAL выполняется в первую очередь
- HIGH приоритет над NORMAL и LOW
- Автоматическое добавление по расписанию
- Независимое выполнение каждого типа
```

### **Сценарий 3: Обработка ошибок и перезапуски**

```
Тикет perpetual с autoRestart: true
↓
Выполнение завершается с ошибкой
↓
Проверка shouldRestart() возвращает true
↓
Увеличение retryCount
↓
Ожидание retryDelay
↓
Автоматический перезапуск
↓
Повтор до maxRetries или успеха
```

## ✅ **ПРЕИМУЩЕСТВА РАСШИРЕННОЙ АРХИТЕКТУРЫ**

### **1. Полный жизненный цикл**
- Детальное отслеживание всех этапов
- Временные метки для каждого события
- Результаты выполнения с метриками
- История изменений

### **2. Система ID и интеграция**
- Четкое разделение систем
- Возможность фильтрации по системе
- Готовность к распределенному выполнению
- Конвейер обработки между системами

### **3. Расширенная валидация**
- Многоуровневая проверка
- Проверка безопасности
- Валидация зависимостей
- Предупреждения и рекомендации

### **4. Гибкая система очередей**
- Приоритетная обработка
- Поддержка зависимостей
- Scheduled тикеты
- Детальная статистика

### **5. Конвейер обработки**
- Пошаговое выполнение
- Проверка условий
- Обработка ошибок
- Гибкая конфигурация

## 🔮 **БУДУЩИЕ ВОЗМОЖНОСТИ**

### **Сетевая интеграция (3.0.0):**
```javascript
{
  "execution": {
    "host": "auto|localhost|192.168.1.100",
    "hostType": "local|remote|cluster",
    "assignedTo": "daemon-id|worker-id|node-id"
  },
  "distribution": {
    "targetHosts": ["192.168.1.100", "192.168.1.101"],
    "loadBalancing": "least-loaded|round-robin|priority-based"
  },
  "failover": {
    "strategy": "retry|redirect|degrade",
    "maxFailures": 3,
    "backupHosts": ["192.168.1.102"]
  }
}
```

### **Компоненты для будущего:**
1. **HostManager** - Обнаружение и управление хостами
2. **NetworkManager** - Сетевая коммуникация и синхронизация
3. **LoadBalancer** - Балансировка нагрузки между хостами
4. **FailoverStrategy** - Стратегии отказоустойчивости
5. **DistributedQueue** - Распределенная очередь тикетов

## 📋 **СЛЕДУЮЩИЕ ШАГИ**

### **Неделя 1: Тестирование компонентов**
- [ ] Unit-тесты для TicketStructure
- [ ] Unit-тесты для TicketFactory
- [ ] Unit-тесты для TicketQueue
- [ ] Unit-тесты для TicketValidator
- [ ] Integration-тесты для TicketSystem

### **Неделя 2: Unified Daemon интеграция**
- [ ] UnifiedDaemonManager.js
- [ ] DaemonProcessManager.js
- [ ] DaemonConfigManager.js
- [ ] DaemonCLI.js
- [ ] Интеграция с TicketSystem

### **Неделя 3: Тестирование системы**
- [ ] Тестирование жизненного цикла тикетов
- [ ] Тестирование системы очередей
- [ ] Тестирование конвейера обработки
- [ ] Тестирование валидации
- [ ] Нагрузочное тестирование

### **Неделя 4: Миграция и документация**
- [ ] Миграция существующих демонов
- [ ] Создание примеров использования
- [ ] Обновление документации
- [ ] Создание CLI интерфейса
- [ ] Интеграция с projects-manager

## 🎯 **ЗАКЛЮЧЕНИЕ**

Создана мощная расширенная система с полным жизненным циклом тикетов:

1. **Полный жизненный цикл** - от создания до завершения
2. **Система ID** - четкое разделение и интеграция
3. **Конвейер обработки** - сложные многошаговые операции
4. **Расширенная валидация** - многоуровневая проверка
5. **Гибкая система очередей** - приоритеты и зависимости
6. **Scheduled тикеты** - автоматическое выполнение по расписанию
7. **Детальная статистика** - полная аналитика системы
8. **Готовность к масштабированию** - архитектура для будущего

Система готова к использованию и дальнейшему развитию с учетом всех требований и будущих возможностей.
