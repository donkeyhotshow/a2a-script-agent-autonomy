const { WorkerTaskExecutor } = require('../index.js');

// TODO: Создать полные тесты для WorkerTaskExecutor
describe('WorkerTaskExecutor', () => {
  let executor;
  let mockLogger;
  let mockErrorHandler;
  let mockTestRunner;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockErrorHandler = {
      handleError: jest.fn()
    };

    mockTestRunner = {
      runTest: jest.fn(),
      runTestSuite: jest.fn(),
      findTestFiles: jest.fn()
    };

    executor = new WorkerTaskExecutor({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      testRunner: mockTestRunner,
      maxConcurrentTests: 2
    });
  });

  afterEach(() => {
    executor.stopTaskProcessing();
    executor.taskQueue = [];
    executor.currentTasks.clear();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    test('should initialize with required dependencies', () => {
      // TODO: Протестировать инициализацию с обязательными зависимостями
      expect(executor.logger).toBe(mockLogger);
      expect(executor.errorHandler).toBe(mockErrorHandler);
      expect(executor.testRunner).toBe(mockTestRunner);
      expect(executor.maxConcurrentTests).toBe(2);
      expect(executor.currentTasks).toBeInstanceOf(Map);
      expect(executor.taskQueue).toEqual([]);
    });

    test('should initialize with default options', () => {
      // TODO: Протестировать инициализацию с дефолтными опциями
      const defaultExecutor = new WorkerTaskExecutor({
        testRunner: mockTestRunner
      });

      expect(defaultExecutor.logger).toBe(console);
      expect(defaultExecutor.errorHandler).toBe(console);
      expect(defaultExecutor.maxConcurrentTests).toBe(3);
    });

    test('should throw error without testRunner', () => {
      // TODO: Протестировать выброс ошибки без testRunner
      expect(() => new WorkerTaskExecutor({})).toThrow('TestRunner не инициализирован');
    });
  });

  describe('task processing lifecycle', () => {
    test('should start task processing', () => {
      // TODO: Протестировать запуск обработки задач
      expect(executor.taskProcessingInterval).toBeNull();

      executor.startTaskProcessing();

      expect(executor.taskProcessingInterval).not.toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Обработка задач запущена');
    });

    test('should not start if already running', () => {
      // TODO: Протестировать отсутствие повторного запуска
      executor.startTaskProcessing();
      const firstInterval = executor.taskProcessingInterval;

      mockLogger.warn.mockClear();

      executor.startTaskProcessing();

      expect(executor.taskProcessingInterval).toBe(firstInterval);
      expect(mockLogger.warn).toHaveBeenCalledWith('Обработка задач уже запущена');
    });

    test('should stop task processing', () => {
      // TODO: Протестировать остановку обработки задач
      executor.startTaskProcessing();
      expect(executor.taskProcessingInterval).not.toBeNull();

      executor.stopTaskProcessing();

      expect(executor.taskProcessingInterval).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Обработка задач остановлена');
    });

    test('should handle stop when not running', () => {
      // TODO: Протестировать остановку при неактивной обработке
      expect(executor.taskProcessingInterval).toBeNull();

      executor.stopTaskProcessing();

      expect(executor.taskProcessingInterval).toBeNull();
    });
  });

  describe('addTask', () => {
    test('should add task to queue with generated ID', () => {
      // TODO: Протестировать добавление задачи в очередь с сгенерированным ID
      const taskData = {
        type: 'test',
        testPath: '/path/to/test.js'
      };

      executor.addTask(taskData);

      expect(executor.taskQueue).toHaveLength(1);
      expect(executor.taskQueue[0]).toMatchObject({
        ...taskData,
        status: 'queued',
        createdAt: expect.any(Number),
        id: expect.stringMatching(/^task-\d+-[a-z0-9]+/)
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Задача добавлена в очередь', expect.any(Object));
    });

    test('should add task with custom ID', () => {
      // TODO: Протестировать добавление задачи с кастомным ID
      const taskData = {
        id: 'custom-task-id',
        type: 'test',
        testPath: '/path/to/test.js'
      };

      executor.addTask(taskData);

      expect(executor.taskQueue[0].id).toBe('custom-task-id');
    });

    test('should emit taskAdded event', () => {
      // TODO: Протестировать эмиссию события taskAdded
      const taskData = { type: 'test', testPath: '/test.js' };
      const eventHandler = jest.fn();

      executor.on('taskAdded', eventHandler);
      executor.addTask(taskData);

      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining(taskData));
    });
  });

  describe('processTaskQueue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should not process when queue is empty', () => {
      // TODO: Протестировать отсутствие обработки при пустой очереди
      executor.processTaskQueue();

      expect(executor.taskQueue).toHaveLength(0);
      expect(executor.currentTasks.size).toBe(0);
    });

    test('should not process when at max concurrent tasks', () => {
      // TODO: Протестировать отсутствие обработки при максимальном количестве одновременных задач
      // Добавляем задачи до лимита
      for (let i = 0; i < executor.maxConcurrentTests; i++) {
        executor.currentTasks.set(`task-${i}`, { id: `task-${i}` });
      }

      // Добавляем задачу в очередь
      executor.addTask({ type: 'test', testPath: '/test.js' });

      executor.processTaskQueue();

      // Задача должна остаться в очереди
      expect(executor.taskQueue).toHaveLength(1);
      expect(executor.currentTasks.size).toBe(executor.maxConcurrentTests);
    });

    test('should process task from queue', async () => {
      // TODO: Протестировать обработку задачи из очереди
      const taskData = { type: 'test', testPath: '/test.js' };
      mockTestRunner.runTest.mockResolvedValue({ success: true });

      executor.addTask(taskData);
      expect(executor.taskQueue).toHaveLength(1);

      await executor.processTaskQueue();

      expect(executor.taskQueue).toHaveLength(0);
      expect(mockTestRunner.runTest).toHaveBeenCalledWith('/test.js', undefined);
    });

    test('should handle task processing errors', async () => {
      // TODO: Протестировать обработку ошибок выполнения задач
      const taskData = { type: 'test', testPath: '/failing-test.js' };
      const testError = new Error('Test execution failed');

      mockTestRunner.runTest.mockRejectedValue(testError);
      executor.addTask(taskData);

      await executor.processTaskQueue();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          context: 'WorkerTaskExecutor.processTaskQueue',
          taskId: expect.any(String)
        })
      );
    });
  });

  describe('executeTask', () => {
    test('should execute test task successfully', async () => {
      // TODO: Протестировать успешное выполнение тестовой задачи
      const task = {
        id: 'test-task-1',
        type: 'test',
        testPath: '/path/to/test.js',
        options: { timeout: 5000 }
      };

      const mockResult = {
        success: true,
        tests: 5,
        passed: 5,
        failed: 0
      };

      mockTestRunner.runTest.mockResolvedValue(mockResult);

      const result = await executor.executeTask(task);

      expect(mockTestRunner.runTest).toHaveBeenCalledWith('/path/to/test.js', { timeout: 5000 });
      expect(result).toBe(mockResult);
      expect(task.status).toBe('completed');
      expect(task.result).toBe(mockResult);
      expect(task.duration).toBeDefined();
    });

    test('should execute test-suite task', async () => {
      // TODO: Протестировать выполнение задачи test-suite
      const task = {
        id: 'suite-task-1',
        type: 'test-suite',
        suitePath: '/path/to/suite',
        pattern: '**/*.test.js'
      };

      const mockResult = { success: true, suites: 3 };
      mockTestRunner.runTestSuite.mockResolvedValue(mockResult);

      await executor.executeTask(task);

      expect(mockTestRunner.runTestSuite).toHaveBeenCalledWith(task);
      expect(task.status).toBe('completed');
    });

    test('should execute test-scan task', async () => {
      // TODO: Протестировать выполнение задачи test-scan
      const task = {
        id: 'scan-task-1',
        type: 'test-scan',
        scanPath: '/src',
        patterns: ['**/*.test.js', '**/*.spec.js']
      };

      const mockResult = { files: ['/src/test1.js', '/src/test2.js'] };
      mockTestRunner.findTestFiles.mockResolvedValue(mockResult);

      await executor.executeTask(task);

      expect(mockTestRunner.findTestFiles).toHaveBeenCalledWith('/src', ['**/*.test.js', '**/*.spec.js']);
      expect(task.status).toBe('completed');
    });

    test('should handle unknown task type', async () => {
      // TODO: Протестировать обработку неизвестного типа задачи
      const task = {
        id: 'unknown-task',
        type: 'unknown-type'
      };

      await expect(executor.executeTask(task)).rejects.toThrow('Неизвестный тип задачи: unknown-type');
      expect(task.status).toBe('failed');
    });

    test('should handle task execution failure', async () => {
      // TODO: Протестировать обработку неудачного выполнения задачи
      const task = {
        id: 'failing-task',
        type: 'test',
        testPath: '/failing/test.js'
      };

      const testError = new Error('Test execution failed');
      mockTestRunner.runTest.mockRejectedValue(testError);

      await expect(executor.executeTask(task)).rejects.toThrow('Test execution failed');

      expect(task.status).toBe('failed');
      expect(task.error).toBe('Test execution failed');
      expect(task.duration).toBeDefined();
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    test('should emit taskStarted event', async () => {
      // TODO: Протестировать эмиссию события taskStarted
      const task = { id: 'event-task', type: 'test', testPath: '/test.js' };
      const startedHandler = jest.fn();

      mockTestRunner.runTest.mockResolvedValue({ success: true });

      executor.on('taskStarted', startedHandler);
      await executor.executeTask(task);

      expect(startedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-task',
          status: 'running'
        })
      );
    });

    test('should emit taskCompleted event on success', async () => {
      // TODO: Протестировать эмиссию события taskCompleted при успехе
      const task = { id: 'complete-task', type: 'test', testPath: '/test.js' };
      const completedHandler = jest.fn();

      mockTestRunner.runTest.mockResolvedValue({ success: true });

      executor.on('taskCompleted', completedHandler);
      await executor.executeTask(task);

      expect(completedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'complete-task',
          status: 'completed',
          result: { success: true }
        })
      );
    });

    test('should emit taskFailed event on failure', async () => {
      // TODO: Протестировать эмиссию события taskFailed при неудаче
      const task = { id: 'fail-task', type: 'test', testPath: '/test.js' };
      const failedHandler = jest.fn();

      mockTestRunner.runTest.mockRejectedValue(new Error('Task failed'));

      executor.on('taskFailed', failedHandler);
      await expect(executor.executeTask(task)).rejects.toThrow();

      expect(failedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fail-task',
          status: 'failed',
          error: 'Task failed'
        })
      );
    });
  });

  describe('stop method', () => {
    test('should stop and wait for current tasks', async () => {
      // TODO: Протестировать остановку и ожидание текущих задач
      // Добавляем задачу в currentTasks
      const runningTask = {
        id: 'running-task',
        status: 'running',
        type: 'test'
      };
      executor.currentTasks.set('running-task', runningTask);

      // Имитируем завершение задачи через небольшой таймаут
      setTimeout(() => {
        runningTask.status = 'completed';
      }, 50);

      await executor.stop();

      expect(executor.taskProcessingInterval).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Все текущие задачи завершены.');
    });

    test('should handle stop with no current tasks', async () => {
      // TODO: Протестировать остановку при отсутствии текущих задач
      await executor.stop();

      expect(executor.taskProcessingInterval).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Все текущие задачи завершены.');
    });
  });

  describe('getters', () => {
    test('should return current tasks count', () => {
      // TODO: Протестировать получение количества текущих задач
      executor.currentTasks.set('task1', {});
      executor.currentTasks.set('task2', {});

      expect(executor.getCurrentTasksCount()).toBe(2);
    });

    test('should return queue length', () => {
      // TODO: Протестировать получение длины очереди
      executor.addTask({ type: 'test' });
      executor.addTask({ type: 'test' });
      executor.addTask({ type: 'test' });

      expect(executor.getQueueLength()).toBe(3);
    });
  });

  describe('setTestRunner', () => {
    test('should set new test runner', () => {
      // TODO: Протестировать установку нового test runner
      const newTestRunner = { runTest: jest.fn() };

      executor.setTestRunner(newTestRunner);

      expect(executor.testRunner).toBe(newTestRunner);
    });
  });

  describe('integration with task processing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should process tasks automatically when started', async () => {
      // TODO: Протестировать автоматическую обработку задач при запуске
      const taskData = { type: 'test', testPath: '/test.js' };
      mockTestRunner.runTest.mockResolvedValue({ success: true });

      executor.startTaskProcessing();
      executor.addTask(taskData);

      // Имитируем несколько тиков таймера
      jest.advanceTimersByTime(1000); // Первый тик
      await Promise.resolve(); // Даем выполниться асинхронным операциям

      expect(mockTestRunner.runTest).toHaveBeenCalledWith('/test.js', undefined);
    });

    test('should handle multiple concurrent tasks', async () => {
      // TODO: Протестировать обработку множественных одновременных задач
      const executorWithConcurrency = new WorkerTaskExecutor({
        logger: mockLogger,
        errorHandler: mockErrorHandler,
        testRunner: mockTestRunner,
        maxConcurrentTests: 3
      });

      // Добавляем несколько задач
      for (let i = 0; i < 5; i++) {
        executorWithConcurrency.addTask({
          type: 'test',
          testPath: `/test${i}.js`
        });
      }

      mockTestRunner.runTest.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      // Обрабатываем задачи
      await executorWithConcurrency.processTaskQueue();
      await executorWithConcurrency.processTaskQueue();
      await executorWithConcurrency.processTaskQueue();

      expect(executorWithConcurrency.getCurrentTasksCount()).toBe(3);
      expect(executorWithConcurrency.getQueueLength()).toBe(2);
    });

    test('should maintain task order in queue', () => {
      // TODO: Протестировать сохранение порядка задач в очереди
      const tasks = [
        { type: 'test', testPath: '/test1.js', priority: 1 },
        { type: 'test', testPath: '/test2.js', priority: 2 },
        { type: 'test', testPath: '/test3.js', priority: 3 }
      ];

      tasks.forEach(task => executor.addTask(task));

      expect(executor.taskQueue).toHaveLength(3);
      expect(executor.taskQueue[0].testPath).toBe('/test1.js');
      expect(executor.taskQueue[1].testPath).toBe('/test2.js');
      expect(executor.taskQueue[2].testPath).toBe('/test3.js');
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle malformed task data', () => {
      // TODO: Протестировать обработку malformed данных задачи
      expect(() => executor.addTask(null)).toThrow();
      expect(() => executor.addTask({})).toThrow();
      expect(() => executor.addTask({ type: 'invalid' })).toThrow();
    });

    test('should handle test runner failures', async () => {
      // TODO: Протестировать обработку неудач test runner
      const failingTestRunner = {
        runTest: jest.fn().mockRejectedValue(new Error('Runner failure'))
      };

      executor.setTestRunner(failingTestRunner);

      const task = { id: 'fail-runner-task', type: 'test', testPath: '/test.js' };
      executor.addTask(task);

      await executor.processTaskQueue();

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    test('should handle empty task options', async () => {
      // TODO: Протестировать обработку пустых опций задачи
      const task = { type: 'test', testPath: '/test.js' };
      mockTestRunner.runTest.mockResolvedValue({ success: true });

      executor.addTask(task);
      await executor.processTaskQueue();

      expect(mockTestRunner.runTest).toHaveBeenCalledWith('/test.js', undefined);
    });

    test('should handle task execution timeout', async () => {
      // TODO: Протестировать обработку таймаута выполнения задачи
      const task = { id: 'timeout-task', type: 'test', testPath: '/timeout-test.js' };

      mockTestRunner.runTest.mockImplementation(
        () => new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      executor.addTask(task);

      await expect(executor.processTaskQueue()).rejects.toThrow('Timeout');

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    test('should handle memory pressure with many tasks', () => {
      // TODO: Протестировать обработку большого количества задач
      // Добавляем много задач для проверки производительности
      for (let i = 0; i < 1000; i++) {
        executor.addTask({
          type: 'test',
          testPath: `/test${i}.js`
        });
      }

      expect(executor.getQueueLength()).toBe(1000);

      // Проверяем, что система не падает
      expect(() => executor.getQueueLength()).not.toThrow();
    });

    test('should handle rapid start/stop cycles', () => {
      // TODO: Протестировать обработку быстрых циклов запуска/остановки
      for (let i = 0; i < 10; i++) {
        executor.startTaskProcessing();
        executor.stopTaskProcessing();
      }

      expect(executor.taskProcessingInterval).toBeNull();
    });

    test('should handle event listener cleanup', () => {
      // TODO: Протестировать очистку обработчиков событий
      const eventHandler = jest.fn();

      executor.on('taskAdded', eventHandler);
      executor.addTask({ type: 'test' });

      expect(eventHandler).toHaveBeenCalled();

      // После завершения теста обработчики должны быть очищены
      executor.removeAllListeners('taskAdded');
    });
  });

  describe('performance and resource management', () => {
    test('should not leak memory with task processing', async () => {
      // TODO: Протестировать отсутствие утечек памяти при обработке задач
      const initialTasks = executor.currentTasks.size;
      const initialQueueLength = executor.taskQueue.length;

      mockTestRunner.runTest.mockResolvedValue({ success: true });

      // Обрабатываем несколько задач
      for (let i = 0; i < 10; i++) {
        executor.addTask({ type: 'test', testPath: `/test${i}.js` });
        await executor.processTaskQueue();
      }

      expect(executor.currentTasks.size).toBe(initialTasks);
      expect(executor.taskQueue.length).toBe(initialQueueLength);
    });

    test('should handle high-frequency task additions', () => {
      // TODO: Протестировать обработку частого добавления задач
      const startTime = Date.now();

      // Добавляем много задач быстро
      for (let i = 0; i < 100; i++) {
        executor.addTask({ type: 'test', testPath: `/test${i}.js` });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(executor.getQueueLength()).toBe(100);
      // Проверяем, что добавление не занимает слишком много времени
      expect(duration).toBeLessThan(1000); // Менее секунды на 100 задач
    });
  });
});
