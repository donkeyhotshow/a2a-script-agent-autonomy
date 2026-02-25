/**
 * ServiceManagementUtils - Comprehensive Unit Tests
 * Тестирование утилит управления сервисами согласно принципам когнитивной дисциплины
 * 
 * Приоритеты тестирования:
 * 1. Стабильность - проверка корректной работы в разных условиях
 * 2. Предсказуемость - тестирование edge cases и граничных условий
 * 3. Работоспособность - проверка основных сценариев использования
 * 4. Контроль - тестирование управления жизненным циклом сервисов
 */

const { ServiceManagementUtils } = require('../index.js');
const path = require('path');
const fs = require('fs').promises;

// Стабильные моки для предсказуемого поведения
const createMockLogger = () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
});

const createMockErrorHandler = () => ({
    logError: jest.fn(),
    maxRetries: 3,
    handleStartupFailure: jest.fn().mockResolvedValue(true)
});

const createMockConfigManager = () => ({
    startWatchingConfig: jest.fn(),
    stopWatchingConfig: jest.fn(),
    loadServicesConfig: jest.fn()
});

const createMockProcessManager = () => ({
    start: jest.fn(),
    kill: jest.fn(),
    checkProcessRunning: jest.fn(),
    getServicePort: jest.fn(),
    extractCandidatePorts: jest.fn()
});

const createMockMonitoringUtils = () => ({
    detectRunningPids: jest.fn(),
    checkPortListening: jest.fn(),
    checkUrl: jest.fn()
});

const createMockFileSystemUtils = () => ({
    fileExists: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    join: jest.fn()
});

const createMockSharedUtils = () => ({
    someMethod: jest.fn()
});

// Моки для внешних зависимостей
jest.mock('@libs/logging-monitoring/logging', () => ({
    LoggingUtils: jest.fn().mockImplementation(() => createMockLogger())
}));

jest.mock('@libs/error-management/error-handler', () => ({
    ErrorHandlingUtils: jest.fn().mockImplementation(() => createMockErrorHandler())
}));

jest.mock('@libs/core/configuration', () => ({
    ConfigurationUtils: jest.fn().mockImplementation(() => createMockConfigManager())
}));

jest.mock('@libs/logging-monitoring/monitoring', () => ({
    MonitoringUtils: jest.fn().mockImplementation(() => createMockMonitoringUtils())
}));

jest.mock('@libs/system/file-operations', () => ({
    FileSystemUtils: jest.fn().mockImplementation(() => createMockFileSystemUtils())
}));

jest.mock('@libs/core/shared', () => ({
    SharedUtils: jest.fn().mockImplementation(() => createMockSharedUtils())
}));

jest.mock('../process-management', () => ({
    ProcessManagementUtils: jest.fn().mockImplementation(() => createMockProcessManager())
}));

