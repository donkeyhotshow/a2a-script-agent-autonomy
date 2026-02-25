/**
 * Пример использования планировщика задач
 */

const { TaskScheduler, TaskExecutor } = require('../index');

async function schedulerExample() {
  console.log('📅 Запуск примера планировщика задач...\n');

  // Создание планировщика и исполнителя
  const scheduler = new TaskScheduler({
    checkInterval: 1000, // Проверка каждую секунду
    maxScheduledTasks: 100
  });

  const executor = new TaskExecutor({
    defaultTimeout: 10000,
    defaultRetries: 2
  });

  // Настройка обработчиков событий
  scheduler.on('started', () => {
    console.log('✅ Планировщик запущен');
  });

  scheduler.on('task:scheduled', (scheduledTask) => {
    console.log(`📋 Задача запланирована: ${scheduledTask.id} (следующее выполнение: ${new Date(scheduledTask.nextExecution).toLocaleTimeString()})`);
  });

  scheduler.on('task:execute', (scheduledTask) => {
    console.log(`▶️  Выполняется запланированная задача: ${scheduledTask.id}`);
  });

  scheduler.on('task:completed', (scheduledTask) => {
    console.log(`✅ Запланированная задача завершена: ${scheduledTask.id} (выполнений: ${scheduledTask.executions})`);
  });

  executor.on('execution:start', (execution) => {
    console.log(`   🚀 Начало выполнения: ${execution.task.id}`);
  });

  executor.on('execution:complete', (execution, result) => {
    console.log(`   ✅ Выполнение завершено: ${execution.task.id} - ${JSON.stringify(result)}`);
  });

  executor.on('execution:error', (execution, error) => {
    console.error(`   ❌ Ошибка выполнения: ${execution.task.id} - ${error.message}`);
  });

  // Запуск планировщика
  await scheduler.start();

  console.log('\n📝 Планирование задач...\n');

  // Задача с интервалом (каждые 3 секунды, максимум 5 выполнений)
  const intervalTaskId = scheduler.schedule(
    {
      function: async (data) => {
        const now = new Date().toLocaleTimeString();
        console.log(`   ⏰ Интервальная задача выполнена в ${now} (${data.counter} раз)`);
        return { type: 'interval', timestamp: now, counter: data.counter };
      },
      data: { counter: 0 }
    },
    {
      type: 'interval',
      interval: 3000, // 3 секунды
      maxExecutions: 5
    }
  );

  // Задача с cron-выражением (каждые 5 секунд)
  const cronTaskId = scheduler.schedule(
    {
      function: async (data) => {
        const now = new Date().toLocaleTimeString();
        console.log(`   🕐 Cron задача выполнена в ${now}`);
        return { type: 'cron', timestamp: now };
      },
      data: { message: 'Cron task' }
    },
    '*/5 * * * * *' // Каждые 5 секунд (расширенный cron формат)
  );

  // Одноразовая задача через 10 секунд
  const oneTimeTaskId = scheduler.schedule(
    {
      function: async (data) => {
        const now = new Date().toLocaleTimeString();
        console.log(`   🎯 Одноразовая задача выполнена в ${now}`);
        return { type: 'one-time', timestamp: now, message: data.message };
      },
      data: { message: 'Это одноразовая задача' }
    },
    {
      at: new Date(Date.now() + 10000) // Через 10 секунд
    }
  );

  // Задача с повторяющимся интервалом и обновлением данных
  const dataUpdateTaskId = scheduler.schedule(
    {
      function: async (data) => {
        data.counter = (data.counter || 0) + 1;
        const now = new Date().toLocaleTimeString();
        console.log(`   📊 Задача обновления данных выполнена в ${now} (счетчик: ${data.counter})`);
        
        // Обновляем данные в задаче
        return { type: 'data-update', timestamp: now, counter: data.counter };
      },
      data: { counter: 0 }
    },
    {
      type: 'interval',
      interval: 4000, // 4 секунды
      maxExecutions: 3
    }
  );

  // Задача с HTTP запросом (каждые 8 секунд)
  const httpTaskId = scheduler.schedule(
    {
      function: async (data) => {
        try {
          // Имитация HTTP запроса
          const response = await new Promise(resolve => {
            setTimeout(() => {
              resolve({ status: 200, data: { message: 'Mock API response' } });
            }, 500);
          });
          
          const now = new Date().toLocaleTimeString();
          console.log(`   🌐 HTTP задача выполнена в ${now} - ${response.status}`);
          return { type: 'http', timestamp: now, response };
        } catch (error) {
          console.error(`   ❌ HTTP ошибка: ${error.message}`);
          throw error;
        }
      },
      data: { url: 'https://api.example.com/status' }
    },
    {
      type: 'interval',
      interval: 8000, // 8 секунд
      maxExecutions: 2
    }
  );

  // Задача с командой (каждые 12 секунд)
  const commandTaskId = scheduler.schedule(
    {
      function: async (data) => {
        try {
          // Имитация выполнения команды
          const result = await new Promise(resolve => {
            setTimeout(() => {
              resolve({ stdout: 'Command executed successfully', stderr: '', code: 0 });
            }, 300);
          });
          
          const now = new Date().toLocaleTimeString();
          console.log(`   💻 Команда выполнена в ${now} - код: ${result.code}`);
          return { type: 'command', timestamp: now, result };
        } catch (error) {
          console.error(`   ❌ Ошибка команды: ${error.message}`);
          throw error;
        }
      },
      data: { command: 'echo "Hello from scheduled task"' }
    },
    {
      type: 'interval',
      interval: 12000, // 12 секунд
      maxExecutions: 2
    }
  );

  // Ожидание выполнения задач
  console.log('\n⏳ Ожидание выполнения запланированных задач...\n');
  
  // Ждем 30 секунд для выполнения всех задач
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Получение статистики
  console.log('\n📈 Статистика планировщика:\n');
  const schedulerStats = scheduler.getStats();
  console.log('Статистика планировщика:', schedulerStats);

  console.log('\n📋 Активные запланированные задачи:');
  const activeTasks = scheduler.getAllTasks();
  activeTasks.forEach(task => {
    console.log(`   - ${task.id}: ${task.schedule.type}, выполнений: ${task.executions}/${task.maxExecutions}, следующее: ${new Date(task.nextExecution).toLocaleTimeString()}`);
  });

  // Демонстрация отмены задачи
  console.log('\n❌ Отмена задачи...');
  const cancelled = scheduler.cancel(intervalTaskId);
  console.log(`Задача ${intervalTaskId} отменена: ${cancelled}`);

  // Демонстрация обновления расписания
  console.log('\n🔄 Обновление расписания...');
  const updated = scheduler.updateSchedule(cronTaskId, {
    type: 'interval',
    interval: 2000 // Изменяем на каждые 2 секунды
  });
  console.log(`Расписание задачи ${cronTaskId} обновлено: ${updated}`);

  // Ждем еще 10 секунд для демонстрации обновленного расписания
  console.log('\n⏳ Ожидание с обновленным расписанием...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Остановка планировщика
  console.log('\n🛑 Остановка планировщика...\n');
  await scheduler.stop();

  console.log('✅ Пример планировщика завершен!');
}

// Запуск примера
if (require.main === module) {
  schedulerExample().catch(console.error);
}

export { schedulerExample };
