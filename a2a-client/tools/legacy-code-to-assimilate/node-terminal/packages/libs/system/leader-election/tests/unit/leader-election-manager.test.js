const { LeaderElectionManager } = require('../../index.js');
const EventEmitter = require('eventemitter3');

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
  safeExecute: jest.fn((fn, context) => fn()),
};

// Mock global timers
jest.useFakeTimers();

describe('LeaderElectionManager', () => {
  let manager;
  const daemonId = 'daemon-1';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new LeaderElectionManager({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      daemonId,
      electionTimeout: 5000,
      heartbeatInterval: 3000,
      workers: new Map([['worker-1', { send: jest.fn() }], ['worker-2', { send: jest.fn() }]]),
      mcpConnections: new Map([['mcp-a', { send: jest.fn() }], ['mcp-b', { send: jest.fn() }]]),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    manager.stop();
  });

  describe('constructor', () => {
    test('should initialize with provided options', () => {
      expect(manager.logger).toBe(mockLogger);
      expect(manager.errorHandler).toBe(mockErrorHandler);
      expect(manager.daemonId).toBe(daemonId);
      expect(manager.electionTimeout).toBe(5000);
      expect(manager.heartbeatInterval).toBe(3000);
      expect(manager.workers).toBeInstanceOf(Map);
      expect(manager.mcpConnections).toBeInstanceOf(Map);
      expect(manager.isLeader).toBe(false);
      expect(manager.currentLeader).toBeNull();
      expect(manager.leaderElectionTimer).toBeNull();
      expect(manager.heartbeatTimer).toBeNull();
    });

    test('should use default logger and error handler if not provided', () => {
      const newManager = new LeaderElectionManager({ daemonId: 'test-daemon' });
      expect(newManager.logger).toBeInstanceOf(EventEmitter);
      expect(newManager.errorHandler).toBeInstanceOf(Object); // ErrorHandlingUtils
    });
  });

  describe('startLeaderElection', () => {
    test('should start leader election timer and log info', () => {
      manager.startLeaderElection();
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), manager.electionTimeout);
      expect(manager.leaderElectionTimer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Лидер-выборы запущены.');
    });

    test('should clear existing timer before setting new one', () => {
      manager.leaderElectionTimer = 'mockTimer';
      manager.startLeaderElection();
      expect(clearInterval).toHaveBeenCalledWith('mockTimer');
    });
  });

  describe('electLeader', () => {
    test('should elect the daemon with the smallest ID as leader', async () => {
      manager.workers = new Map([['daemon-3', {}], ['daemon-2', {}]]);
      manager.daemonId = 'daemon-1';

      await manager.electLeader();

      expect(manager.currentLeader).toBe('daemon-1');
      expect(manager.isLeader).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Новый лидер выбран', expect.objectContaining({ leader: 'daemon-1', isLeader: true }));
      expect(manager.emit).toHaveBeenCalledWith('leaderChanged', { leader: 'daemon-1', isLeader: true });
    });

    test('should elect another daemon as leader if its ID is smaller', async () => {
      manager.workers = new Map([['daemon-0', {}], ['daemon-2', {}]]);
      manager.daemonId = 'daemon-1';

      await manager.electLeader();

      expect(manager.currentLeader).toBe('daemon-0');
      expect(manager.isLeader).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Новый лидер выбран', expect.objectContaining({ leader: 'daemon-0', isLeader: false }));
      expect(manager.emit).toHaveBeenCalledWith('leaderChanged', { leader: 'daemon-0', isLeader: false });
    });

    test('should not re-emit leaderChanged if leader does not change', async () => {
      manager.currentLeader = 'daemon-1'; // Already leader
      manager.isLeader = true;

      await manager.electLeader();

      expect(manager.currentLeader).toBe('daemon-1');
      expect(manager.isLeader).toBe(true);
      expect(manager.emit).not.toHaveBeenCalledWith('leaderChanged', expect.any(Object));
    });

    test('should log warning if no candidates for election', async () => {
      manager.workers = new Map();
      manager.daemonId = null; // No self ID either

      await manager.electLeader();

      expect(mockLogger.warn).toHaveBeenCalledWith('[LeaderElectionManager] Нет кандидатов для выборов лидера.');
      expect(manager.currentLeader).toBeNull();
      expect(manager.isLeader).toBe(false);
    });

    test('should handle errors during electLeader', async () => {
      const electionError = new Error('Election logic failed');
      jest.spyOn(Array.prototype, 'sort').mockImplementationOnce(() => { throw electionError; });

      await manager.electLeader();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(electionError, { context: 'LeaderElectionManager.electLeader' });
    });

    test('should include mcpConnections in candidates if available', async () => {
      manager.daemonId = 'daemon-b';
      manager.workers = new Map();
      manager.mcpConnections = new Map([['daemon-a', {}], ['daemon-c', {}]]);

      await manager.electLeader();
      expect(manager.currentLeader).toBe('daemon-a');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Новый лидер выбран'),
        expect.objectContaining({ candidates: ['daemon-a', 'daemon-b', 'daemon-c'] })
      );
    });
  });

  describe('startHeartbeat', () => {
    test('should start heartbeat timer and log info', () => {
      manager.startHeartbeat();
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), manager.heartbeatInterval);
      expect(manager.heartbeatTimer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Heartbeat запущен.');
    });

    test('should clear existing timer before setting new one', () => {
      manager.heartbeatTimer = 'mockTimer';
      manager.startHeartbeat();
      expect(clearInterval).toHaveBeenCalledWith('mockTimer');
    });
  });

  describe('sendHeartbeat', () => {
    test('should emit heartbeat event with correct data', () => {
      manager.isLeader = true;
      manager.daemonId = 'leader-daemon';
      manager.workers = new Map([['w1', { send: jest.fn() }]]);
      manager.mcpConnections = new Map([['mcp1', { send: jest.fn() }]]);

      jest.spyOn(manager, 'emit');
      manager.sendHeartbeat();

      expect(manager.emit).toHaveBeenCalledWith('heartbeat', expect.objectContaining({
        daemonId: 'leader-daemon',
        isLeader: true,
        workersCount: 1,
        mcpConnectionsCount: 1,
      }));
    });

    test('should send heartbeat to all workers', () => {
      const worker1 = { send: jest.fn() };
      const worker2 = { send: jest.fn() };
      manager.workers = new Map([['w1', worker1], ['w2', worker2]]);

      manager.sendHeartbeat();

      expect(worker1.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'heartbeat' }));
      expect(worker2.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'heartbeat' }));
    });

    test('should not send heartbeat to workers if workers is null', () => {
      manager.workers = null;
      jest.spyOn(manager, 'emit');
      manager.sendHeartbeat();
      expect(manager.emit).toHaveBeenCalledWith('heartbeat', expect.objectContaining({ workersCount: 0 }));
    });

    test('should not send heartbeat to mcpConnections if mcpConnections is null', () => {
      manager.mcpConnections = null;
      jest.spyOn(manager, 'emit');
      manager.sendHeartbeat();
      expect(manager.emit).toHaveBeenCalledWith('heartbeat', expect.objectContaining({ mcpConnectionsCount: 0 }));
    });
  });

  describe('transferLeadership', () => {
    test('should transfer leadership if current daemon is leader', async () => {
      manager.isLeader = true;
      manager.currentLeader = daemonId;
      const targetDaemonId = 'daemon-2';
      jest.spyOn(manager, 'stop');

      const result = await manager.transferLeadership(targetDaemonId);

      expect(result).toBe(true);
      expect(manager.isLeader).toBe(false);
      expect(manager.currentLeader).toBe(targetDaemonId);
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Передача лидерства', { targetDaemonId });
      expect(manager.emit).toHaveBeenCalledWith('leadershipTransfer', { targetDaemonId });
      expect(manager.stop).toHaveBeenCalledTimes(1);
    });

    test('should not transfer leadership if current daemon is not leader', async () => {
      manager.isLeader = false;
      manager.currentLeader = 'daemon-2';
      jest.spyOn(manager, 'stop');

      const result = await manager.transferLeadership('daemon-3');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('[LeaderElectionManager] Не лидер, не могу передать лидерство.');
      expect(manager.stop).not.toHaveBeenCalled();
    });

    test('should handle errors during transferLeadership', async () => {
      manager.isLeader = true;
      manager.currentLeader = daemonId;
      const transferError = new Error('Transfer failed');
      jest.spyOn(manager, 'emit').mockImplementationOnce(() => { throw transferError; });

      const result = await manager.transferLeadership('daemon-2');

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(transferError, { context: 'LeaderElectionManager.transferLeadership' });
    });
  });

  describe('stop', () => {
    test('should clear both leader election and heartbeat timers', () => {
      manager.startLeaderElection();
      manager.startHeartbeat();

      manager.stop();

      expect(clearInterval).toHaveBeenCalledWith(manager.leaderElectionTimer);
      expect(clearInterval).toHaveBeenCalledWith(manager.heartbeatTimer);
      expect(manager.leaderElectionTimer).toBeNull();
      expect(manager.heartbeatTimer).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Лидер-выборы и Heartbeat остановлены.');
    });

    test('should do nothing if timers are already null', () => {
      manager.leaderElectionTimer = null;
      manager.heartbeatTimer = null;

      manager.stop();

      expect(clearInterval).not.toHaveBeenCalled();
    });
  });

  describe('setLeaderStatus', () => {
    test('should set leader status and emit leaderChanged event', () => {
      manager.setLeaderStatus(true, 'new-leader');

      expect(manager.isLeader).toBe(true);
      expect(manager.currentLeader).toBe('new-leader');
      expect(mockLogger.info).toHaveBeenCalledWith('[LeaderElectionManager] Статус лидера обновлен', { isLeader: true, leaderId: 'new-leader' });
      expect(manager.emit).toHaveBeenCalledWith('leaderChanged', { leader: 'new-leader', isLeader: true });
    });

    test('should set non-leader status', () => {
      manager.setLeaderStatus(false, 'current-leader');

      expect(manager.isLeader).toBe(false);
      expect(manager.currentLeader).toBe('current-leader');
    });
  });
});
