/**
 * Service Management Integration Tests
 * Интеграционные тесты для проверки взаимодействия компонентов
 */

const { ServiceManagementUtils } = require('../index.js');
const { ServiceManagementCLI } = require('../cli.js');
const { ServiceManagementIntegration } = require('../integration.js');

describe('Service Management Integration Tests', () => {
    let serviceManager;
    let cli;
    let integration;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock dependencies for integration tests
        const mockDependencies = {
            logger: {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            },
            errorHandler: {
                logError: jest.fn(),
                maxRetries: 3,
                handleStartupFailure: jest.fn().mockResolvedValue(true)
            },
            configManager: {
                startWatchingConfig: jest.fn(),
                stopWatchingConfig: jest.fn(),
                loadServicesConfig: jest.fn()
            },
            processManager: {
                start: jest.fn(),
                kill: jest.fn(),
                checkProcessRunning: jest.fn(),
                getServicePort: jest.fn(),
                extractCandidatePorts: jest.fn()
            },
            monitoringUtils: {
                detectRunningPids: jest.fn(),
                checkPortListening: jest.fn(),
                checkUrl: jest.fn()
            },
            fileSystemUtils: {
                fileExists: jest.fn(),
                readFile: jest.fn(),
                writeFile: jest.fn(),
                exists: jest.fn(),
                join: jest.fn()
            },
            sharedUtils: {
                someMethod: jest.fn()
            },
            projectRoot: '/test/project',
            configDir: '/test/config'
        };

        serviceManager = new ServiceManagementUtils(mockDependencies);
        cli = new ServiceManagementCLI();
        integration = new ServiceManagementIntegration(mockDependencies);
    });

    afterEach(() => {
        jest.useRealTimers();
        if (serviceManager) {
            serviceManager.stop();
        }
    });

    describe('Service Lifecycle Integration', () => {
        test('should handle complete service lifecycle', async () => {
            const config = {
                name: 'integration-test-service',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }],
                autoStart: true,
                enabled: true
            };

            // Mock successful operations
            serviceManager.processManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            serviceManager.processManager.kill.mockResolvedValue({ success: true });
            serviceManager.monitoringUtils.detectRunningPids.mockResolvedValue([]);

            // 1. Add service
            const addResult = await serviceManager.addService('integration-test', config);
            expect(addResult.success).toBe(true);

            // 2. Start service
            const startResult = await serviceManager.startService('integration-test', config);
            expect(startResult.success).toBe(true);

            // 3. Check status
            serviceManager.monitoringUtils.detectRunningPids.mockResolvedValue([123]);
            serviceManager.monitoringUtils.checkUrl.mockResolvedValue({ ok: true, message: 'Healthy' });
            const statusResult = await serviceManager.getServiceStatus('integration-test');
            expect(statusResult.status).toBe('running');

            // 4. Update service
            const updateResult = await serviceManager.updateService('integration-test', { 
                name: 'Updated Integration Test Service' 
            });
            expect(updateResult.success).toBe(true);

            // 5. Stop service
            const stopResult = await serviceManager.stopService('integration-test');
            expect(stopResult.success).toBe(true);

            // 6. Remove service
            const removeResult = await serviceManager.removeService('integration-test');
            expect(removeResult.success).toBe(true);
        });

        test('should handle service restart workflow', async () => {
            const config = {
                name: 'restart-test-service',
                startCommands: [{ id: 'default', command: 'node app.js', enabled: true }]
            };

            // Mock operations
            serviceManager.processManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            serviceManager.processManager.kill.mockResolvedValue({ success: true });
            serviceManager.monitoringUtils.detectRunningPids.mockResolvedValue([]);

            await serviceManager.addService('restart-test', config);
            await serviceManager.startService('restart-test', config);

            // Simulate running service
            const service = serviceManager.services.get('restart-test');
            service.status = 'running';
            service.process = { pid: 123 };

            const restartResult = await serviceManager.restartService('restart-test');
            expect(restartResult.success).toBe(true);
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

            serviceManager.processManager.start.mockResolvedValue({ child: { pid: 123 }, pid: 123 });
            serviceManager.monitoringUtils.detectRunningPids.mockResolvedValue([]);

            const result = await serviceManager.autostart();
            expect(result.success).toBe(true);
            expect(result.started).toBe(1);
        });
    });

    describe('Configuration Management Integration', () => {
        test('should handle configuration changes', async () => {
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

        test('should handle configuration removal', async () => {
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

    describe('Error Handling Integration', () => {
        test('should handle service start failures gracefully', async () => {
            const config = {
                name: 'failing-service',
                startCommands: [{ id: 'default', command: 'nonexistent-command', enabled: true }]
            };

            serviceManager.processManager.start.mockRejectedValue(new Error('Command not found'));

            const result = await serviceManager.startService('failing-service', config);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle service stop failures gracefully', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            await serviceManager.addService('test-service', config);

            const service = serviceManager.services.get('test-service');
            service.process = { pid: 123 };

            serviceManager.processManager.kill.mockRejectedValue(new Error('Permission denied'));

            const result = await serviceManager.stopService('test-service');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle configuration loading errors', async () => {
            const result = await serviceManager.loadServicesFromConfig(null);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid config data');
        });
    });

    describe('Performance Integration', () => {
        test('should handle large number of services', async () => {
            const services = {};
            for (let i = 0; i < 100; i++) {
                services[`service-${i}`] = {
                    name: `Service ${i}`,
                    command: 'node app.js',
                    enabled: true
                };
            }

            const result = await serviceManager.loadServicesFromConfig({ services });
            expect(result.success).toBe(true);
            expect(result.count).toBe(100);
            expect(serviceManager.services.size).toBe(100);
        });

        test('should handle rapid service operations', async () => {
            const config = { name: 'test-service', command: 'node app.js' };
            
            await serviceManager.addService('test-id', config);
            
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
    });

    describe('CLI Integration', () => {
        test('should handle CLI operations', async () => {
            // Mock console methods
            global.console = {
                log: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            };

            // Mock fs operations
            const fs = require('fs').promises;
            const mockConfig = {
                services: {
                    'test-service': { name: 'Test Service', enabled: true }
                }
            };
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            // Mock service manager operations
            cli.serviceManager.startService.mockResolvedValue({ success: true });
            cli.serviceManager.stopService.mockResolvedValue({ success: true });
            cli.serviceManager.getServiceStatus.mockResolvedValue({ status: 'running' });

            // Test CLI operations
            await cli.listServices();
            expect(console.log).toHaveBeenCalledWith('\n📋 Available Services:\n');

            await cli.startService('test-service');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Service \'test-service\' started successfully');

            await cli.stopService('test-service');
            expect(console.log).toHaveBeenCalledWith('[SUCCESS] Service \'test-service\' stopped successfully');

            await cli.getServiceStatus('test-service');
            expect(console.log).toHaveBeenCalledWith('\n📊 Status for service: test-service\n');
        });
    });

    describe('Integration Layer Tests', () => {
        test('should handle integration layer operations', async () => {
            // Mock integration dependencies
            const mockConfig = {
                services: {
                    'integration-service': { name: 'Integration Service', enabled: true }
                }
            };

            integration.serviceConfigManager.config = mockConfig;
            integration.serviceConfigManager.loadConfiguration = jest.fn().mockResolvedValue();
            integration.serviceConfigManager.reloadConfiguration = jest.fn().mockResolvedValue();

            // Test configuration operations
            await integration.loadConfiguration();
            expect(integration.serviceConfigManager.loadConfiguration).toHaveBeenCalled();

            await integration.reloadConfiguration();
            expect(integration.serviceConfigManager.reloadConfiguration).toHaveBeenCalled();

            // Test data operations
            integration.serviceDataManager.getServicesData = jest.fn().mockResolvedValue(mockConfig);
            const servicesData = await integration.getServicesData('json');
            expect(servicesData).toEqual(mockConfig);

            // Test form operations
            integration.serviceFormGenerator.getServiceForm = jest.fn().mockReturnValue('<form>Test Form</form>');
            const form = integration.getServiceForm('create', 'test-service');
            expect(form).toBe('<form>Test Form</form>');

            // Test validation
            integration.serviceValidator.validateServiceData = jest.fn().mockReturnValue({ valid: true });
            const validation = integration.validateServiceData({ name: 'Test Service' });
            expect(validation.valid).toBe(true);
        });
    });

    describe('Edge Cases Integration', () => {
        test('should handle edge cases in service management', async () => {
            // Test with empty configuration
            const emptyResult = await serviceManager.loadServicesFromConfig({ services: {} });
            expect(emptyResult.success).toBe(true);
            expect(emptyResult.count).toBe(0);

            // Test with null configuration
            const nullResult = await serviceManager.loadServicesFromConfig(null);
            expect(nullResult.success).toBe(false);

            // Test with undefined configuration
            const undefinedResult = await serviceManager.loadServicesFromConfig(undefined);
            expect(undefinedResult.success).toBe(false);

            // Test service with no startCommands
            const noCommandsResult = await serviceManager.startService('test-id', { name: 'test-service' });
            expect(noCommandsResult.success).toBe(false);
            expect(noCommandsResult.error).toBe('No start modes configured');

            // Test service with empty startCommands
            const emptyCommandsResult = await serviceManager.startService('test-id', { 
                name: 'test-service', 
                startCommands: [] 
            });
            expect(emptyCommandsResult.success).toBe(false);
            expect(emptyCommandsResult.error).toBe('No start modes configured');
        });

        test('should handle special characters and edge cases', async () => {
            const specialId = 'test-service_123-abc.def@domain';
            const longName = 'a'.repeat(1000);
            const config = { name: longName, command: 'node app.js' };

            const result = await serviceManager.addService(specialId, config);
            expect(result.success).toBe(true);
            expect(serviceManager.services.has(specialId)).toBe(true);
            expect(serviceManager.services.get(specialId).config.name).toBe(longName);
        });
    });

    describe('Resource Cleanup Integration', () => {
        test('should clean up resources properly', () => {
            serviceManager._startStatusCheckCycle();
            serviceManager._startRestartCycle();
            
            expect(serviceManager.statusCheckTimer).toBeDefined();
            expect(serviceManager.restartCycleTimer).toBeDefined();
            
            serviceManager.stop();
            
            expect(serviceManager.statusCheckTimer).toBeNull();
            expect(serviceManager.restartCycleTimer).toBeNull();
        });

        test('should handle multiple stop calls gracefully', () => {
            serviceManager.stop();
            serviceManager.stop(); // Should not throw error
            
            expect(serviceManager.statusCheckTimer).toBeNull();
            expect(serviceManager.restartCycleTimer).toBeNull();
        });
    });
});
