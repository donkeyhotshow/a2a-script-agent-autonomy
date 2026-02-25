/**
 * Service Management - Simple Unit Tests
 * Простые тесты без внешних зависимостей для проверки базовой функциональности
 */

describe('Service Management - Basic Tests', () => {
    describe('ServiceLogger', () => {
        const { ServiceLogger } = require('../src/ServiceLogger');

        test('should create instance with logger', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            expect(serviceLogger).toBeDefined();
            expect(serviceLogger.logger).toBe(mockLogger);
        });

        test('should log service event', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceEvent('test-service', 'START', 'Starting service');
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] Starting service',
                {}
            );
        });

        test('should log service error with null error', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceError('test-service', 'Service failed', null);
            
            expect(mockLogger.error).toHaveBeenCalledWith(
                '[Service:test-service][ERROR] Service failed: Unknown error',
                { stack: undefined }
            );
        });

        test('should handle null data in logServiceEvent', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceEvent('test-service', 'START', 'Starting service', null);
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] Starting service',
                {}
            );
        });
    });

    describe('ServiceConfigManager', () => {
        const { ServiceConfigManager } = require('../src/ServiceConfigManager');

        test('should create instance with correct properties', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const mockEventEmitter = {
                emit: jest.fn()
            };
            const configManager = new ServiceConfigManager('/test/path', mockLogger, mockEventEmitter);
            
            expect(configManager).toBeDefined();
            expect(configManager.configPath).toBe('/test/path');
            expect(configManager.logger).toBe(mockLogger);
            expect(configManager.eventEmitter).toBe(mockEventEmitter);
            expect(configManager.config).toEqual({});
        });

        test('should handle null config in getters', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const mockEventEmitter = {
                emit: jest.fn()
            };
            const configManager = new ServiceConfigManager('/test/path', mockLogger, mockEventEmitter);
            
            configManager.config = null;
            
            expect(configManager.services).toEqual({});
            expect(configManager.groups).toEqual({});
            expect(configManager.settings).toEqual({});
            expect(configManager.gateway).toEqual({});
        });

        test('should handle undefined config in getters', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const mockEventEmitter = {
                emit: jest.fn()
            };
            const configManager = new ServiceConfigManager('/test/path', mockLogger, mockEventEmitter);
            
            configManager.config = undefined;
            
            expect(configManager.services).toEqual({});
            expect(configManager.groups).toEqual({});
            expect(configManager.settings).toEqual({});
            expect(configManager.gateway).toEqual({});
        });
    });

    describe('Service Status Utils', () => {
        const {
            DEFAULT_SERVICE_CONFIGS,
            getServicePortFromInfrastructure,
            checkNodeNpmAvailability,
            setGlobalLogger,
            getRealServiceStatus,
            getDuplicateProcesses,
            formatRealServiceReport
        } = require('../service-status-utils.js');

        test('should have DEFAULT_SERVICE_CONFIGS', () => {
            expect(DEFAULT_SERVICE_CONFIGS).toBeDefined();
            expect(Array.isArray(DEFAULT_SERVICE_CONFIGS)).toBe(true);
            expect(DEFAULT_SERVICE_CONFIGS.length).toBeGreaterThan(0);
        });

        test('should have required properties for each config', () => {
            DEFAULT_SERVICE_CONFIGS.forEach(config => {
                expect(config).toHaveProperty('Name');
                expect(config).toHaveProperty('DisplayName');
                expect(config).toHaveProperty('ProjectPath');
                expect(config).toHaveProperty('PackageJson');
                expect(config).toHaveProperty('MainFile');
                expect(config).toHaveProperty('ExpectedPort');
                expect(typeof config.ExpectedPort).toBe('number');
            });
        });

        test('should return default status structure', async () => {
            const serviceConfig = {
                Name: 'test-service',
                ProjectPath: '/test/path',
                MainFile: 'app.js'
            };

            const result = await getRealServiceStatus(serviceConfig);

            expect(result).toHaveProperty('IsRunning');
            expect(result).toHaveProperty('PID');
            expect(result).toHaveProperty('PortStatus');
            expect(result).toHaveProperty('NodeVersion');
            expect(result).toHaveProperty('PackageJsonExists');
            expect(result).toHaveProperty('MainFileExists');
            expect(result).toHaveProperty('NodeModulesExist');
            expect(result).toHaveProperty('Errors');
            expect(result).toHaveProperty('Warnings');
            expect(result).toHaveProperty('ProcessInfo');

            expect(Array.isArray(result.Errors)).toBe(true);
            expect(Array.isArray(result.Warnings)).toBe(true);
        });

        test('should return empty array for duplicate processes', () => {
            const serviceConfig = {
                Name: 'test-service',
                ProcessName: 'node',
                ScriptArguments: 'app.js'
            };

            const result = getDuplicateProcesses(serviceConfig);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });

        test('should format service report', () => {
            const reportData = [
                {
                    Name: 'test-service',
                    IsRunning: true,
                    PID: 1234,
                    PortStatus: 'listening',
                    Errors: [],
                    Warnings: []
                }
            ];

            const overallStatus = 'good';

            const result = formatRealServiceReport(reportData, overallStatus);

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: good');
        });

        test('should handle empty report data', () => {
            const result = formatRealServiceReport([], 'unknown');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: unknown');
        });

        test('should handle null report data', () => {
            const result = formatRealServiceReport(null, 'error');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: error');
        });

        test('should handle undefined report data', () => {
            const result = formatRealServiceReport(undefined, 'error');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: error');
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        const { ServiceLogger } = require('../src/ServiceLogger');

        test('should handle very long service IDs', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            const longId = 'a'.repeat(1000);
            serviceLogger.logServiceEvent(longId, 'START', 'Starting service');
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${longId}][START] Starting service`,
                {}
            );
        });

        test('should handle special characters in service ID', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            const specialId = 'test-service_123-abc.def@domain';
            serviceLogger.logServiceEvent(specialId, 'START', 'Starting service');
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${specialId}][START] Starting service`,
                {}
            );
        });

        test('should handle very long messages', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            const longMessage = 'a'.repeat(10000);
            serviceLogger.logServiceEvent('test-service', 'START', longMessage);
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:test-service][START] ${longMessage}`,
                {}
            );
        });

        test('should handle empty messages', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceEvent('test-service', 'START', '');
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] ',
                {}
            );
        });

        test('should handle null messages', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceEvent('test-service', 'START', null);
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] null',
                {}
            );
        });

        test('should handle undefined messages', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            serviceLogger.logServiceEvent('test-service', 'START', undefined);
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] undefined',
                {}
            );
        });
    });

    describe('Error Handling', () => {
        const { ServiceLogger } = require('../src/ServiceLogger');

        test('should handle logger methods that throw errors', () => {
            const errorLogger = {
                info: jest.fn().mockImplementation(() => {
                    throw new Error('Logger error');
                }),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };

            const serviceLogger = new ServiceLogger(errorLogger);

            expect(() => {
                serviceLogger.logServiceEvent('test-service', 'START', 'Starting service');
            }).toThrow('Logger error');
        });

        test('should handle complex data objects', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            const complexData = {
                pid: 123,
                config: { name: 'Test Service', port: 3000 },
                metadata: { version: '1.0.0', environment: 'test' },
                nested: { deep: { value: 'test' } }
            };

            serviceLogger.logServiceEvent('test-service', 'START', 'Starting service', complexData);

            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] Starting service',
                complexData
            );
        });

        test('should handle circular references in data', () => {
            const mockLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };
            const serviceLogger = new ServiceLogger(mockLogger);
            
            const data = { name: 'Test Service' };
            data.self = data; // Create circular reference

            serviceLogger.logServiceEvent('test-service', 'START', 'Starting service', data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                '[Service:test-service][START] Starting service',
                data
            );
        });
    });
});