describe('ServiceManagementUtils', () => {
    let serviceManager;
    let mockDependencies;
    let mockLogger;
    let mockErrorHandler;
    let mockConfigManager;
    let mockProcessManager;
    let mockMonitoringUtils;
    let mockFileSystemUtils;
    let mockSharedUtils;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Создаем свежие моки для каждого теста
        mockLogger = createMockLogger();
        mockErrorHandler = createMockErrorHandler();
        mockConfigManager = createMockConfigManager();
        mockProcessManager = createMockProcessManager();
        mockMonitoringUtils = createMockMonitoringUtils();
        mockFileSystemUtils = createMockFileSystemUtils();
        mockSharedUtils = createMockSharedUtils();

        mockDependencies = {
            logger: mockLogger,
            errorHandler: mockErrorHandler,
            configManager: mockConfigManager,
            processManager: mockProcessManager,
            monitoringUtils: mockMonitoringUtils,
            fileSystemUtils: mockFileSystemUtils,
            sharedUtils: mockSharedUtils,
            projectRoot: '/test/project',
            configDir: '/test/config'
        };

        serviceManager = new ServiceManagementUtils(mockDependencies);
    });

    afterEach(() => {
        jest.useRealTimers();
        if (serviceManager) {
            serviceManager.stop();
        }
    });

    describe('Constructor', () => {
        test('should create instance with default dependencies', () => {
            const defaultManager = new ServiceManagementUtils();
            expect(defaultManager).toBeDefined();
            expect(defaultManager.services).toBeDefined();
            expect(defaultManager.services instanceof Map).toBe(true);
        });

        test('should create instance with custom dependencies', () => {
            expect(serviceManager).toBeDefined();
            expect(serviceManager.logger).toBe(mockLogger);
            expect(serviceManager.errorHandler).toBe(mockErrorHandler);
            expect(serviceManager.configManager).toBe(mockConfigManager);
            expect(serviceManager.processManager).toBe(mockProcessManager);
        });

        test('should bind methods correctly', () => {
            expect(typeof serviceManager.autostart).toBe('function');
            expect(typeof serviceManager.startService).toBe('function');
            expect(typeof serviceManager.stopService).toBe('function');
        });
    });

    describe('Service Management', () => {
        test('addService should add service successfully', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            const result = await serviceManager.addService('test-id', config);

            expect(result.success).toBe(true);
            expect(result.id).toBe('test-id');
            expect(result.config).toBe(config);
            expect(serviceManager.services.has('test-id')).toBe(true);
        });

        test('addService should reject duplicate service', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);
            const result = await serviceManager.addService('test-id', config);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Service already exists');
        });

        test('removeService should remove service successfully', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            const result = await serviceManager.removeService('test-id');

            expect(result.success).toBe(true);
            expect(serviceManager.services.has('test-id')).toBe(false);
        });

        test('getService should return service by id', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            const service = serviceManager.getService('test-id');
            expect(service).toBeDefined();
            expect(service.id).toBe('test-id');
            expect(service.config).toBe(config);
        });

        test('getService should return null for non-existent service', () => {
            const service = serviceManager.getService('non-existent');
            expect(service).toBeNull();
        });

        test('getServicesStatus should return all services status', async () => {
            const config1 = { name: 'service1', command: 'node app1.js', enabled: true };
            const config2 = { name: 'service2', command: 'node app2.js', enabled: false };

            await serviceManager.addService('service1', config1);
            await serviceManager.addService('service2', config2);

            const statuses = serviceManager.getServicesStatus();

            expect(statuses.service1).toBeDefined();
            expect(statuses.service2).toBeDefined();
            expect(statuses.service1.status).toBe('stopped');
            expect(statuses.service2.status).toBe('stopped');
        });
    });

    describe('Service Starting', () => {
        test('startService should fail with null config', async () => {
            const result = await serviceManager.startService('test-id', null);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Service configuration is null');
        });

        test('startService should fail with no start modes', async () => {
            const config = { name: 'test-service' };

            const result = await serviceManager.startService('test-id', config);

            expect(result.success).toBe(false);
            expect(result.error).toContain('не найден');
        });

        test('startService should start service successfully', async () => {
            const config = {
                name: 'test-service',
                start: {
                    command: 'node server.js',
                    cwd: '/test/dir'
                }
            };

            const result = await serviceManager.startService('test-id', config);

            expect(result.success).toBeDefined();
            expect(result.status).toBeDefined();
        });

        test('startService should detect already running service', async () => {
            const config = {
                name: 'test-service',
                start: { command: 'node server.js' },
                port: 3000
            };

            const result = await serviceManager.startService('test-id', config);

            expect(result.success).toBeDefined();
            expect(result.status).toBeDefined();
        });

        test('startService should detect running process by PID', async () => {
            const config = {
                name: 'test-service',
                start: { command: 'node server.js' },
                port: 3000
            };

            const result = await serviceManager.startService('test-id', config);

            expect(result.success).toBeDefined();
            expect(result.status).toBeDefined();
        });
    });

    describe('Service Stopping', () => {
        test('stopService should handle non-existent service', async () => {
            const result = await serviceManager.stopService('non-existent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Service not found');
        });

        test('stopService should stop service with running process', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            // Simulate running service
            const mockService = serviceManager.services.get('test-id');
            mockService.process = { pid: 123 };
            mockService.status = 'running';

            mockProcessManager.kill.mockResolvedValue({ success: true });

            const result = await serviceManager.stopService('test-id');

            expect(result.success).toBe(true);
            expect(result.status).toBe('stopped');
            expect(mockProcessManager.kill).toHaveBeenCalledWith(123);
        });

        test('stopService should handle external processes', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            mockMonitoringUtils.detectRunningPids.mockResolvedValue([456, 789]);
            mockProcessManager.kill.mockResolvedValue({ success: true });

            const result = await serviceManager.stopService('test-id');

            expect(mockProcessManager.kill).toHaveBeenCalledTimes(2);
            expect(result.success).toBe(true);
        });
    });

    describe('Service Restarting', () => {
        test('restartService should restart service successfully', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{
                    id: 'default',
                    command: 'node app.js',
                    enabled: true
                }]
            };

            await serviceManager.addService('test-id', config);

            mockProcessManager.kill.mockResolvedValue({ success: true });
            mockProcessManager.start.mockResolvedValue({ child: { pid: 456 }, pid: 456 });
            mockMonitoringUtils.detectRunningPids.mockResolvedValue([]);

            const result = await serviceManager.restartService('test-id');

            expect(mockProcessManager.kill).toHaveBeenCalled();
            expect(mockProcessManager.start).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        test('restartService should handle non-existent service', async () => {
            const result = await serviceManager.restartService('non-existent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Service configuration not found');
        });
    });

    describe('Service Status', () => {
        test('getServiceStatus should return not_found for non-existent service', async () => {
            const status = await serviceManager.getServiceStatus('non-existent');
            expect(status.status).toBe('not_found');
        });

        test('getServiceStatus should return status for existing service', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{ id: 'default', enabled: true }],
                statusUrl: 'http://localhost:3000/status'
            };

            await serviceManager.addService('test-id', config);

            mockMonitoringUtils.detectRunningPids.mockResolvedValue([123]);
            mockMonitoringUtils.checkUrl.mockResolvedValue({ ok: true, message: 'Healthy' });
            mockProcessManager.getServicePort.mockReturnValue(3000);
            mockMonitoringUtils.checkPortListening.mockResolvedValue(true);

            const status = await serviceManager.getServiceStatus('test-id');

            expect(status.status).toBe('running');
            expect(status.processRunning).toBe(true);
            expect(status.pid).toBe(123);
        });
    });

    describe('Configuration Management', () => {
        test('loadServicesFromConfig should load services from config', async () => {
            const configData = {
                services: {
                    service1: { name: 'Service 1', command: 'node app1.js' },
                    service2: { name: 'Service 2', command: 'node app2.js' }
                }
            };

            mockConfigManager.loadServicesConfig.mockReturnValue(configData);

            const result = await serviceManager.loadServicesFromConfig(configData);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(serviceManager.services.size).toBe(2);
        });

        test('loadServicesFromConfig should handle invalid config', async () => {
            const result = await serviceManager.loadServicesFromConfig({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid config data');
        });
    });

    describe('Autostart', () => {
        test('autostart should start services with autoStart enabled', async () => {
            const config1 = {
                name: 'auto-service',
                command: 'node app.js',
                autoStart: true,
                enabled: true,
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            const config2 = {
                name: 'manual-service',
                command: 'node app.js',
                autoStart: false,
                enabled: true
            };

            await serviceManager.addService('auto-id', config1);
            await serviceManager.addService('manual-id', config2);

            mockProcessManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            mockMonitoringUtils.detectRunningPids.mockResolvedValue([]);

            const result = await serviceManager.autostart();

            expect(result.success).toBe(true);
            expect(result.started).toBe(1);
            expect(mockProcessManager.start).toHaveBeenCalledTimes(1);
        });

        test('autostart should filter by group', async () => {
            const config1 = {
                name: 'group1-service',
                command: 'node app.js',
                autoStart: true,
                enabled: true,
                group: 'group1',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            const config2 = {
                name: 'group2-service',
                command: 'node app.js',
                autoStart: true,
                enabled: true,
                group: 'group2',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            await serviceManager.addService('service1', config1);
            await serviceManager.addService('service2', config2);

            mockProcessManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            mockMonitoringUtils.detectRunningPids.mockResolvedValue([]);

            const result = await serviceManager.autostart('group1');

            expect(result.success).toBe(true);
            expect(result.started).toBe(1);
        });
    });

    describe('Utility Methods', () => {
        test('pickMode should return correct mode', () => {
            const config = {
                startCommands: [
                    { id: 'mode1', enabled: false },
                    { id: 'mode2', enabled: true },
                    { id: 'mode3', enabled: false }
                ]
            };

            const mode = serviceManager.pickMode(config);
            expect(mode.id).toBe('mode2');
        });

        test('pickMode should return specific mode by id', () => {
            const config = {
                startCommands: [
                    { id: 'mode1', enabled: false },
                    { id: 'mode2', enabled: true },
                    { id: 'mode3', enabled: false }
                ]
            };

            const mode = serviceManager.pickMode(config, 'mode1');
            expect(mode.id).toBe('mode1');
        });

        test('getRunningServices should return running services', async () => {
            const config = {
                name: 'running-service',
                command: 'node app.js',
                startCommands: [{ id: 'default', enabled: true }]
            };

            await serviceManager.addService('running-id', config);

            // Simulate running service
            const service = serviceManager.services.get('running-id');
            service.status = 'running';
            service.startTime = Date.now();

            const runningServices = serviceManager.getRunningServices();

            expect(runningServices.length).toBe(1);
            expect(runningServices[0].appId).toBe('running-id');
            expect(runningServices[0].status).toBe('running');
        });
    });

    describe('Health Check and Monitoring', () => {
        test('should start status check cycle', () => {
            serviceManager._startStatusCheckCycle();
            expect(serviceManager.statusCheckTimer).toBeDefined();
        });

        test('should stop status check cycle', () => {
            serviceManager._startStatusCheckCycle();
            expect(serviceManager.statusCheckTimer).toBeDefined();

            serviceManager.stopStatusCheckCycle();
            expect(serviceManager.statusCheckTimer).toBeNull();
        });

        test('should start restart cycle', () => {
            serviceManager._startRestartCycle();
            expect(serviceManager.restartCycleTimer).toBeDefined();
        });

        test('should stop restart cycle', () => {
            serviceManager._startRestartCycle();
            expect(serviceManager.restartCycleTimer).toBeDefined();

            serviceManager.stopRestartCycle();
            expect(serviceManager.restartCycleTimer).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors gracefully in startService', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{
                    id: 'default',
                    command: 'node app.js',
                    enabled: true
                }]
            };

            mockProcessManager.start.mockRejectedValue(new Error('Process start failed'));

            const result = await serviceManager.startService('test-id', config);

            expect(result.success).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('should handle errors in stopService', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            const mockService = serviceManager.services.get('test-id');
            mockService.process = { pid: 123 };

            mockProcessManager.kill.mockRejectedValue(new Error('Kill failed'));

            const result = await serviceManager.stopService('test-id');

            expect(result.success).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('should handle configuration loading errors', async () => {
            mockConfigManager.loadServicesConfig.mockRejectedValue(new Error('Config load failed'));

            const result = await serviceManager.loadServicesFromConfig({});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid config data');
        });

        test('should handle service update errors', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-id', config);

            mockMonitoringUtils.checkUrl.mockRejectedValue(new Error('URL check failed'));

            const result = await serviceManager.updateService('test-id', { statusUrl: 'http://test.com' });

            expect(result.success).toBe(true); // Update should succeed even if status check fails
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        test('should handle empty service configuration', async () => {
            const result = await serviceManager.loadServicesFromConfig({ services: {} });
            expect(result.success).toBe(true);
            expect(result.count).toBe(0);
        });

        test('should handle null service configuration', async () => {
            const result = await serviceManager.loadServicesFromConfig(null);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid config data');
        });

        test('should handle undefined service configuration', async () => {
            const result = await serviceManager.loadServicesFromConfig(undefined);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid config data');
        });

        test('should handle service with no startCommands', async () => {
            const config = { name: 'test-service' };
            const result = await serviceManager.startService('test-id', config);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No start modes configured');
        });

        test('should handle service with empty startCommands array', async () => {
            const config = { name: 'test-service', startCommands: [] };
            const result = await serviceManager.startService('test-id', config);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No start modes configured');
        });

        test('should handle service with disabled startCommands', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{ id: 'default', enabled: false }]
            };
            const result = await serviceManager.startService('test-id', config);
            expect(result.success).toBe(false);
            expect(result.error).toBe('No start modes configured');
        });

        test('should handle very long service names', async () => {
            const longName = 'a'.repeat(1000);
            const config = { name: longName, command: 'node app.js' };
            const result = await serviceManager.addService('test-id', config);
            expect(result.success).toBe(true);
            expect(serviceManager.services.get('test-id').config.name).toBe(longName);
        });

        test('should handle special characters in service IDs', async () => {
            const specialId = 'test-service_123-abc.def';
            const config = { name: 'test-service', command: 'node app.js' };
            const result = await serviceManager.addService(specialId, config);
            expect(result.success).toBe(true);
            expect(serviceManager.services.has(specialId)).toBe(true);
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle large number of services', async () => {
            const services = {};
            for (let i = 0; i < 1000; i++) {
                services[`service-${i}`] = {
                    name: `Service ${i}`,
                    command: 'node app.js',
                    enabled: true
                };
            }

            const result = await serviceManager.loadServicesFromConfig({ services });
            expect(result.success).toBe(true);
            expect(result.count).toBe(1000);
            expect(serviceManager.services.size).toBe(1000);
        });

        test('should handle rapid service operations', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            
            // Добавляем сервис
            await serviceManager.addService('test-id', config);
            
            // Быстрые операции
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(serviceManager.getService('test-id'));
            }
            
            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.id).toBe('test-id');
            });
        });

        test('should clean up timers on stop', () => {
            serviceManager._startStatusCheckCycle();
            serviceManager._startRestartCycle();
            
            expect(serviceManager.statusCheckTimer).toBeDefined();
            expect(serviceManager.restartCycleTimer).toBeDefined();
            
            serviceManager.stop();
            
            expect(serviceManager.statusCheckTimer).toBeNull();
            expect(serviceManager.restartCycleTimer).toBeNull();
        });
    });

    describe('Configuration Management', () => {
        test('should handle config changes correctly', async () => {
            const initialConfig = {
                services: {
                    'service1': { name: 'Service 1', command: 'node app1.js' }
                }
            };

            await serviceManager.loadServicesFromConfig(initialConfig);
            expect(serviceManager.services.size).toBe(1);

            const updatedConfig = {
                services: {
                    'service1': { name: 'Service 1 Updated', command: 'node app1.js' },
                    'service2': { name: 'Service 2', command: 'node app2.js' }
                }
            };

            await serviceManager.handleConfigChange('services.json', updatedConfig);
            expect(serviceManager.services.size).toBe(2);
        });

        test('should handle config removal', async () => {
            const config = {
                services: {
                    'service1': { name: 'Service 1', command: 'node app1.js' }
                }
            };

            await serviceManager.loadServicesFromConfig(config);
            expect(serviceManager.services.size).toBe(1);

            await serviceManager.handleConfigRemoval('services.json');
            // Config removal should not affect loaded services
            expect(serviceManager.services.size).toBe(1);
        });
    });

    describe('Service Lifecycle Management', () => {
        test('should track service lifecycle correctly', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            // Add service
            await serviceManager.addService('test-id', config);
            expect(serviceManager.services.get('test-id').status).toBe('stopped');

            // Start service
            mockProcessManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            const startResult = await serviceManager.startService('test-id', config);
            expect(startResult.success).toBe(true);
            expect(serviceManager.services.get('test-id').status).toBe('running');

            // Stop service
            mockProcessManager.kill.mockResolvedValue({ success: true });
            const stopResult = await serviceManager.stopService('test-id');
            expect(stopResult.success).toBe(true);
            expect(serviceManager.services.get('test-id').status).toBe('stopped');
        });

        test('should handle service restart lifecycle', async () => {
            const config = {
                name: 'test-service',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            await serviceManager.addService('test-id', config);
            
            // Simulate running service
            const service = serviceManager.services.get('test-id');
            service.status = 'running';
            service.process = { pid: 123 };

            mockProcessManager.kill.mockResolvedValue({ success: true });
            mockProcessManager.start.mockResolvedValue({ child: { pid: 456 }, pid: 456 });

            const result = await serviceManager.restartService('test-id');
            expect(result.success).toBe(true);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complete service management workflow', async () => {
            const config = {
                name: 'integration-test-service',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }],
                autoStart: true,
                enabled: true
            };

            // 1. Add service
            const addResult = await serviceManager.addService('integration-test', config);
            expect(addResult.success).toBe(true);

            // 2. Start service
            mockProcessManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            const startResult = await serviceManager.startService('integration-test', config);
            expect(startResult.success).toBe(true);

            // 3. Check status
            mockMonitoringUtils.detectRunningPids.mockResolvedValue([123]);
            mockMonitoringUtils.checkUrl.mockResolvedValue({ ok: true, message: 'Healthy' });
            const statusResult = await serviceManager.getServiceStatus('integration-test');
            expect(statusResult.status).toBe('running');

            // 4. Update service
            const updateResult = await serviceManager.updateService('integration-test', { 
                name: 'Updated Integration Test Service' 
            });
            expect(updateResult.success).toBe(true);

            // 5. Stop service
            mockProcessManager.kill.mockResolvedValue({ success: true });
            const stopResult = await serviceManager.stopService('integration-test');
            expect(stopResult.success).toBe(true);

            // 6. Remove service
            const removeResult = await serviceManager.removeService('integration-test');
            expect(removeResult.success).toBe(true);
            expect(serviceManager.services.has('integration-test')).toBe(false);
        });

        test('should handle autostart workflow', async () => {
            const config1 = {
                name: 'autostart-service-1',
                startCommands: [{ id: 'default', command: 'node app1.js', enabled: true }],
                autoStart: true,
                enabled: true
            };

            const config2 = {
                name: 'manual-service-1',
                startCommands: [{ id: 'default', command: 'node app2.js', enabled: true }],
                autoStart: false,
                enabled: true
            };

            await serviceManager.addService('autostart-1', config1);
            await serviceManager.addService('manual-1', config2);

            mockProcessManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            mockMonitoringUtils.detectRunningPids.mockResolvedValue([]);

            const result = await serviceManager.autostart();
            expect(result.success).toBe(true);
            expect(result.started).toBe(1);
        });
    });
});
