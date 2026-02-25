const EventEmitter = require('eventemitter3');

class WorkerTaskExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.errorHandler = options.errorHandler || console;
    this.testRunner = options.testRunner; // Instance of TestingUtils
    this.maxConcurrentTests = options.maxConcurrentTests || 3;

    this.currentTasks = new Map();
    this.taskQueue = [];
    this.taskProcessingInterval = null;

    if (!this.testRunner) {
      throw new Error('TestRunner не инициализирован в WorkerTaskExecutor');
    }
  }

  startTaskProcessing() {
    if (this.taskProcessingInterval) {
      this.logger.warn('Обработка задач уже запущена');
      return;
    }
    this.taskProcessingInterval = setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Проверка каждую секунду

    this.logger.info('Обработка задач запущена');
  }

  stopTaskProcessing() {
    if (this.taskProcessingInterval) {
      clearInterval(this.taskProcessingInterval);
      this.taskProcessingInterval = null;
      this.logger.info('Обработка задач остановлена');
    }
  }

  async processTaskQueue() {
    if (this.taskQueue.length === 0 || this.currentTasks.size >= this.maxConcurrentTests) {
      return;
    }

    const task = this.taskQueue.shift();

    try {
      await this.executeTask(task);
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'WorkerTaskExecutor.processTaskQueue',
        taskId: task.id
      });
    }
  }

  addTask(task) {
    this.taskQueue.push({
      ...task,
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      status: 'queued'
    });

    this.logger.info('Задача добавлена в очередь', {
      taskId: task.id,
      queueLength: this.taskQueue.length
    });

    this.emit('taskAdded', task);
  }

  async executeTask(task) {
    this.logger.info('Выполнение задачи', { taskId: task.id, type: task.type });

    try {
      task.status = 'running';
      task.startedAt = Date.now();
      this.currentTasks.set(task.id, task);

      this.emit('taskStarted', task);

      let result;

      switch (task.type) {
        case 'test':
          result = await this.testRunner.runTest(task.testPath, task.options);
          break;
        case 'test-suite':
          // Предполагаем, что runTestSuite также делегируется TestRunner
          result = await this.testRunner.runTestSuite(task);
          break;
        case 'test-scan':
          result = await this.testRunner.findTestFiles(task.scanPath, task.patterns); // TestFileFinder интегрирован в TestingUtils
          break;
        default:
          throw new Error(`Неизвестный тип задачи: ${task.type}`);
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      task.duration = task.completedAt - task.startedAt;

      this.currentTasks.delete(task.id);
      this.emit('taskCompleted', task);

      this.logger.info('Задача выполнена', {
        taskId: task.id,
        duration: task.duration,
        success: result.success
      });

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      task.error = error.message;
      task.duration = task.completedAt - task.startedAt;

      this.currentTasks.delete(task.id);
      this.emit('taskFailed', task);

      this.errorHandler.handleError(error, {
        context: 'WorkerTaskExecutor.executeTask',
        taskId: task.id
      });
    }
  }

  async stop() {
    this.stopTaskProcessing();
    // Ожидание завершения текущих задач
    if (this.currentTasks.size > 0) {
      this.logger.info('Ожидание завершения задач', { count: this.currentTasks.size });

      await Promise.all(
        Array.from(this.currentTasks.values()).map(task =>
          new Promise(resolve => {
            const checkComplete = () => {
              if (task.status === 'completed' || task.status === 'failed') {
                resolve();
              } else {
                setTimeout(checkComplete, 100);
              }
            };
            checkComplete();
          })
        )
      );
    }
    this.logger.info('Все текущие задачи завершены.');
  }

  getCurrentTasksCount() {
    return this.currentTasks.size;
  }

  getQueueLength() {
    return this.taskQueue.length;
  }

  setTestRunner(testRunner) {
    this.testRunner = testRunner;
  }
}

export { WorkerTaskExecutor };
