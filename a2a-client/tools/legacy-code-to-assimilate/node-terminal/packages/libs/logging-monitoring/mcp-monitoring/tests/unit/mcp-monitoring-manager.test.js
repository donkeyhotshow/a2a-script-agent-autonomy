const { MCPMonitoringManager, SimpleErrorHandler } = require('../../index.js'); // Correct path to mcp-monitoring module
const EventEmitter = require('eventemitter3');
const path = require('path');
const os = require('os');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const fs = require('fs');

describe('MCPMonitoringManager', () => {
  let mcpMonitoringManager;
  let mcpConnections;
  let logger;
  let errorHandler;
  let loggerFilePath;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    loggerFilePath = path.join(os.tmpdir(), `test-mcp-monitoring-logger-${Date.now()}.log`);
    logger = new LoggingUtils({ filePath: loggerFilePath, level: 'debug' });
    errorHandler = new SimpleErrorHandler({ logger });

    // Spy on logger and errorHandler methods if needed, to check calls
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
    jest.spyOn(errorHandler, 'handleError').mockImplementation(() => {});

    mcpConnections = new Map();

    mcpMonitoringManager = new MCPMonitoringManager({
      logger: logger,
      errorHandler: errorHandler,
      mcpConnections: mcpConnections,
      monitoringInterval: 1000,
      inactivityTimeout: 5000,
    });

    // Ensure Date.now() is mocked consistently for server registration timestamps
    const mockDateNow = Date.now();
    jest.spyOn(global.Date, 'now').mockReturnValue(mockDateNow);
  });

  afterEach(async () => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Clean up log file if it exists
    try {
      if (fs.existsSync(loggerFilePath)) {
        fs.unlinkSync(loggerFilePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new MCPMonitoringManager();
      expect(defaultManager.logger).toBeInstanceOf(LoggingUtils);
      expect(defaultManager.errorHandler).toBeInstanceOf(SimpleErrorHandler);
      expect(defaultManager.mcpConnections).toBeInstanceOf(Map);
      expect(defaultManager.monitoringInterval).toBe(10000);
      expect(defaultManager.inactivityTimeout).toBe(60000);
      expect(defaultManager.monitoringTimer).toBeNull();
    });

    test('should initialize with custom options', () => {
      expect(mcpMonitoringManager.logger).toBe(logger);
      expect(mcpMonitoringManager.errorHandler).toBe(errorHandler);
      expect(mcpMonitoringManager.mcpConnections).toBe(mcpConnections);
      expect(mcpMonitoringManager.monitoringInterval).toBe(1000);
      expect(mcpMonitoringManager.inactivityTimeout).toBe(5000);
      expect(mcpMonitoringManager.monitoringTimer).toBeNull();
    });
  });

  describe('startMCPMonitoring', () => {
    test('should set up an interval for monitoring MCP servers', () => {
      jest.spyOn(mcpMonitoringManager, 'monitorMCPServers');
      mcpMonitoringManager.startMCPMonitoring();
      expect(logger.info).toHaveBeenCalledWith('[MCPMonitoringManager] Мониторинг MCP серверов запущен.');
      expect(mcpMonitoringManager.monitoringTimer).toBeTruthy();

      jest.advanceTimersByTime(1000);
      expect(mcpMonitoringManager.monitorMCPServers).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);
      expect(mcpMonitoringManager.monitorMCPServers).toHaveBeenCalledTimes(2);
    });

    test('should clear previous monitoring timer if exists', () => {
      const initialTimer = setInterval(() => {}, 1000);
      mcpMonitoringManager.monitoringTimer = initialTimer;
      mcpMonitoringManager.startMCPMonitoring();
      expect(mcpMonitoringManager.monitoringTimer).toBeTruthy();
      expect(mcpMonitoringManager.monitoringTimer).not.toBe(initialTimer);
    });
  });

  describe('stopMCPMonitoring', () => {
    test('should clear monitoring timer if exists', () => {
      const timer = setInterval(() => {}, 1000);
      mcpMonitoringManager.monitoringTimer = timer;
      mcpMonitoringManager.stopMCPMonitoring();
      expect(mcpMonitoringManager.monitoringTimer).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('[MCPMonitoringManager] Мониторинг MCP серверов остановлен.');
    });

    test('should do nothing if timer is already null', () => {
      mcpMonitoringManager.stopMCPMonitoring();
      expect(mcpMonitoringManager.monitoringTimer).toBeNull();
    });
  });

  describe('monitorMCPServers', () => {
    test('should log debug if no servers are registered', async () => {
      await mcpMonitoringManager.monitorMCPServers();
      expect(logger.debug).toHaveBeenCalledWith('[MCPMonitoringManager] Нет зарегистрированных MCP серверов для мониторинга.');
    });

    test('should check status of registered servers', async () => {
      jest.spyOn(mcpMonitoringManager, 'checkMCPServerHealth').mockResolvedValue(true);
      mcpMonitoringManager.registerMCPServer('server1', { host: 'localhost', port: 8080 });
      mcpMonitoringManager.registerMCPServer('server2', { host: 'remotehost', port: 9000 });

      await mcpMonitoringManager.monitorMCPServers();

      expect(mcpMonitoringManager.checkMCPServerHealth).toHaveBeenCalledTimes(2);
      expect(mcpMonitoringManager.checkMCPServerHealth).toHaveBeenCalledWith(mcpMonitoringManager.getMCPServer('server1'));
      expect(mcpMonitoringManager.checkMCPServerHealth).toHaveBeenCalledWith(mcpMonitoringManager.getMCPServer('server2'));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should emit mcpServerBad if a server is bad', async () => {
      jest.spyOn(mcpMonitoringManager, 'checkMCPServerHealth')
        .mockImplementation(async (server) => server.id !== 'server1'); // server1 is bad
      const emitSpy = jest.spyOn(mcpMonitoringManager, 'emit');

      mcpMonitoringManager.registerMCPServer('server1', { host: 'localhost', port: 8080 });
      mcpMonitoringManager.registerMCPServer('server2', { host: 'remotehost', port: 9000 });

      await mcpMonitoringManager.monitorMCPServers();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('MCP сервер плохо'), { serverId: 'server1', serverInfo: expect.any(Object) });
      expect(emitSpy).toHaveBeenCalledWith('mcpServerBad', { serverId: 'server1', server: expect.any(Object) });
      expect(emitSpy).not.toHaveBeenCalledWith('mcpServerBad', { serverId: 'server2', server: expect.any(Object) });
    });

    test('should handle errors during monitoring', async () => {
      jest.spyOn(mcpMonitoringManager, 'checkMCPServerHealth').mockRejectedValue(new Error('Check failed'));
      mcpMonitoringManager.registerMCPServer('server1', { host: 'localhost', port: 8080 });

      await mcpMonitoringManager.monitorMCPServers();

      expect(errorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), { context: 'MCPMonitoringManager.monitorMCPServers' });
    });
  });

  describe('checkMCPServerHealth', () => {
    test('should return true if server is connected and active', async () => {
      const server = { id: 'server1', connected: true, lastActivity: Date.now() };
      const isHealthy = await mcpMonitoringManager.checkMCPServerHealth(server);
      expect(isHealthy).toBe(true);
    });

    test('should return false if server is not connected', async () => {
      const server = { id: 'server1', connected: false, lastActivity: Date.now() };
      const isHealthy = await mcpMonitoringManager.checkMCPServerHealth(server);
      expect(isHealthy).toBe(false);
    });

    test('should return false if server is inactive', async () => {
      const server = { id: 'server1', connected: true, lastActivity: Date.now() - 6000 }; // 6 seconds ago
      const isHealthy = await mcpMonitoringManager.checkMCPServerHealth(server);
      expect(isHealthy).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('MCP сервер неактивен'), { serverId: 'server1', timeSinceLastActivity: 6000 });
    });

    test('should handle errors during status check', async () => {
      const server = { id: 'server1', connected: true, lastActivity: Date.now() };
      // Force an error during property access for example
      Object.defineProperty(server, 'connected', { get: () => { throw new Error('Access error'); } });
      const isHealthy = await mcpMonitoringManager.checkMCPServerHealth(server);
      expect(isHealthy).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка при проверке здоровья MCP сервера:'), expect.any(Error));
    });
  });

  describe('registerMCPServer', () => {
    test('should register a new MCP server', () => {
      const emitSpy = jest.spyOn(mcpMonitoringManager, 'emit');
      const serverInfo = { host: 'localhost', port: 8080 };
      mcpMonitoringManager.registerMCPServer('server1', serverInfo);

      const registeredServer = mcpConnections.get('server1');
      expect(registeredServer).toBeDefined();
      expect(registeredServer.id).toBe('server1');
      expect(registeredServer.host).toBe('localhost');
      expect(registeredServer.registeredAt).toBe(Date.now());
      expect(registeredServer.lastActivity).toBe(Date.now());
      expect(registeredServer.connected).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('[MCPMonitoringManager] MCP сервер зарегистрирован', { serverId: 'server1', serverInfo });
      expect(emitSpy).toHaveBeenCalledWith('mcpServerRegistered', { serverId: 'server1', serverInfo });
    });

    test('should overwrite existing server if registered again', () => {
      mcpMonitoringManager.registerMCPServer('server1', { host: 'old', port: 100 });
      jest.advanceTimersByTime(100);
      mcpMonitoringManager.registerMCPServer('server1', { host: 'new', port: 200 });

      const registeredServer = mcpConnections.get('server1');
      expect(registeredServer.host).toBe('new');
      expect(registeredServer.port).toBe(200);
      expect(registeredServer.lastActivity).toBe(Date.now());
    });
  });

  describe('unregisterMCPServer', () => {
    test('should unregister an existing MCP server', () => {
      const emitSpy = jest.spyOn(mcpMonitoringManager, 'emit');
      mcpMonitoringManager.registerMCPServer('server1', {});
      jest.clearAllMocks(); // Clear previous logs/emits

      const removed = mcpMonitoringManager.unregisterMCPServer('server1');
      expect(removed).toBe(true);
      expect(mcpConnections.has('server1')).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('[MCPMonitoringManager] MCP сервер отменен', { serverId: 'server1' });
      expect(emitSpy).toHaveBeenCalledWith('mcpServerUnregistered', { serverId: 'server1' });
    });

    test('should return false if server is not found', () => {
      const removed = mcpMonitoringManager.unregisterMCPServer('nonexistent');
      expect(removed).toBe(false);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('updateMCPServerActivity', () => {
    test('should update lastActivity timestamp for an existing server', () => {
      mcpMonitoringManager.registerMCPServer('server1', {});
      const initialActivity = mcpConnections.get('server1').lastActivity;
      
      // Advance time and update Date.now mock to return a different value
      jest.advanceTimersByTime(1000);
      const newTime = initialActivity + 1000;
      jest.spyOn(global.Date, 'now').mockReturnValue(newTime);
      
      mcpMonitoringManager.updateMCPServerActivity('server1');

      const updatedServer = mcpConnections.get('server1');
      expect(updatedServer.lastActivity).toBe(newTime);
      expect(updatedServer.lastActivity).toBeGreaterThan(initialActivity);
      expect(logger.debug).toHaveBeenCalledWith('[MCPMonitoringManager] Активность MCP сервера обновлена', { serverId: 'server1' });
    });

    test('should log a warning if server is not found', () => {
      mcpMonitoringManager.updateMCPServerActivity('nonexistent');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Попытка обновить активность несуществующего MCP сервера'), { serverId: 'nonexistent' });
    });
  });

  describe('getMCPServer', () => {
    test('should return server info for a given ID', () => {
      const serverInfo = { host: 'test', port: 123 };
      mcpMonitoringManager.registerMCPServer('server1', serverInfo);
      expect(mcpMonitoringManager.getMCPServer('server1')).toMatchObject({ id: 'server1', ...serverInfo });
    });

    test('should return undefined if server not found', () => {
      expect(mcpMonitoringManager.getMCPServer('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllMCPServers', () => {
    test('should return an array of all registered servers', () => {
      mcpMonitoringManager.registerMCPServer('server1', { host: 'a' });
      mcpMonitoringManager.registerMCPServer('server2', { host: 'b' });
      const allServers = mcpMonitoringManager.getAllMCPServers();
      expect(allServers.length).toBe(2);
      expect(allServers[0].id).toBe('server1');
      expect(allServers[1].id).toBe('server2');
    });

    test('should return an empty array if no servers are registered', () => {
      expect(mcpMonitoringManager.getAllMCPServers()).toEqual([]);
    });
  });
});
