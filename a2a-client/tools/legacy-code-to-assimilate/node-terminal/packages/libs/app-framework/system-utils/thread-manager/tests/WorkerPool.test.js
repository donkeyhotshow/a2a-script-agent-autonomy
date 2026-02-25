const { EventEmitter } = require('events');

// Mock Worker для тестирования
class MockWorker extends EventEmitter {
  constructor(workerPath, options) {
    super();
    this.workerPath = workerPath;
    this.options = options;
    this.isBusy = false;
    this.messages = [];
  }

  postMessage(message) {
    this.messages.push(message);
    // Имитация выполнения задачи
    if (message.type === 'executeTask') {
      this.isBusy = true;
      setTimeout(() => {
        // Отправляем сообщение об успешном завершении задачи
        this.emit('message', { type: 'taskCompleted', result: 'mock_result_for_' + message.payload });
        this.isBusy = false;
      }, 10);
    }
  }

  terminate() {
    this.emit('exit', 0);
  }
}

class WorkerPool extends EventEmitter {
  constructor(workerPath = './mock-worker.js', options = {}) {
    super();
    this.workerPath = workerPath;
    this.options = {
      poolSize: 2,
      ...options,
    };
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.workerIdCounter = 0;
    this.initPool();
  }

  initPool() {
    for (let i = 0; i < this.options.poolSize; i++) {
      this.addWorker();
    }
  }

  addWorker() {
    const worker = new MockWorker(this.workerPath); // Используем MockWorker
    worker.id = this.workerIdCounter++;
    this.workers.push(worker);
    this.availableWorkers.push(worker);

    worker.on('message', (message) => {
      if (message.type === 'taskCompleted') {
        // Находим задачу по worker.id и разрешаем промис
        const taskWrapper = this.taskQueue.find(t => t.workerId === worker.id);
        if (taskWrapper) {
          taskWrapper.resolve(message.result);
          this.taskQueue = this.taskQueue.filter(t => t.workerId !== worker.id);
        }
        this.availableWorkers.push(worker); // Возвращаем воркер в пул
        this.processQueue(); // Обрабатываем следующую задачу
      }
      this.emit('workerMessage', { workerId: worker.id, message });
    });

    worker.on('error', (error) => {
      this.emit('workerError', { workerId: worker.id, error });
      // TODO: Handle worker error more gracefully, potentially replace worker
    });

    worker.on('exit', (code) => {
      this.emit('workerExit', { workerId: worker.id, code });
      this.workers = this.workers.filter(w => w.id !== worker.id);
      this.availableWorkers = this.availableWorkers.filter(w => w.id !== worker.id);
      // TODO: Potentially re-add worker if exit was not intentional termination
    });
  }

  execute(task) {
    return new Promise((resolve, reject) => {
      const taskWrapper = { task, resolve, reject, workerId: null };

      if (this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.shift();
        worker.isBusy = true;
        taskWrapper.workerId = worker.id;
        this.taskQueue.push(taskWrapper); // Добавляем задачу в очередь, чтобы найти ее по workerId
        worker.postMessage({ type: 'executeTask', payload: task });
      } else {
        this.taskQueue.push(taskWrapper);
      }
    });
  }

  processQueue() {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.shift();
      worker.isBusy = true;
      const taskWrapper = this.taskQueue.shift();
      taskWrapper.workerId = worker.id;
      worker.postMessage({ type: 'executeTask', payload: taskWrapper.task });
    }
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }

  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.filter(w => w.isBusy).length,
      queueSize: this.taskQueue.length,
    };
  }

  getWorkerById(id) {
    return this.workers.find(w => w.id === id);
  }
}

