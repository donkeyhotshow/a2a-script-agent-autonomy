/**
 * ServiceManagementCLI - Unit Tests
 * Тестирование CLI интерфейса для управления сервисами
 */

const { ServiceManagementCLI } = require('../cli.js');
const fs = require('fs').promises;

// Mock ServiceManagementUtils
jest.mock('../index.js', () => ({
    ServiceManagementUtils: jest.fn().mockImplementation(() => ({
        startService: jest.fn(),
        stopService: jest.fn(),
        restartService: jest.fn(),
        getServiceStatus: jest.fn(),
        autostart: jest.fn()
    }))
}));

describe('ServiceManagementCLI', () => {
    let cli;
    let mockServiceManager;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock console methods
        global.console = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        };

        cli = new ServiceManagementCLI();
        mockServiceManager = cli.serviceManager;
    });

    describe('Constructor', () => {
        test('should create instance with correct properties', () => {
            expect(cli).toBeDefined();
            expect(cli.configPath).toBeDefined();
            expect(cli.serviceManager).toBeDefined();
        });

        test('should set correct config path', () => {
            expect(cli.configPath).toContain('config');
            expect(cli.configPath).toContain('services.json');
        });
    });

    describe('Configuration Loading', () => {
        test('should load configuration successfully', async () => {
            const mockConfig = {
                services: {
                    'test-service': { name: 'Test Service', enabled: true }
                },
                groups: {
                    'test-group': { name: 'Test Group', enabled: true }
                }
            };

            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            const result = await cli.loadConfig();

            expect(result).toEqual(mockConfig);
            expect(fs.readFile).toHaveBeenCalledWith(cli.configPath, 'utf8');
        });

        test('should handle configuration loading errors', async () => {
            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

            const result = await cli.loadConfig();

            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith('[ERROR] Failed to load config: File not found');
        });

        test('should handle JSON parsing errors', async () => {
            jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');

            const result = await cli.loadConfig();

            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Service Listing', () => {
        test('should list services correctly', async () => {
            const mockConfig = {
                services: {
                    'service1': {
                        name: 'Service 1',
                        enabled: true,
                        status: 'running',
                        group: 'development',
                        autostart: true,
                        type: 'web',
                        startCommands: [{ port: 3000 }]
                    },
                    'service2': {
                        name: 'Service 2',
                        enabled: false,
                        status: 'stopped',
                        group: 'production',
                        autostart: false,
                        type: 'api'
                    }
                },
                groups: {
                    'development': {
                        name: 'Development',
                        autoStart: true,
                        enabled: true,
                        services: ['service1']
                    },
                    'production': {
                        name: 'Production',
                        autoStart: false,
                        enabled: true,
                        services: ['service2']
                    }
                }
            };

            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.listServices();

            expect(console.log).toHaveBeenCalledWith('\n📋 Available Services:\n');
            expect(console.log).toHaveBeenCalledWith('✅ service1 (Service 1)');
            expect(console.log).toHaveBeenCalledWith('❌ service2 (Service 2)');
            expect(console.log).toHaveBeenCalledWith('\n📊 Groups:\n');
        });

        test('should handle empty configuration', async () => {
            const mockConfig = { services: {}, groups: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.listServices();

            expect(console.log).toHaveBeenCalledWith('\n📋 Available Services:\n');
            expect(console.log).toHaveBeenCalledWith('\n📊 Groups:\n');
        });
    });

    describe('Service Operations', () => {
        beforeEach(() => {
            const mockConfig = {
                services: {
                    'test-service': { name: 'Test Service', enabled: true }
                }
            };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));
        });

        test('should start service successfully', async () => {
            mockServiceManager.startService.mockResolvedValue({ success: true });

            await cli.startService('test-service');

            expect(console.log).toHaveBeenCalledWith('[INFO] Starting service: test-service');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Service \'test-service\' started successfully');
            expect(mockServiceManager.startService).toHaveBeenCalledWith('test-service', { name: 'Test Service', enabled: true });
        });

        test('should handle service start failure', async () => {
            mockServiceManager.startService.mockResolvedValue({ success: false, error: 'Start failed' });

            await cli.startService('test-service');

            expect(console.error).toHaveBeenCalledWith('[ERROR] Failed to start service \'test-service\': Start failed');
        });

        test('should handle service start exception', async () => {
            mockServiceManager.startService.mockRejectedValue(new Error('Exception occurred'));

            await cli.startService('test-service');

            expect(console.error).toHaveBeenCalledWith('[ERROR] Error starting service \'test-service\': Exception occurred');
        });

        test('should handle non-existent service', async () => {
            await cli.startService('non-existent-service');

            expect(console.error).toHaveBeenCalledWith('[ERROR] Service \'non-existent-service\' not found');
        });

        test('should stop service successfully', async () => {
            mockServiceManager.stopService.mockResolvedValue({ success: true });

            await cli.stopService('test-service');

            expect(console.log).toHaveBeenCalledWith('[INFO] Stopping service: test-service');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Service \'test-service\' stopped successfully');
            expect(mockServiceManager.stopService).toHaveBeenCalledWith('test-service');
        });

        test('should restart service successfully', async () => {
            mockServiceManager.restartService.mockResolvedValue({ success: true });

            await cli.restartService('test-service');

            expect(console.log).toHaveBeenCalledWith('[INFO] Restarting service: test-service');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Service \'test-service\' restarted successfully');
            expect(mockServiceManager.restartService).toHaveBeenCalledWith('test-service');
        });
    });

    describe('Service Status', () => {
        beforeEach(() => {
            const mockConfig = {
                services: {
                    'test-service': { name: 'Test Service', enabled: true }
                }
            };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));
        });

        test('should show service status correctly', async () => {
            const mockStatus = {
                status: 'running',
                processRunning: true,
                isListening: true,
                pid: 1234,
                startTime: Date.now(),
                uptime: 60000,
                health: { ok: true, message: 'Healthy' }
            };

            mockServiceManager.getServiceStatus.mockResolvedValue(mockStatus);

            await cli.getServiceStatus('test-service');

            expect(console.log).toHaveBeenCalledWith('\n📊 Status for service: test-service\n');
            expect(console.log).toHaveBeenCalledWith('Status: running');
            expect(console.log).toHaveBeenCalledWith('Process Running: Yes');
            expect(console.log).toHaveBeenCalledWith('Port Listening: Yes');
            expect(console.log).toHaveBeenCalledWith('PID: 1234');
        });

        test('should show all services status', async () => {
            const mockConfig = {
                services: {
                    'service1': { name: 'Service 1' },
                    'service2': { name: 'Service 2' }
                }
            };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            const mockStatus1 = { status: 'running', pid: 1234, isListening: true };
            const mockStatus2 = { status: 'stopped', pid: null, isListening: false };

            mockServiceManager.getServiceStatus
                .mockResolvedValueOnce(mockStatus1)
                .mockResolvedValueOnce(mockStatus2);

            await cli.getAllStatuses();

            expect(console.log).toHaveBeenCalledWith('\n📊 All Services Status:\n');
            expect(console.log).toHaveBeenCalledWith('🟢 service1: running');
            expect(console.log).toHaveBeenCalledWith('🔴 service2: stopped');
        });

        test('should handle status check errors', async () => {
            mockServiceManager.getServiceStatus.mockRejectedValue(new Error('Status check failed'));

            await cli.getServiceStatus('test-service');

            expect(console.error).toHaveBeenCalledWith('[ERROR] Error getting status for service \'test-service\': Status check failed');
        });
    });

    describe('Autostart', () => {
        test('should start autostart successfully', async () => {
            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.autostart.mockResolvedValue({ success: true, started: 3 });

            await cli.autostart();

            expect(console.log).toHaveBeenCalledWith('[INFO] Starting autostart process');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Autostart completed. Started 3 services.');
            expect(mockServiceManager.autostart).toHaveBeenCalledWith();
        });

        test('should start autostart for specific group', async () => {
            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.autostart.mockResolvedValue({ success: true, started: 2 });

            await cli.autostart('development');

            expect(console.log).toHaveBeenCalledWith('[INFO] Starting autostart process for group: development');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Autostart completed. Started 2 services.');
            expect(mockServiceManager.autostart).toHaveBeenCalledWith('development');
        });

        test('should handle autostart failure', async () => {
            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.autostart.mockResolvedValue({ success: false, error: 'Autostart failed' });

            await cli.autostart();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Autostart failed: Autostart failed');
        });
    });

    describe('Configuration Management', () => {
        test('should show configuration', async () => {
            const mockConfig = { services: { 'test': { name: 'Test' } } };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.showConfig();

            expect(console.log).toHaveBeenCalledWith('\n⚙️  Configuration:\n');
            expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
        });

        test('should handle config read errors', async () => {
            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Config read failed'));

            await cli.showConfig();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Failed to read config: Config read failed');
        });

        test('should show edit config message', async () => {
            await cli.editConfig();

            expect(console.log).toHaveBeenCalledWith(`[INFO] Opening config file: ${cli.configPath}`);
            expect(console.log).toHaveBeenCalledWith('[INFO] Please edit the file manually and save it.');
            expect(console.log).toHaveBeenCalledWith('[INFO] The changes will take effect after restarting the service manager.');
        });
    });

    describe('Help and Command Processing', () => {
        test('should show help message', () => {
            cli.showHelp();

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔧 Service Management CLI'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: node cli.js [command] [options]'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('list'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('start'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('stop'));
        });

        test('should handle unknown command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'unknown-command'];

            await cli.run();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Unknown command: unknown-command');
            expect(console.log).toHaveBeenCalled(); // Help should be shown

            process.argv = originalArgv;
        });

        test('should handle missing service ID for start command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'start'];

            await cli.run();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Service ID required for start command');

            process.argv = originalArgv;
        });

        test('should handle missing service ID for stop command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'stop'];

            await cli.run();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Service ID required for stop command');

            process.argv = originalArgv;
        });

        test('should handle missing service ID for restart command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'restart'];

            await cli.run();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Service ID required for restart command');

            process.argv = originalArgv;
        });
    });

    describe('Command Execution', () => {
        test('should execute list command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'list'];

            const mockConfig = { services: {}, groups: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('\n📋 Available Services:\n');

            process.argv = originalArgv;
        });

        test('should execute status command without service ID', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'status'];

            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('\n📊 All Services Status:\n');

            process.argv = originalArgv;
        });

        test('should execute status command with service ID', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'status', 'test-service'];

            const mockConfig = { services: { 'test-service': { name: 'Test Service' } } };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.getServiceStatus.mockResolvedValue({ status: 'running' });

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('\n📊 Status for service: test-service\n');

            process.argv = originalArgv;
        });

        test('should execute config command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'config'];

            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('\n⚙️  Configuration:\n');

            process.argv = originalArgv;
        });

        test('should execute edit command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'edit'];

            await cli.run();

            expect(console.log).toHaveBeenCalledWith(`[INFO] Opening config file: ${cli.configPath}`);

            process.argv = originalArgv;
        });

        test('should execute autostart command', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'autostart'];

            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.autostart.mockResolvedValue({ success: true, started: 0 });

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('[INFO] Starting autostart process');

            process.argv = originalArgv;
        });

        test('should execute autostart command with group', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'autostart', 'development'];

            const mockConfig = { services: {} };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            mockServiceManager.autostart.mockResolvedValue({ success: true, started: 0 });

            await cli.run();

            expect(console.log).toHaveBeenCalledWith('[INFO] Starting autostart process for group: development');

            process.argv = originalArgv;
        });
    });

    describe('Error Handling', () => {
        test('should handle command execution errors', async () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'cli.js', 'list'];

            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File system error'));

            await cli.run();

            expect(console.error).toHaveBeenCalledWith('[ERROR] Command execution failed: File system error');

            process.argv = originalArgv;
        });
    });
});
