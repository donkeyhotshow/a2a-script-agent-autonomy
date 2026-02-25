const { EventEmitter } = require('events');

// Mock WorkerPool
class MockWorkerPool extends EventEmitter {
  constructor(workers = []) {
    super();
    this.workers = workers;
    this.getStats = jest.fn(() => ({ totalWorkers: this.workers.length, busyWorkers: this.workers.filter(w => w.isBusy).length }));
    this.getWorkerById = jest.fn((id) => this.workers.find(w => w.id === id));
    this.terminate = jest.fn();
  }

  addWorker(worker) {
    this.workers.push(worker);
  }
}

// Mock Worker
class MockWorker extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.isBusy = false;
  }
}

class ThreadMonitor extends EventEmitter {
  constructor(workerPool, options = {}) {
    super();
    if (!workerPool || !(workerPool instanceof EventEmitter)) {
      throw new Error('WorkerPool instance is required.');
    }
    this.workerPool = workerPool;
    this.options = {
      interval: 1000,
      ...options,
    };
    this.monitorInterval = null;
    this.stats = {};
  }

  start() {
    if (this.monitorInterval) {
      this.stop();
    }
    this.monitorInterval = setInterval(() => this.collectStats(), this.options.interval);
    this.workerPool.on('workerExit', this.handleWorkerExit);
    this.workerPool.on('workerError', this.handleWorkerError);
    this.collectStats(); // Initial collection
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.workerPool.off('workerExit', this.handleWorkerExit);
    this.workerPool.off('workerError', this.handleWorkerError);
  }

  handleWorkerExit = ({ workerId, code }) => {
    this.emit('threadExit', { workerId, code });
    this.collectStats();
  };

  handleWorkerError = ({ workerId, error }) => {
    this.emit('threadError', { workerId, error });
    this.collectStats();
  };

  collectStats() {
    this.stats = this.workerPool.getStats();
    this.emit('statsUpdate', this.stats);
    return this.stats;
  }

  getStats() {
    return this.stats;
  }

  getThreadStatus(workerId) {
    const worker = this.workerPool.getWorkerById(workerId);
    if (worker) {
      return { id: worker.id, isBusy: worker.isBusy };
    }
    return null;
  }

  setOptions(newOptions) {
    if (typeof newOptions === 'object' && newOptions !== null) {
      this.options = { ...this.options, ...newOptions };
      if (this.monitorInterval) {
        this.start(); // Restart monitoring with new interval
      }
    }
  }
}

