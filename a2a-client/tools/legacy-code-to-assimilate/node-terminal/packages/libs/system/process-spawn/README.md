# Process Spawn Library

Универсальная библиотека для запуска процессов с полным контролем и мониторингом.

## 🎯 Особенности

- **Универсальный spawn** - поддержка spawn, exec, execFile без PowerShell
- **Job ID система** - уникальные идентификаторы для каждого процесса
- **Мониторинг ресурсов** - CPU, память с настраиваемыми лимитами
- **Graceful shutdown** - мягкое завершение с таймаутом 10 секунд
- **JSON логирование** - все операции и вывод в JSON формате
- **Автоматическая очистка** - завершенных процессов и логов

## 📦 Установка

```javascript
const { ProcessSpawner } = require('@libs/system/process-spawn');
```

## 🚀 Быстрый старт

```javascript
const { ProcessSpawner } = require('@libs/system/process-spawn');

// Создание spawner
const spawner = new ProcessSpawner();

// Инициализация
await spawner.initialize();

// Запуск процесса
const result = await spawner.spawn({
  command: 'npm start',
  daemonId: 'projects-manager',
  cwd: 'C:/apps/root/projects-manager',
  type: 'spawn',
  options: {
    monitorResources: true,
    logOutput: true,
    autoKill: true
  },
  limits: {
    cpuPercent: 75,
    memoryMB: 10240,
    timeoutMs: 600000
  }
});

console.log(`Процесс запущен: ${result.jobId} (PID: ${result.pid})`);
```

## 📋 API

### ProcessSpawner

#### Конструктор
```javascript
const spawner = new ProcessSpawner({
  jobManager: {
    jobsFile: 'C:/apps/data/spawn-jobs.json',
    cleanupInterval: 300000,
    maxJobAge: 86400000
  },
  processMonitor: {
    monitoringInterval: 5000,
    logFile: 'C:/apps/logs/process-monitor.json'
  },
  processKiller: {
    gracefulTimeout: 10000,
    forceTimeout: 5000,
    logFile: 'C:/apps/logs/process-killer.json'
  },
  logFile: 'C:/apps/logs/process-spawner.json'
});
```

#### Методы

##### `initialize()`
Инициализация всех компонентов.

##### `spawn(config)`
Запуск процесса с конфигурацией.

**Параметры:**
- `command` (string) - команда для выполнения
- `daemonId` (string) - ID демона (обязательно)
- `args` (array) - аргументы команды
- `cwd` (string) - рабочая директория
- `env` (object) - переменные окружения
- `type` (string) - тип запуска: 'spawn', 'exec', 'execFile'
- `options` (object) - опции запуска
- `limits` (object) - лимиты ресурсов

**Возвращает:**
```javascript
{
  jobId: 'job-1703123456789-abc123def',
  pid: 1234,
  status: 'running',
  config: { ... }
}
```

##### `stopProcess(jobId, killType)`
Остановка процесса.

**Параметры:**
- `jobId` (string) - ID процесса
- `killType` (string) - тип завершения: 'graceful', 'force', 'immediate'

##### `getProcessStatus(jobId)`
Получение статуса процесса.

##### `getAllProcesses()`
Получение всех запущенных процессов.

##### `getStats()`
Получение статистики.

##### `stop()`
Остановка spawner и всех процессов.

## ⚙️ Конфигурация

### Лимиты ресурсов по умолчанию

```javascript
{
  cpuPercent: 75,      // Максимум 75% CPU
  memoryMB: 10240,     // Максимум 10GB памяти
  timeoutMs: 600000,   // 10 минут таймаут
  gracefulTimeout: 10000 // 10 секунд на graceful shutdown
}
```

### Опции запуска

```javascript
{
  autoKill: true,           // Автоматическое завершение при превышении лимитов
  monitorResources: true,   // Мониторинг ресурсов
  logOutput: true,          // Логирование вывода
  timeout: 600000,          // Таймаут выполнения
  gracefulTimeout: 10000    // Таймаут graceful shutdown
}
```

## 📊 Мониторинг

### Получение статистики

```javascript
const stats = spawner.getStats();
console.log(stats);
// {
//   runningProcesses: 2,
//   jobManager: {
//     totalJobs: 5,
//     activeJobs: 2,
//     completedJobs: 2,
//     failedJobs: 1
//   },
//   processMonitor: {
//     monitoredProcesses: 2,
//     notifications: 0
//   },
//   processKiller: 3
// }
```

### Получение уведомлений

```javascript
const notifications = spawner.processMonitor.getNotifications();
console.log(notifications);
```

## 🔧 Примеры использования

### Запуск Node.js приложения

```javascript
const result = await spawner.spawn({
  command: 'node',
  args: ['app.js'],
  daemonId: 'my-app',
  cwd: '/path/to/app',
  env: {
    NODE_ENV: 'production',
    PORT: '3000'
  },
  type: 'spawn',
  options: {
    monitorResources: true,
    logOutput: true
  },
  limits: {
    cpuPercent: 50,
    memoryMB: 5120,
    timeoutMs: 300000
  }
});
```

### Запуск команды с exec

```javascript
const result = await spawner.spawn({
  command: 'npm install',
  daemonId: 'npm-install',
  cwd: '/path/to/project',
  type: 'exec',
  options: {
    logOutput: true
  }
});
```

### Запуск исполняемого файла

```javascript
const result = await spawner.spawn({
  command: '/path/to/executable',
  args: ['--config', 'config.json'],
  daemonId: 'my-service',
  type: 'execFile',
  options: {
    monitorResources: true
  }
});
```

## 📁 Структура файлов

```
C:/apps/data/
├── spawn-jobs.json          # Информация о всех процессах
└── unified-daemon-pids.json # PID файл для демонов

C:/apps/logs/
├── process-spawner.json     # Логи spawner
├── process-monitor.json     # Логи мониторинга
└── process-killer.json      # Логи завершения
```

## 🚨 Обработка ошибок

```javascript
try {
  const result = await spawner.spawn(config);
} catch (error) {
  if (error.message.includes('валидации')) {
    console.error('Ошибка конфигурации:', error.message);
  } else if (error.message.includes('не инициализирован')) {
    console.error('Spawner не инициализирован');
  } else {
    console.error('Ошибка запуска процесса:', error);
  }
}
```

## 🔄 Интеграция с демонами

```javascript
// В TicketExecutor.js
const { ProcessSpawner } = require('@libs/system/process-spawn');

class TicketExecutor {
  constructor() {
    this.spawner = new ProcessSpawner();
  }

  async execute(ticket) {
    const result = await this.spawner.spawn({
      command: ticket.daemonConfig.command,
      daemonId: ticket.daemonConfig.name,
      cwd: ticket.daemonConfig.cwd,
      env: ticket.daemonConfig.env,
      args: ticket.daemonConfig.args,
      type: 'spawn',
      options: {
        monitorResources: true,
        logOutput: true,
        autoKill: true
      }
    });

    return result;
  }
}
```

## 📈 Производительность

- **Мониторинг каждые 5 секунд** - минимальная нагрузка на систему
- **Автоматическая очистка** - старые записи удаляются автоматически
- **JSON логирование** - быстрая запись и чтение
- **Graceful shutdown** - предотвращение потери данных

## 🔒 Безопасность

- **Валидация конфигурации** - проверка всех параметров
- **Лимиты ресурсов** - предотвращение перегрузки системы
- **Graceful shutdown** - корректное завершение процессов
- **Логирование** - полная трассировка всех операций

