/**
 * ServiceConfigManager - Unit Tests
 * Тестирование менеджера конфигурации сервисов
 */

const { ServiceConfigManager } = require('../src/ServiceConfigManager');
const fs = require('fs').promises;
const fsSync = require('fs');

describe('ServiceConfigManager', () => {
    let configManager;
    let mockLogger;
    let mockEventEmitter;
    let testConfigPath;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        mockEventEmitter = {
            emit: jest.fn()
        };
        testConfigPath = '/test/config/services.json';
        configManager = new ServiceConfigManager(testConfigPath, mockLogger, mockEventEmitter);
    });

    describe('Constructor', () => {
        test('should create instance with correct properties', () => {
            expect(configManager).toBeDefined();
            expect(configManager.configPath).toBe(testConfigPath);
            expect(configManager.logger).toBe(mockLogger);
            expect(configManager.eventEmitter).toBe(mockEventEmitter);
            expect(configManager.config).toEqual({});
        });
    });

    describe('Synchronous Configuration Loading', () => {
        test('should load configuration synchronously', () => {
            const mockConfig = {
                services: { 'test-service': { name: 'Test Service' } },
                groups: { 'test-group': { name: 'Test Group' } }
            };

            // Mock fsSync.readFileSync
            jest.spyOn(fsSync, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

            configManager.loadConfigurationSync();

            expect(configManager.config).toEqual(mockConfig);
            expect(fsSync.readFileSync).toHaveBeenCalledWith(testConfigPath, 'utf8');
        });

        test('should handle file not found error in sync load', () => {
            // Mock fsSync.readFileSync to throw error
            jest.spyOn(fsSync, 'readFileSync').mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });

            configManager.loadConfigurationSync();

            expect(configManager.config).toEqual({ services: {}, groups: {} });
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        test('should handle JSON parsing error in sync load', () => {
            // Mock fsSync.readFileSync to return invalid JSON
            jest.spyOn(fsSync, 'readFileSync').mockReturnValue('invalid json');

            configManager.loadConfigurationSync();

            expect(configManager.config).toEqual({ services: {}, groups: {} });
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('Asynchronous Configuration Loading', () => {
        test('should load configuration asynchronously', async () => {
            const mockConfig = {
                services: { 'test-service': { name: 'Test Service' } },
                groups: { 'test-group': { name: 'Test Group' } }
            };

            // Mock fs.readFile
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await configManager.loadConfiguration();

            expect(configManager.config).toEqual(mockConfig);
            expect(fs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf8');
        });

        test('should handle file not found error in async load', async () => {
            // Mock fs.readFile to throw error
            jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT: no such file or directory'));

            await expect(configManager.loadConfiguration()).rejects.toThrow('Failed to load configuration');
        });

        test('should handle JSON parsing error in async load', async () => {
            // Mock fs.readFile to return invalid JSON
            jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');

            await expect(configManager.loadConfiguration()).rejects.toThrow('Failed to load configuration');
        });
    });

    describe('Configuration Saving', () => {
        test('should save configuration successfully', async () => {
            const mockConfig = {
                services: { 'test-service': { name: 'Test Service' } },
                groups: { 'test-group': { name: 'Test Group' } }
            };

            configManager.config = mockConfig;

            // Mock fs.writeFile
            jest.spyOn(fs, 'writeFile').mockResolvedValue();

            const result = await configManager.saveConfiguration();

            expect(result).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(
                testConfigPath,
                JSON.stringify(mockConfig, null, 2),
                'utf8'
            );
        });

        test('should handle save error', async () => {
            const mockConfig = { services: {}, groups: {} };
            configManager.config = mockConfig;

            // Mock fs.writeFile to throw error
            jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Permission denied'));

            await expect(configManager.saveConfiguration()).rejects.toThrow('Failed to save configuration');
        });
    });

    describe('Configuration Reloading', () => {
        test('should reload configuration and emit event', async () => {
            const mockConfig = {
                services: { 'test-service': { name: 'Test Service' } },
                groups: { 'test-group': { name: 'Test Group' } }
            };

            // Mock fs.readFile
            jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));

            await configManager.reloadConfiguration();

            expect(configManager.config).toEqual(mockConfig);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('config:reloaded', mockConfig);
        });
    });

    describe('Configuration Getters', () => {
        beforeEach(() => {
            configManager.config = {
                services: {
                    'service1': { name: 'Service 1' },
                    'service2': { name: 'Service 2' }
                },
                groups: {
                    'group1': { name: 'Group 1' },
                    'group2': { name: 'Group 2' }
                },
                settings: {
                    autoRestart: true,
                    maxRetries: 3
                },
                gateway: {
                    enabled: true,
                    port: 3012
                }
            };
        });

        test('should return raw config', () => {
            const rawConfig = configManager.rawConfig;
            expect(rawConfig).toEqual(configManager.config);
        });

        test('should return services config', () => {
            const services = configManager.services;
            expect(services).toEqual({
                'service1': { name: 'Service 1' },
                'service2': { name: 'Service 2' }
            });
        });

        test('should return groups config', () => {
            const groups = configManager.groups;
            expect(groups).toEqual({
                'group1': { name: 'Group 1' },
                'group2': { name: 'Group 2' }
            });
        });

        test('should return settings config', () => {
            const settings = configManager.settings;
            expect(settings).toEqual({
                autoRestart: true,
                maxRetries: 3
            });
        });

        test('should return gateway config', () => {
            const gateway = configManager.gateway;
            expect(gateway).toEqual({
                enabled: true,
                port: 3012
            });
        });

        test('should return empty objects for missing config sections', () => {
            configManager.config = {};

            expect(configManager.services).toEqual({});
            expect(configManager.groups).toEqual({});
            expect(configManager.settings).toEqual({});
            expect(configManager.gateway).toEqual({});
        });
    });

    describe('Edge Cases', () => {
        test('should handle null config', () => {
            configManager.config = null;

            expect(configManager.services).toEqual({});
            expect(configManager.groups).toEqual({});
            expect(configManager.settings).toEqual({});
            expect(configManager.gateway).toEqual({});
        });

        test('should handle undefined config', () => {
            configManager.config = undefined;

            expect(configManager.services).toEqual({});
            expect(configManager.groups).toEqual({});
            expect(configManager.settings).toEqual({});
            expect(configManager.gateway).toEqual({});
        });

        test('should handle empty string config path', () => {
            const emptyPathManager = new ServiceConfigManager('', mockLogger, mockEventEmitter);
            expect(emptyPathManager.configPath).toBe('');
        });

        test('should handle null config path', () => {
            const nullPathManager = new ServiceConfigManager(null, mockLogger, mockEventEmitter);
            expect(nullPathManager.configPath).toBeNull();
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complete configuration lifecycle', async () => {
            const initialConfig = {
                services: { 'service1': { name: 'Service 1' } },
                groups: { 'group1': { name: 'Group 1' } }
            };

            const updatedConfig = {
                services: { 
                    'service1': { name: 'Service 1 Updated' },
                    'service2': { name: 'Service 2' }
                },
                groups: { 
                    'group1': { name: 'Group 1 Updated' },
                    'group2': { name: 'Group 2' }
                }
            };

            // Mock fs operations
            jest.spyOn(fs, 'readFile')
                .mockResolvedValueOnce(JSON.stringify(initialConfig))
                .mockResolvedValueOnce(JSON.stringify(updatedConfig));
            jest.spyOn(fs, 'writeFile').mockResolvedValue();

            // 1. Load initial configuration
            await configManager.loadConfiguration();
            expect(configManager.services).toEqual(initialConfig.services);

            // 2. Update configuration
            configManager.config = updatedConfig;

            // 3. Save configuration
            await configManager.saveConfiguration();
            expect(fs.writeFile).toHaveBeenCalled();

            // 4. Reload configuration
            await configManager.reloadConfiguration();
            expect(configManager.services).toEqual(updatedConfig.services);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('config:reloaded', updatedConfig);
        });
    });
});
