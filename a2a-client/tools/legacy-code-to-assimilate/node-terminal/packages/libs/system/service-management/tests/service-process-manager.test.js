/**
 * ServiceProcessManager - Unit Tests
 * Тестирование менеджера процессов сервисов
 */

const { ServiceProcessManager } = require('../src/ServiceProcessManager');

jest.mock('child_process', () => {
    const originalModule = jest.requireActual('child_process');
    const mockChildProcess = {
        pid: 9999,
        unref: jest.fn(),
        on: jest.fn().mockReturnThis(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn()
    };
    return {
        __esModule: true,
        ...originalModule,
        spawn: jest.fn(() => mockChildProcess),
        execSync: jest.fn(),
        exec: jest.fn((command, options, callback) => {
            // Simplified mock for exec
            if (callback) callback(null, 'mock stdout', 'mock stderr');
        })
    };
});

const mockProcessKill = jest.fn();
Object.defineProperty(process, 'kill', {
    value: mockProcessKill,
    configurable: true,
});

describe('ServiceProcessManager', () => {
    let processManager;
    let mockLogger;
    let mockChildProcess;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        processManager = new ServiceProcessManager(mockLogger);

        mockChildProcess = require('child_process').spawn.mock.results[0].value;
        mockProcessKill.mockClear();

        // Mock FileSystemUtils.exists
        processManager.fileSystem.exists = jest.fn().mockResolvedValue(true);
    });

    describe('Constructor', () => {
        test('should create instance with logger', () => {
            expect(processManager).toBeDefined();
            expect(processManager.logger).toBe(mockLogger);
            expect(processManager.runningServices).toBeDefined();
            expect(processManager.runningServices instanceof Map).toBe(true);
        });
    });

    describe('Service Process Management', () => {
        test('should start service process successfully', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = {
                command: 'node',
                args: ['app.js'],
                cwd: '/test/dir',
                env: { NODE_ENV: 'test' }
            };

            const result = await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            expect(result.success).toBe(true);
            expect(result.pid).toBeDefined();
            expect(result.status).toBe('running');
            expect(processManager.runningServices.has(serviceId)).toBe(true);
        });

        test('should handle service already running', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            // Start service first time
            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Try to start again
            const result = await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Service already running.');
        });

        test('should handle working directory not existing', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/nonexistent/dir' };

            // Mock file system exists check to return false
            processManager.fileSystem.exists = jest.fn().mockResolvedValue(false);

            const result = await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Working directory does not exist');
        });

        test('should stop service process successfully', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            // Start service first
            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Stop service
            const result = await processManager.stopServiceProcess(serviceId);

            expect(result.success).toBe(true);
            expect(result.message).toBe(`Service ${serviceId} stopped.`);
            expect(processManager.runningServices.has(serviceId)).toBe(false);
        });

        test('should handle stopping non-running service', async () => {
            const serviceId = 'non-running-service';

            const result = await processManager.stopServiceProcess(serviceId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Service not running.');
        });

        test('should restart service process', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            // Start service first
            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Restart service
            const result = await processManager.restartServiceProcess(serviceId, serviceConfig, commandConfig);

            expect(result.success).toBe(true);
            expect(result.pid).toBeDefined();
        });
    });

    describe('Service Status Management', () => {
        test('should return stopped status for non-running service', () => {
            const serviceId = 'non-running-service';
            const status = processManager.getServiceProcessStatus(serviceId);
            expect(status).toBe('stopped');
        });

        test('should return running status for running service', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);
            const status = processManager.getServiceProcessStatus(serviceId);

            expect(status).toBe('running');
        });

        test('should handle process not found error', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Mock process.kill to throw ESRCH error
            mockProcessKill.mockImplementation(() => {
                const error = new Error('No such process');
                error.code = 'ESRCH';
                throw error;
            });

            const status = processManager.getServiceProcessStatus(serviceId);

            expect(status).toBe('stopped');
            expect(processManager.runningServices.has(serviceId)).toBe(false);

            // Restore original process.kill
            process.kill = originalKill;
        });
    });

    describe('Error Handling', () => {
        test('should handle process start errors', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'nonexistent-command', args: [], cwd: '/test/dir' };

            const result = await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle process stop errors', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Mock process.kill to throw error
            mockProcessKill.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = await processManager.stopServiceProcess(serviceId);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Restore original process.kill
            process.kill = originalKill;
        });
    });

    describe('Platform-specific Behavior', () => {
        test('should handle Windows process killing', async () => {
            const serviceId = 'test-service';
            const serviceConfig = { name: 'Test Service' };
            const commandConfig = { command: 'node', args: ['app.js'], cwd: '/test/dir' };

            await processManager.startServiceProcess(serviceId, serviceConfig, commandConfig);

            // Mock platform to be Windows
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            });

            // Mock spawn for Windows taskkill
            const mockSpawnForWindows = jest.fn(() => mockChildProcess);
            require('child_process').spawn.mockImplementation(mockSpawnForWindows);

            // Mock successful taskkill
            mockChildProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 0);
                }
                return mockChildProcess;
            });

            const result = await processManager.stopServiceProcess(serviceId);

            expect(result.success).toBe(true);

            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                configurable: true
            });

            jest.restoreAllMocks();
        });
    });
});
