/**
 * Пример базового использования Thread Manager
 */

const { ThreadManager } = require('../index');

async function basicExample() {
  console.log('🚀 Запуск примера Thread Manager...\n');

  // Создание менеджера потоков
  const threadManager = new ThreadManager({
    maxConcurrency: 3,
    defaultPriority: 'normal',
    enableMonitoring: true,
    retryAttempts: 2,
    taskTimeout: 10000
  });

  // Настройка обработчиков событий
  threadManager.on('started', () => {
    console.log('✅ ThreadManager запущен');
  });

  threadManager.on('task:queued', (task) => {
    console.log(`📋 Задача добавлена в очередь: ${task.id} (приоритет: ${task.priority})`);
  });

  threadManager.on('task:start', (task) => {
    console.log(`▶️  Задача началась: ${task.id}`);
  });

  threadManager.on('task:complete', (task, result) => {
    console.log(`✅ Задача завершена: ${task.id} - Результат: ${JSON.stringify(result)}`);
  });

  threadManager.on('task:error', (task, error) => {
    console.error(`❌ Ошибка задачи: ${task.id} - ${error.message}`);
  });

  threadManager.on('metrics:update', (metrics) => {
    console.log(`📊 Метрики: CPU ${metrics.cpu.usage.toFixed(1)}%, Memory ${metrics.memory.percentage.toFixed(1)}%, Throughput ${metrics.throughput.tasksPerSecond.toFixed(2)} tasks/s`);
  });

  // Запуск менеджера
  await threadManager.start();

  // Добавление задач с разными приоритетами
  console.log('\n📝 Добавление задач...\n');

  // Критическая задача (выполнится первой)
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется критическая задача с данными: ${data.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { status: 'critical_completed', data };
    },
    data: { message: 'Критическая задача' },
    priority: 'critical',
    timeout: 5000
  });

  // Высокий приоритет
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется задача высокого приоритета: ${data.task}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return { status: 'high_completed', task: data.task };
    },
    data: { task: 'Важная обработка' },
    priority: 'high',
    timeout: 5000
  });

  // Обычный приоритет
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется обычная задача: ${data.operation}`);
      await new Promise(resolve => setTimeout(resolve, 600));
      return { status: 'normal_completed', operation: data.operation };
    },
    data: { operation: 'Стандартная операция' },
    priority: 'normal',
    timeout: 5000
  });

  // Низкий приоритет
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется задача низкого приоритета: ${data.process}`);
      await new Promise(resolve => setTimeout(resolve, 400));
      return { status: 'low_completed', process: data.process };
    },
    data: { process: 'Фоновая обработка' },
    priority: 'low',
    timeout: 5000
  });

  // Фоновый приоритет
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется фоновая задача: ${data.background}`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { status: 'background_completed', background: data.background };
    },
    data: { background: 'Очистка кэша' },
    priority: 'background',
    timeout: 5000
  });

  // Задача с ошибкой (для демонстрации повторных попыток)
  await threadManager.addTask({
    function: async (data) => {
      console.log(`   Выполняется задача с ошибкой (попытка ${data.attempt || 1})`);
      if (!data.attempt || data.attempt < 2) {
        throw new Error('Имитация ошибки для демонстрации повторных попыток');
      }
      return { status: 'error_recovered', attempt: data.attempt };
    },
    data: { attempt: 1 },
    priority: 'normal',
    retryAttempts: 3,
    timeout: 5000
  });

  // Ожидание завершения всех задач
  console.log('\n⏳ Ожидание завершения задач...\n');
  
  // Ждем некоторое время для выполнения задач
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Получение статистики
  console.log('\n📈 Статистика выполнения:\n');
  const stats = threadManager.getStats();
  console.log('Общая статистика:', {
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
    activeTasks: stats.activeTasks,
    queuedTasks: stats.queuedTasks
  });

  console.log('\nСтатистика очереди:', stats.queue);
  console.log('\nСтатистика пула воркеров:', stats.workerPool);

  if (stats.monitor) {
    console.log('\nМетрики мониторинга:', {
      cpu: `${stats.monitor.cpu.usage.toFixed(1)}%`,
      memory: `${stats.monitor.memory.percentage.toFixed(1)}%`,
      throughput: `${stats.monitor.throughput.tasksPerSecond.toFixed(2)} tasks/s`
    });
  }

  // Остановка менеджера
  console.log('\n🛑 Остановка ThreadManager...\n');
  await threadManager.stop();

  console.log('✅ Пример завершен!');
}

// Запуск примера
if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample };
