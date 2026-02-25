/**
 * Пример интеграции Thread Manager с существующими библиотеками проекта
 */

const { ThreadManager, TaskExecutor } = require('../index');

// Имитация существующих библиотек проекта
const mockSpawnManager = {
  spawnProcess: async (command, args) => {
    console.log(`   🔧 SpawnManager: выполняется команда ${command} ${args.join(' ')}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { pid: Math.floor(Math.random() * 1000), status: 'started' };
  }
};

const mockLoggerManager = {
  info: (message, data) => console.log(`   📝 Logger: INFO - ${message}`, data),
  error: (message, data) => console.error(`   ❌ Logger: ERROR - ${message}`, data),
  warn: (message, data) => console.warn(`   ⚠️  Logger: WARN - ${message}`, data)
};

const mockProcessManager = {
  getProcesses: async () => {
    return [
      { pid: 1001, name: 'node', status: 'running' },
      { pid: 1002, name: 'nginx', status: 'running' },
      { pid: 1003, name: 'mysql', status: 'stopped' }
    ];
  },
  killProcess: async (pid) => {
    console.log(`   🛑 ProcessManager: завершение процесса ${pid}`);
    return { success: true, pid };
  }
};

async function integrationExample() {
  console.log('🔗 Запуск примера интеграции Thread Manager...\n');

  // Создание менеджера потоков с интеграцией
  const threadManager = new ThreadManager({
    maxConcurrency: 4,
    defaultPriority: 'normal',
    enableMonitoring: true,
    retryAttempts: 2,
    taskTimeout: 15000
  });

  const executor = new TaskExecutor({
    defaultTimeout: 10000,
    defaultRetries: 2
  });

  // Настройка обработчиков событий с интеграцией логгера
  threadManager.on('started', () => {
    mockLoggerManager.info('ThreadManager запущен', { timestamp: new Date().toISOString() });
  });

  threadManager.on('task:start', (task) => {
    mockLoggerManager.info('Задача началась', { taskId: task.id, priority: task.priority });
  });

  threadManager.on('task:complete', (task, result) => {
    mockLoggerManager.info('Задача завершена', { taskId: task.id, result });
  });

  threadManager.on('task:error', (task, error) => {
    mockLoggerManager.error('Ошибка задачи', { taskId: task.id, error: error.message });
  });

  threadManager.on('metrics:update', (metrics) => {
    if (metrics.cpu.usage > 70) {
      mockLoggerManager.warn('Высокая нагрузка на CPU', { cpu: metrics.cpu.usage });
    }
  });

  // Запуск менеджера
  await threadManager.start();

  console.log('\n📝 Добавление интегрированных задач...\n');

  // Задача с интеграцией SpawnManager
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   🚀 Запуск процесса через SpawnManager: ${data.service}`);
      const result = await mockSpawnManager.spawnProcess(data.command, data.args);
      return { service: data.service, spawnResult: result };
    },
    data: {
      service: 'web-server',
      command: 'node',
      args: ['server.js', '--port', '3000']
    },
    priority: 'high',
    timeout: 10000
  });

  // Задача с интеграцией ProcessManager
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   📊 Получение списка процессов через ProcessManager`);
      const processes = await mockProcessManager.getProcesses();
      
      // Анализ процессов
      const running = processes.filter(p => p.status === 'running');
      const stopped = processes.filter(p => p.status === 'stopped');
      
      return {
        total: processes.length,
        running: running.length,
        stopped: stopped.length,
        processes: processes.map(p => ({ pid: p.pid, name: p.name, status: p.status }))
      };
    },
    data: { action: 'monitor' },
    priority: 'normal',
    timeout: 5000
  });

  // Задача с интеграцией LoggerManager
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   📝 Выполнение задачи логирования: ${data.operation}`);
      
      // Имитация различных операций логирования
      switch (data.operation) {
        case 'backup':
          mockLoggerManager.info('Создание резервной копии', { timestamp: new Date().toISOString() });
          await new Promise(resolve => setTimeout(resolve, 800));
          return { operation: 'backup', status: 'completed', files: 15 };
          
        case 'cleanup':
          mockLoggerManager.info('Очистка старых логов', { timestamp: new Date().toISOString() });
          await new Promise(resolve => setTimeout(resolve, 600));
          return { operation: 'cleanup', status: 'completed', removed: 8 };
          
        default:
          throw new Error(`Неизвестная операция: ${data.operation}`);
      }
    },
    data: { operation: 'backup' },
    priority: 'low',
    timeout: 8000
  });

  // Задача с HTTP запросом (имитация API интеграции)
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   🌐 Выполнение HTTP запроса: ${data.endpoint}`);
      
      // Имитация HTTP запроса
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: {
              endpoint: data.endpoint,
              timestamp: new Date().toISOString(),
              result: 'success'
            }
          });
        }, 700);
      });
      
      mockLoggerManager.info('HTTP запрос выполнен', { endpoint: data.endpoint, status: response.status });
      return response;
    },
    data: { endpoint: '/api/status' },
    priority: 'high',
    timeout: 5000
  });

  // Задача с обработкой файлов (имитация file-manager)
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   📁 Обработка файлов: ${data.directory}`);
      
      // Имитация обработки файлов
      const files = ['file1.txt', 'file2.json', 'file3.log'];
      const results = [];
      
      for (const file of files) {
        await new Promise(resolve => setTimeout(resolve, 200));
        results.push({
          file,
          processed: true,
          size: Math.floor(Math.random() * 1000) + 100
        });
      }
      
      mockLoggerManager.info('Файлы обработаны', { directory: data.directory, count: results.length });
      return { directory: data.directory, files: results };
    },
    data: { directory: '/var/log/app' },
    priority: 'normal',
    timeout: 10000
  });

  // Задача с интеграцией нескольких менеджеров
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   🔄 Комплексная задача: ${data.operation}`);
      
      const results = {};
      
      // Шаг 1: Получение списка процессов
      results.processes = await mockProcessManager.getProcesses();
      
      // Шаг 2: Запуск нового процесса
      results.spawn = await mockSpawnManager.spawnProcess('npm', ['start']);
      
      // Шаг 3: Логирование результатов
      mockLoggerManager.info('Комплексная задача выполнена', results);
      
      return results;
    },
    data: { operation: 'system-maintenance' },
    priority: 'critical',
    timeout: 12000
  });

  // Задача с обработкой ошибок и повторными попытками
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   🔄 Задача с повторными попытками: ${data.service}`);
      
      // Имитация неустойчивого сервиса
      if (Math.random() < 0.7) {
        throw new Error(`Сервис ${data.service} временно недоступен`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { service: data.service, status: 'available' };
    },
    data: { service: 'database' },
    priority: 'high',
    retryAttempts: 3,
    timeout: 8000
  });

  // Ожидание завершения всех задач
  console.log('\n⏳ Ожидание завершения интегрированных задач...\n');
  
  // Ждем 15 секунд для выполнения задач
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Получение финальной статистики
  console.log('\n📈 Финальная статистика интеграции:\n');
  const stats = threadManager.getStats();
  
  mockLoggerManager.info('Статистика выполнения', {
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
    successRate: ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1) + '%'
  });

  console.log('Общая статистика:', {
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
    activeTasks: stats.activeTasks,
    queuedTasks: stats.queuedTasks
  });

  if (stats.monitor) {
    console.log('\nМетрики производительности:', {
      cpu: `${stats.monitor.cpu.usage.toFixed(1)}%`,
      memory: `${stats.monitor.memory.percentage.toFixed(1)}%`,
      throughput: `${stats.monitor.throughput.tasksPerSecond.toFixed(2)} tasks/s`,
      errorRate: `${stats.monitor.errors.rate.toFixed(3)} errors/s`
    });
  }

  // Демонстрация интеграции с TaskExecutor
  console.log('\n🔧 Демонстрация TaskExecutor интеграции:\n');
  
  const batchResults = await executor.executeBatch([
    {
      function: async () => {
        const processes = await mockProcessManager.getProcesses();
        return { type: 'process-list', count: processes.length };
      }
    },
    {
      function: async () => {
        const result = await mockSpawnManager.spawnProcess('echo', ['hello']);
        return { type: 'spawn', result };
      }
    },
    {
      function: async () => {
        mockLoggerManager.info('Batch task executed', { timestamp: new Date().toISOString() });
        return { type: 'logging', status: 'logged' };
      }
    }
  ], { concurrency: 2 });

  console.log('Результаты пакетного выполнения:', {
    successful: batchResults.results.length,
    failed: batchResults.errors.length,
    results: batchResults.results.map(r => r.result)
  });

  // Остановка менеджера
  console.log('\n🛑 Остановка ThreadManager...\n');
  await threadManager.stop();

  mockLoggerManager.info('ThreadManager остановлен', { timestamp: new Date().toISOString() });

  console.log('✅ Пример интеграции завершен!');
}

// Запуск примера
if (require.main === module) {
  integrationExample().catch(console.error);
}

export { integrationExample };