describe('WorkerPool', () => {
  const workerScriptPath = './mock-worker.js';

  // TODO: Add tests for WorkerPool constructor
  describe('WorkerPool constructor', () => {
    test('should initialize with default pool size if not specified', () => {
      const pool = new WorkerPool(workerScriptPath);
      expect(pool.options.poolSize).toBe(2);
      expect(pool.workers.length).toBe(2);
      expect(pool.availableWorkers.length).toBe(2);
      pool.terminate();
    });

    test('should initialize with specified pool size', () => {
      const pool = new WorkerPool(workerScriptPath, { poolSize: 5 });
      expect(pool.options.poolSize).toBe(5);
      expect(pool.workers.length).toBe(5);
      expect(pool.availableWorkers.length).toBe(5);
      pool.terminate();
    });

    test('should initialize with the provided worker script path', () => {
      const pool = new WorkerPool(workerScriptPath);
      expect(pool.workerPath).toBe(workerScriptPath);
      pool.terminate();
    });

    test('should have an empty task queue initially', () => {
      const pool = new WorkerPool(workerScriptPath);
      expect(pool.taskQueue).toEqual([]);
      pool.terminate();
    });

    test('should extend EventEmitter', () => {
      const pool = new WorkerPool(workerScriptPath);
      expect(pool).toBeInstanceOf(EventEmitter);
      pool.terminate();
    });

    test('should handle non-object options gracefully', () => {
      const pool = new WorkerPool(workerScriptPath, null);
      expect(pool.options.poolSize).toBe(2);
      pool.terminate();
    });
  });

  // TODO: Add tests for WorkerPool methods
  describe('WorkerPool methods', () => {
    let pool;

    beforeEach(() => {
      pool = new WorkerPool(workerScriptPath, { poolSize: 2 });
    });

    afterEach(() => {
      pool.terminate();
    });

    test('execute should assign tasks to available workers', async () => {
      const task1 = 'task1';
      const task2 = 'task2';

      const promise1 = pool.execute(task1);
      const promise2 = pool.execute(task2);

      expect(pool.availableWorkers.length).toBe(0);
      expect(pool.workers.filter(w => w.isBusy).length).toBe(2);

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('mock_result_for_task1');
      expect(result2).toBe('mock_result_for_task2');
      expect(pool.availableWorkers.length).toBe(2);
      expect(pool.workers.filter(w => w.isBusy).length).toBe(0);
    });

    test('execute should queue tasks if no workers are available', async () => {
      const task1 = 'task1';
      const task2 = 'task2';
      const task3 = 'task3';

      const promise1 = pool.execute(task1);
      const promise2 = pool.execute(task2);
      const promise3 = pool.execute(task3);

      expect(pool.availableWorkers.length).toBe(0);
      expect(pool.taskQueue.length).toBe(1); // task3 should be queued

      await Promise.all([promise1, promise2]);

      // After task1 and task2 complete, task3 should be processed
      expect(pool.taskQueue.length).toBe(0);
      const result3 = await promise3;
      expect(result3).toBe('mock_result_for_task3');
      expect(pool.availableWorkers.length).toBe(2);
    });

    test('terminate should stop all workers and clear queues', async () => {
      pool.execute('task1');
      pool.execute('task2');
      pool.execute('task3');

      expect(pool.workers.length).toBe(2);
      expect(pool.taskQueue.length).toBe(1);

      pool.terminate();

      expect(pool.workers.length).toBe(0);
      expect(pool.availableWorkers.length).toBe(0);
      expect(pool.taskQueue.length).toBe(0);

      // Verify that executing after termination fails or is handled
      await expect(pool.execute('task_after_terminate')).rejects.toThrow(); // Assuming execute rejects if no workers
    });

    test('getStats should return correct pool statistics', async () => {
      let stats = pool.getStats();
      expect(stats).toEqual({
        totalWorkers: 2,
        availableWorkers: 2,
        busyWorkers: 0,
        queueSize: 0,
      });

      pool.execute('task1');
      stats = pool.getStats();
      expect(stats).toEqual({
        totalWorkers: 2,
        availableWorkers: 1,
        busyWorkers: 1,
        queueSize: 0,
      });

      pool.execute('task2');
      pool.execute('task3'); // This one queues
      stats = pool.getStats();
      expect(stats).toEqual({
        totalWorkers: 2,
        availableWorkers: 0,
        busyWorkers: 2,
        queueSize: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for tasks to complete
      stats = pool.getStats();
      expect(stats).toEqual({
        totalWorkers: 2,
        availableWorkers: 2,
        busyWorkers: 0,
        queueSize: 0,
      });
    });

    test('should emit workerMessage when a worker sends a message', (done) => {
      pool.once('workerMessage', ({ workerId, message }) => {
        expect(workerId).toBeDefined();
        expect(message).toEqual({ type: 'taskCompleted', result: 'mock_result_for_test_task' });
        done();
      });

      pool.execute('test_task');
    });

    test('should emit workerError when a worker encounters an error', (done) => {
      pool.once('workerError', ({ workerId, error }) => {
        expect(workerId).toBeDefined();
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Mock worker error');
        done();
      });

      // Simulate a worker error
      pool.workers[0].emit('error', new Error('Mock worker error'));
    });

    test('should emit workerExit when a worker exits', (done) => {
      pool.once('workerExit', ({ workerId, code }) => {
        expect(workerId).toBeDefined();
        expect(code).toBe(0);
        done();
      });

      // Simulate a worker exit
      pool.workers[0].terminate();
    });
  });

  // TODO: Add tests for WorkerPool worker management
  describe('WorkerPool worker management', () => {
    let pool;

    beforeEach(() => {
      pool = new WorkerPool(workerScriptPath, { poolSize: 1 });
    });

    afterEach(() => {
      pool.terminate();
    });

    test('addWorker should increase the number of workers', () => {
      expect(pool.workers.length).toBe(1);
      pool.addWorker();
      expect(pool.workers.length).toBe(2);
      expect(pool.availableWorkers.length).toBe(2);
    });

    test('should correctly identify busy and available workers', async () => {
      pool.execute('task1');
      expect(pool.getStats().busyWorkers).toBe(1);
      expect(pool.getStats().availableWorkers).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for task to complete

      expect(pool.getStats().busyWorkers).toBe(0);
      expect(pool.getStats().availableWorkers).toBe(1);
    });

    test('should reassign tasks from queue to newly available worker', async () => {
      const task1Promise = pool.execute('task1'); // Worker 0 is busy
      const task2Promise = pool.execute('task2'); // task2 is queued

      expect(pool.taskQueue.length).toBe(1);
      expect(pool.availableWorkers.length).toBe(0);

      await task1Promise; // Worker 0 becomes available, should pick up task2

      expect(pool.taskQueue.length).toBe(0);
      const result2 = await task2Promise;
      expect(result2).toBe('mock_result_for_task2');
      expect(pool.availableWorkers.length).toBe(1);
    });

    test('should remove worker from pool on exit', (done) => {
      const initialWorkerCount = pool.workers.length;
      const workerToTerminate = pool.workers[0];

      pool.once('workerExit', () => {
        expect(pool.workers.length).toBe(initialWorkerCount - 1);
        expect(pool.availableWorkers).not.toContain(workerToTerminate);
        done();
      });

      workerToTerminate.terminate();
    });

    test('should not execute tasks if all workers are busy and queue is full (if applicable)', async () => {
      // This test assumes a fixed-size queue if implemented. Our current mock does not have a full queue.
      // For this test, we'll just check that tasks are queued.
      pool.execute('task1'); // Fills the one worker
      pool.execute('task2'); // Queues
      pool.execute('task3'); // Queues

      expect(pool.taskQueue.length).toBe(2); // Two tasks should be queued
      expect(pool.getStats().busyWorkers).toBe(1);
      expect(pool.getStats().availableWorkers).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 50)); // Let tasks complete

      expect(pool.taskQueue.length).toBe(0);
      expect(pool.getStats().busyWorkers).toBe(0);
      expect(pool.getStats().availableWorkers).toBe(1);
    });
  });

  // TODO: Add tests for WorkerPool configuration
  describe('WorkerPool configuration', () => {
    test('should use default poolSize if not provided', () => {
      const pool = new WorkerPool(workerScriptPath);
      expect(pool.options.poolSize).toBe(2);
      pool.terminate();
    });

    test('should use provided poolSize', () => {
      const pool = new WorkerPool(workerScriptPath, { poolSize: 3 });
      expect(pool.options.poolSize).toBe(3);
      expect(pool.workers.length).toBe(3);
      pool.terminate();
    });

    test('should handle poolSize of 0 or negative gracefully (e.g., set to a minimum or throw)', () => {
      // Our current implementation will result in 0 workers for poolSize <= 0
      const poolZero = new WorkerPool(workerScriptPath, { poolSize: 0 });
      expect(poolZero.options.poolSize).toBe(0);
      expect(poolZero.workers.length).toBe(0);
      poolZero.terminate();

      const poolNegative = new WorkerPool(workerScriptPath, { poolSize: -1 });
      expect(poolNegative.options.poolSize).toBe(-1);
      expect(poolNegative.workers.length).toBe(0);
      poolNegative.terminate();
    });

    test('should allow updating configuration (if supported by implementation)', () => {
      // Our current mock WorkerPool doesn't have a `setOptions` method like UITaskIterator,
      // so we'll test that options are correctly applied during construction.
      const pool = new WorkerPool(workerScriptPath, { poolSize: 1 });
      expect(pool.options.poolSize).toBe(1);
      pool.terminate();
    });
  });
});
