const { ClusterManager } = require('../../index.js');
const EventEmitter = require('eventemitter3');
const os = require('os');
const cluster = require('cluster');
const path = require('path');

// const { LoggingUtils } = require('@libs/logging-monitoring/logging'); // Временно закомментировано
// const { ErrorHandlingUtils } = require('@libs/error-management/error-handler'); // Временно закомментировано
// const FileOperations = require('@libs/system/file-operations'); // Временно закомментировано

// Mock Node.js cluster module
jest.mock('cluster', () => ({
  isMaster: true,
  fork: jest.fn(() => ({
    id: Math.floor(Math.random() * 1000),
    process: { pid: Math.floor(Math.random() * 10000) },
    on: jest.fn(),
    send: jest.fn(),
    kill: jest.fn(),
  })),
  on: jest.fn(),
  workers: {},
}));

// Mock Node.js os module
jest.mock('os', () => ({
  cpus: jest.fn(() => ([{}, {}, {}])), // 3 CPUs
}));

describe('ClusterManager', () => {
  let clusterManager;
  let logger;
  let errorHandler;
  let fileOperations;
  let loggerFilePath;

  beforeEach(() => {
    jest.clearAllMocks();
    cluster.isMaster = true; // Ensure master for most tests
    cluster.workers = {};

    fileOperations = new FileOperations();
    loggerFilePath = path.join(os.tmpdir(), `test-cluster-manager-logger-${Date.now()}.log`);
    logger = new LoggingUtils({ filePath: loggerFilePath, level: 'debug' });
    errorHandler = new ErrorHandlingUtils({ logger });

    // Spy on logger and errorHandler methods to verify calls
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
    jest.spyOn(errorHandler, 'handleError').mockImplementation(() => {});

    clusterManager = new ClusterManager({
      logger: logger,
      errorHandler: errorHandler,
      maxWorkers: 2,
      daemonScript: '/path/to/daemon-worker.js',
    });
  });

  afterEach(async () => {
    await fileOperations.deleteFile(loggerFilePath).catch(() => {});
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new ClusterManager();
      expect(defaultManager.logger).toBeInstanceOf(LoggingUtils);
      expect(defaultManager.errorHandler).toBeInstanceOf(ErrorHandlingUtils);
      expect(defaultManager.maxWorkers).toBe(os.cpus().length);
      expect(defaultManager.daemonScript).toBeUndefined();
      expect(defaultManager.workers).toBeInstanceOf(Map);
      expect(defaultManager.workerCount).toBe(0);
    });

    test('should initialize with custom options', () => {
      expect(clusterManager.logger).toBe(logger);
      expect(clusterManager.errorHandler).toBe(errorHandler);
      expect(clusterManager.maxWorkers).toBe(2);
      expect(clusterManager.daemonScript).toBe('/path/to/daemon-worker.js');
      expect(clusterManager.workers).toBeInstanceOf(Map);
      expect(clusterManager.workerCount).toBe(0);
    });
  });

  describe('startMaster', () => {
    test('should fork workers if it is the master process', async () => {
      await clusterManager.startMaster();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Мастер-процесс'));
      expect(cluster.fork).toHaveBeenCalledTimes(2); // maxWorkers = 2
      expect(cluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(clusterManager.getWorkersCount()).toBe(2);
    });

    test('should log a warning and not fork workers if not master process', async () => {
      cluster.isMaster = false;
      await clusterManager.startMaster();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('startMaster может быть вызван только из мастер-процесса.'));
      expect(cluster.fork).not.toHaveBeenCalled();
      expect(clusterManager.getWorkersCount()).toBe(0);
    });

    test('should restart a worker on exit', async () => {
      await clusterManager.startMaster();
      const initialWorker = Array.from(clusterManager.workers.values())[0];
      const exitCallback = cluster.on.mock.calls[0][1];

      jest.clearAllMocks(); // Clear mocks to check new fork call
      cluster.fork.mockClear(); // Clear fork mock explicitly

      exitCallback(initialWorker, 0, 'SIGTERM');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Рабочий процесс'));
      expect(cluster.fork).toHaveBeenCalledTimes(1); // One worker restarted
      expect(clusterManager.getWorkersCount()).toBe(2); // Still 2 workers, one replaced
    });
  });

  describe('forkWorker', () => {
    test('should fork a new worker and add it to the map', () => {
      const initialWorkerCount = clusterManager.getWorkersCount();
      clusterManager.forkWorker();
      expect(cluster.fork).toHaveBeenCalledTimes(1);
      expect(clusterManager.getWorkersCount()).toBe(initialWorkerCount + 1);
      expect(clusterManager.workers.size).toBe(initialWorkerCount + 1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Запущен рабочий процесс'));
      expect(clusterManager.workers.values().next().value.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('stopWorkers', () => {
    test('should kill all active workers', async () => {
      await clusterManager.startMaster(); // Fork 2 workers
      jest.clearAllMocks(); // Clear fork and on calls

      await clusterManager.stopWorkers();

      expect(logger.info).toHaveBeenCalledWith('Остановка всех рабочих процессов...');
      expect(Array.from(clusterManager.workers.values())[0].kill).toHaveBeenCalledTimes(1);
      expect(Array.from(clusterManager.workers.values())[1].kill).toHaveBeenCalledTimes(1);
      expect(clusterManager.workers.size).toBe(0);
      expect(clusterManager.getWorkersCount()).toBe(0);
    });

    test('should do nothing if no workers are running', async () => {
      await clusterManager.stopWorkers();
      expect(logger.info).toHaveBeenCalledWith('Остановка всех рабочих процессов...');
      expect(cluster.fork).not.toHaveBeenCalled(); // No new workers forked implicitly
      expect(clusterManager.workers.size).toBe(0);
    });
  });

  describe('setupWorkerListeners', () => {
    let mockWorker;

    beforeEach(() => {
      mockWorker = cluster.fork(); // Create a mock worker
      mockWorker.on.mockClear(); // Clear previous on calls
      clusterManager.setupWorkerListeners(mockWorker);
    });

    test('should set up message listener and emit workerMessage', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('message', expect.any(Function));
      const messageCallback = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
      const emitSpy = jest.spyOn(clusterManager, 'emit');
      const testMessage = { type: 'test', data: 'hello' };
      messageCallback(testMessage);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Мастер получил сообщение от рабочего ${mockWorker.process.pid}:`), testMessage);
      expect(emitSpy).toHaveBeenCalledWith('workerMessage', mockWorker.id, testMessage);
    });

    test('should set up error listener and handle error', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
      const errorCallback = mockWorker.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Worker failed');
      errorCallback(testError);
      expect(errorHandler.handleError).toHaveBeenCalledWith(testError, { context: `Worker ${mockWorker.process.pid} error` });
    });

    test('should set up online listener and emit workerOnline', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('online', expect.any(Function));
      const onlineCallback = mockWorker.on.mock.calls.find(call => call[0] === 'online')[1];
      const emitSpy = jest.spyOn(clusterManager, 'emit');
      onlineCallback();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Рабочий процесс ${mockWorker.process.pid} онлайн.`));
      expect(emitSpy).toHaveBeenCalledWith('workerOnline', mockWorker.id);
    });

    test('should set up listening listener and emit workerListening', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('listening', expect.any(Function));
      const listeningCallback = mockWorker.on.mock.calls.find(call => call[0] === 'listening')[1];
      const emitSpy = jest.spyOn(clusterManager, 'emit');
      const address = { port: 3000 };
      listeningCallback(address);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Рабочий процесс ${mockWorker.process.pid} слушает на ${address.port}.`));
      expect(emitSpy).toHaveBeenCalledWith('workerListening', mockWorker.id, address);
    });
  });

  describe('getWorkersCount', () => {
    test('should return the current number of workers', async () => {
      expect(clusterManager.getWorkersCount()).toBe(0);
      await clusterManager.startMaster();
      expect(clusterManager.getWorkersCount()).toBe(2);
    });
  });

  describe('sendToAllWorkers', () => {
    test('should send a message to all workers', async () => {
      await clusterManager.startMaster();
      const workers = Array.from(clusterManager.workers.values());
      jest.clearAllMocks();
      const testMessage = { type: 'command', action: 'start' };
      clusterManager.sendToAllWorkers(testMessage);
      expect(workers[0].send).toHaveBeenCalledWith(testMessage);
      expect(workers[1].send).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('sendToWorker', () => {
    test('should send a message to a specific worker', async () => {
      await clusterManager.startMaster();
      const worker1 = Array.from(clusterManager.workers.values())[0];
      const testMessage = { type: 'data', payload: 123 };

      const result = clusterManager.sendToWorker(worker1.id, testMessage);
      expect(result).toBe(true);
      expect(worker1.send).toHaveBeenCalledWith(testMessage);
    });

    test('should return false and log warning if worker not found', () => {
      const result = clusterManager.sendToWorker(999, {});
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Рабочий процесс с ID 999 не найден'));
    });
  });

  describe('getWorker', () => {
    test('should return the worker object for a given ID', async () => {
      await clusterManager.startMaster();
      const worker1 = Array.from(clusterManager.workers.values())[0];
      const retrievedWorker = clusterManager.getWorker(worker1.id);
      expect(retrievedWorker).toBe(worker1);
    });

    test('should return undefined if worker not found', () => {
      const retrievedWorker = clusterManager.getWorker(999);
      expect(retrievedWorker).toBeUndefined();
    });
  });
});