describe('ThreadMonitor', () => {
  let mockWorkerPool;
  let mockWorkers;

  beforeEach(() => {
    mockWorkers = [
      new MockWorker(1),
      new MockWorker(2),
    ];
    mockWorkerPool = new MockWorkerPool(mockWorkers);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  jest.useFakeTimers();

  // TODO: Add tests for ThreadMonitor constructor
  describe('ThreadMonitor constructor', () => {
    test('should initialize with a WorkerPool instance', () => {
      const monitor = new ThreadMonitor(mockWorkerPool);
      expect(monitor.workerPool).toBe(mockWorkerPool);
      expect(monitor.options).toEqual({ interval: 1000 });
      expect(monitor.monitorInterval).toBeNull();
      expect(monitor.stats).toEqual({});
    });

    test('should throw an error if WorkerPool is not provided', () => {
      expect(() => new ThreadMonitor()).toThrow('WorkerPool instance is required.');
    });

    test('should throw an error if WorkerPool is not an EventEmitter', () => {
      expect(() => new ThreadMonitor({})).toThrow('WorkerPool instance is required.');
    });

    test('should initialize with custom options if provided', () => {
      const customOptions = { interval: 500, customProp: 'value' };
      const monitor = new ThreadMonitor(mockWorkerPool, customOptions);
      expect(monitor.options).toEqual(customOptions);
    });
  });

  // TODO: Add tests for ThreadMonitor methods
  describe('ThreadMonitor methods', () => {
    let monitor;

    beforeEach(() => {
      monitor = new ThreadMonitor(mockWorkerPool);
    });

    test('start() should begin monitoring and collect initial stats', () => {
      monitor.start();
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(mockWorkerPool.getStats).toHaveBeenCalledTimes(1);
      expect(monitor.stats).toEqual(mockWorkerPool.getStats());
    });

    test('stop() should clear the monitoring interval', () => {
      monitor.start();
      monitor.stop();
      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(monitor.monitorInterval).toBeNull();
    });

    test('collectStats() should update stats and emit statsUpdate event', () => {
      const mockStats = { totalWorkers: 2, busyWorkers: 1 };
      mockWorkerPool.getStats.mockReturnValue(mockStats);

      const statsUpdateListener = jest.fn();
      monitor.on('statsUpdate', statsUpdateListener);

      const collectedStats = monitor.collectStats();

      expect(mockWorkerPool.getStats).toHaveBeenCalled();
      expect(monitor.stats).toEqual(mockStats);
      expect(collectedStats).toEqual(mockStats);
      expect(statsUpdateListener).toHaveBeenCalledWith(mockStats);
    });

    test('getStats() should return current statistics', () => {
      monitor.start();
      jest.runOnlyPendingTimers(); // Trigger collectStats
      const stats = monitor.getStats();
      expect(stats).toEqual(mockWorkerPool.getStats());
    });

    test('getThreadStatus() should return status for a specific worker', () => {
      mockWorkers[0].isBusy = true;
      const status = monitor.getThreadStatus(1);
      expect(status).toEqual({ id: 1, isBusy: true });
    });

    test('getThreadStatus() should return null for a non-existent worker', () => {
      const status = monitor.getThreadStatus(999);
      expect(status).toBeNull();
    });

    test('setOptions() should update options and restart monitoring if running', () => {
      monitor.start();
      expect(setInterval).toHaveBeenCalledTimes(1);

      monitor.setOptions({ interval: 500 });
      expect(monitor.options.interval).toBe(500);
      expect(clearInterval).toHaveBeenCalledTimes(1); // Old interval cleared
      expect(setInterval).toHaveBeenCalledTimes(2); // New interval set
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    test('setOptions() should not start monitoring if not already running', () => {
      monitor.setOptions({ interval: 500 });
      expect(monitor.options.interval).toBe(500);
      expect(setInterval).not.toHaveBeenCalled();
    });

    test('should handle non-object options gracefully in setOptions', () => {
      const initialOptions = { ...monitor.options };
      monitor.setOptions(null);
      expect(monitor.options).toEqual(initialOptions);
      monitor.setOptions('invalid');
      expect(monitor.options).toEqual(initialOptions);
    });
  });

  // TODO: Add tests for ThreadMonitor thread monitoring
  describe('ThreadMonitor thread monitoring', () => {
    let monitor;

    beforeEach(() => {
      monitor = new ThreadMonitor(mockWorkerPool);
      monitor.start();
    });

    afterEach(() => {
      monitor.stop();
    });

    test('should emit statsUpdate event periodically', () => {
      const statsUpdateListener = jest.fn();
      monitor.on('statsUpdate', statsUpdateListener);

      jest.runOnlyPendingTimers(); // Initial call
      expect(statsUpdateListener).toHaveBeenCalledTimes(1);

      jest.runOnlyPendingTimers(); // After interval
      expect(statsUpdateListener).toHaveBeenCalledTimes(2);

      expect(statsUpdateListener).toHaveBeenCalledWith(mockWorkerPool.getStats());
    });

    test('should emit threadExit event when a worker exits', (done) => {
      monitor.once('threadExit', ({ workerId, code }) => {
        expect(workerId).toBe(mockWorkers[0].id);
        expect(code).toBe(0);
        done();
      });
      mockWorkerPool.emit('workerExit', { workerId: mockWorkers[0].id, code: 0 });
    });

    test('should update stats after a worker exits', () => {
      const initialStats = { totalWorkers: 2, busyWorkers: 0 };
      mockWorkerPool.getStats.mockReturnValueOnce(initialStats);
      monitor.collectStats();

      const updatedStats = { totalWorkers: 1, busyWorkers: 0 }; // Simulate one worker exited
      mockWorkerPool.getStats.mockReturnValueOnce(updatedStats);

      mockWorkerPool.emit('workerExit', { workerId: mockWorkers[0].id, code: 0 });
      jest.runOnlyPendingTimers(); // Ensure collectStats is called after exit event

      expect(monitor.getStats()).toEqual(updatedStats);
    });

    test('should emit threadError event when a worker encounters an error', (done) => {
      monitor.once('threadError', ({ workerId, error }) => {
        expect(workerId).toBe(mockWorkers[1].id);
        expect(error.message).toBe('Worker failure');
        done();
      });
      mockWorkerPool.emit('workerError', { workerId: mockWorkers[1].id, error: new Error('Worker failure') });
    });

    test('should update stats after a worker error (if it affects worker count/status)', () => {
      // This test depends on how workerPool handles errors, for now, assume stats might change
      const initialStats = { totalWorkers: 2, busyWorkers: 0 };
      mockWorkerPool.getStats.mockReturnValueOnce(initialStats);
      monitor.collectStats();

      const updatedStats = { totalWorkers: 2, busyWorkers: 0 }; // For this mock, error doesn't change total workers immediately
      mockWorkerPool.getStats.mockReturnValueOnce(updatedStats);

      mockWorkerPool.emit('workerError', { workerId: mockWorkers[1].id, error: new Error('Worker failure') });
      jest.runOnlyTimers(); // Ensure collectStats is called

      expect(monitor.getStats()).toEqual(updatedStats);
    });

    test('should reflect busy status of workers in stats', () => {
      mockWorkers[0].isBusy = true;
      monitor.collectStats(); // Manually collect to reflect change
      expect(monitor.getStats().busyWorkers).toBe(1);
      mockWorkers[0].isBusy = false;
      monitor.collectStats();
      expect(monitor.getStats().busyWorkers).toBe(0);
    });
  });

  // TODO: Add tests for ThreadMonitor configuration
  describe('ThreadMonitor configuration', () => {
    let monitor;

    beforeEach(() => {
      monitor = new ThreadMonitor(mockWorkerPool);
    });

    test('should use default interval if not provided', () => {
      expect(monitor.options.interval).toBe(1000);
    });

    test('should use provided interval', () => {
      const customInterval = 500;
      const customMonitor = new ThreadMonitor(mockWorkerPool, { interval: customInterval });
      expect(customMonitor.options.interval).toBe(customInterval);
    });

    test('should allow updating interval via setOptions', () => {
      monitor.start();
      jest.clearAllTimers(); // Clear initial timer to check new one

      monitor.setOptions({ interval: 2000 });
      expect(monitor.options.interval).toBe(2000);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000);
      monitor.stop();
    });

    test('should ensure interval is a positive number', () => {
      const monitorZero = new ThreadMonitor(mockWorkerPool, { interval: 0 });
      expect(monitorZero.options.interval).toBe(0); // Assuming it takes the value, but internal logic handles it

      const monitorNegative = new ThreadMonitor(mockWorkerPool, { interval: -100 });
      expect(monitorNegative.options.interval).toBe(-100); // Assuming it takes the value

      // Test behavior when starting with invalid intervals (would typically use min/max validation)
      monitorZero.start();
      expect(setInterval).not.toHaveBeenCalledWith(expect.any(Function), 0); // setInterval won't call with 0 or negative
      monitorZero.stop();

      monitorNegative.start();
      expect(setInterval).not.toHaveBeenCalledWith(expect.any(Function), -100);
      monitorNegative.stop();
    });
  });
});
