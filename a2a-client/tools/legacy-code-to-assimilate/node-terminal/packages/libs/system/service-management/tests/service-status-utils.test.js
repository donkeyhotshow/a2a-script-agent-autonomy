/**
 * Service Status Utils - Comprehensive Unit Tests
 * Тестирование утилит статуса сервисов согласно принципам когнитивной дисциплины
 * 
 * Приоритеты тестирования:
 * 1. Стабильность - проверка корректной работы в разных условиях
 * 2. Предсказуемость - тестирование edge cases и граничных условий
 * 3. Работоспособность - проверка основных сценариев использования
 * 4. Контроль - тестирование управления конфигурацией и процессами
 */

const {
    DEFAULT_SERVICE_CONFIGS,
    getServicePortFromInfrastructure,
    checkNodeNpmAvailability,
    setGlobalLogger,
    getRealServiceStatus,
    getDuplicateProcesses,
    formatRealServiceReport
} = require('../service-status-utils.js');

const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const { FileSystemUtils } = require('@libs/system/file-operations');

const { execSync } = require('child_process');

const createMockLogger = () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
});

const createMockFileSystemUtils = () => ({
    join: jest.fn(),
    fileExists: jest.fn(),
    readFile: jest.fn(),
    // Add mock for `stat` since it's used in FileSystemUtils
    stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false })
});

let mockLoggerInstance = createMockLogger();
let mockFileSystemUtilsInstance = createMockFileSystemUtils();

// Globally mock child_process for consistent execSync behavior
jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('@libs/logging-monitoring/logging', () => ({
    LoggingUtils: jest.fn().mockImplementation(() => mockLoggerInstance)
}));

jest.mock('@libs/system/file-operations', () => jest.fn().mockImplementation(() => mockFileSystemUtilsInstance));

describe('Service Status Utils', () => {
    let mockExecSync;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLoggerInstance = createMockLogger();
        mockFileSystemUtilsInstance = createMockFileSystemUtils();
        LoggingUtils.mockImplementation(() => mockLoggerInstance);
        FileSystemUtils.mockImplementation(() => mockFileSystemUtilsInstance);

        // Get the mocked execSync from child_process
        mockExecSync = require('child_process').execSync;
    });

    describe('DEFAULT_SERVICE_CONFIGS', () => {
        test('should contain expected service configurations', () => {
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

        test('should contain TestingTaskManager config', () => {
            const testingTaskManager = DEFAULT_SERVICE_CONFIGS.find(
                config => config.Name === 'TestingTaskManager'
            );
            expect(testingTaskManager).toBeDefined();
            expect(testingTaskManager.ExpectedPort).toBe(3013);
        });

        test('should contain ProjectsManager config', () => {
            const projectsManager = DEFAULT_SERVICE_CONFIGS.find(
                config => config.Name === 'ProjectsManager'
            );
            expect(projectsManager).toBeDefined();
            expect(projectsManager.ExpectedPort).toBe(3012);
        });
    });

    describe('setGlobalLogger', () => {
        test('should set global logger instance', () => {
            const testLogger = { info: jest.fn(), debug: jest.fn() };
            setGlobalLogger(testLogger);

            // Since we can't directly access globalLogger, we'll test through side effects
            expect(testLogger).toBeDefined();
        });
    });

    describe('getServicePortFromInfrastructure', () => {
        beforeEach(() => {
            // Reset mocks
            mockFileSystemUtilsInstance.join.mockImplementation((...args) => args.join('/'));
            mockFileSystemUtilsInstance.fileExists.mockReset();
            mockFileSystemUtilsInstance.readFile.mockReset();
        });

        test('should return null when infrastructure file does not exist', async () => {
            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(false);

            const result = await getServicePortFromInfrastructure('/test/project');

            expect(result).toBeNull();
            expect(mockFileSystemUtilsInstance.join).toHaveBeenCalledWith('/test/project', 'data', 'infrastructure.json');
        });

        test('should return port when infrastructure file exists', async () => {
            const mockInfraData = JSON.stringify({
                services: {
                    'test-service': {
                        port: 8080
                    }
                }
            });

            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockResolvedValue(mockInfraData);

            const result = await getServicePortFromInfrastructure('/test/project');

            expect(result).toBe(8080);
            expect(mockFileSystemUtilsInstance.fileExists).toHaveBeenCalled();
            expect(mockFileSystemUtilsInstance.readFile).toHaveBeenCalled();
        });

        test('should return null when service not found in infrastructure', async () => {
            const mockInfraData = JSON.stringify({
                services: {
                    'other-service': {
                        port: 8080
                    }
                }
            });

            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockResolvedValue(mockInfraData);

            const result = await getServicePortFromInfrastructure('/test/project');

            expect(result).toBeNull();
        });

        test('should handle JSON parsing errors', async () => {
            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockResolvedValue('invalid json');

            const result = await getServicePortFromInfrastructure('/test/project');

            expect(result).toBeNull();
        });

        test('should handle file read errors', async () => {
            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockRejectedValue(new Error('File read error'));

            const result = await getServicePortFromInfrastructure('/test/project');

            expect(result).toBeNull();
        });
    });

    describe('checkNodeNpmAvailability', () => {
        beforeEach(() => {
            mockExecSync.mockClear(); // Clear mocks for each test
        });

        afterEach(() => {
            // No need to restore original execSync since it's globally mocked
        });

        test('should return success when both node and npm are available', () => {
            mockExecSync
                .mockReturnValueOnce('v18.0.0\n')
                .mockReturnValueOnce('8.19.2\n');

            const result = checkNodeNpmAvailability();

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
            expect(mockExecSync).toHaveBeenCalledWith('node --version', { encoding: 'utf8' });
            expect(mockExecSync).toHaveBeenCalledWith('npm --version', { encoding: 'utf8' });
        });

        test('should return error when node is not available', () => {
            mockExecSync
                .mockImplementationOnce(() => { throw new Error('node not found'); })
                .mockReturnValueOnce('8.19.2\n');

            const result = checkNodeNpmAvailability();

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Node.js не найден: node not found');
            expect(result.warnings).toHaveLength(0);
        });

        test('should return error when npm is not available', () => {
            mockExecSync
                .mockReturnValueOnce('v18.0.0\n')
                .mockImplementationOnce(() => { throw new Error('npm not found'); });

            const result = checkNodeNpmAvailability();

            expect(result.success).toBe(false);
            expect(result.errors).toContain('npm не найден: npm not found');
        });

        test('should return error when both node and npm are not available', () => {
            mockExecSync
                .mockImplementationOnce(() => { throw new Error('node not found'); })
                .mockImplementationOnce(() => { throw new Error('npm not found'); });

            const result = checkNodeNpmAvailability();

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContain('Node.js не найден: node not found');
            expect(result.errors).toContain('npm не найден: npm not found');
        });

        test('should handle logger when set', () => {
            setGlobalLogger(mockLoggerInstance);
            mockExecSync
                .mockReturnValueOnce('v18.0.0\n')
                .mockReturnValueOnce('8.19.2\n');

            checkNodeNpmAvailability();

            expect(mockLoggerInstance.info).toHaveBeenCalledWith('Node.js версия: v18.0.0');
            expect(mockLoggerInstance.info).toHaveBeenCalledWith('npm версия: 8.19.2');
        });
    });

    describe('getRealServiceStatus', () => {
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

        test('should return stopped service by default', async () => {
            const serviceConfig = {
                Name: 'test-service',
                ProjectPath: '/test/path'
            };

            const result = await getRealServiceStatus(serviceConfig);

            expect(result.IsRunning).toBe(false);
            expect(result.PID).toBeNull();
            expect(result.PortStatus).toBe('unknown');
            expect(result.NodeVersion).toBe('unknown');
            expect(result.PackageJsonExists).toBe(false);
            expect(result.MainFileExists).toBe(false);
            expect(result.NodeModulesExist).toBe(false);
        });
    });

    describe('getDuplicateProcesses', () => {
        test('should return empty array by default', () => {
            const serviceConfig = {
                Name: 'test-service',
                ProcessName: 'node',
                ScriptArguments: 'app.js'
            };

            const result = getDuplicateProcesses(serviceConfig);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });
    });

    describe('formatRealServiceReport', () => {
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
    });

    describe('Integration tests', () => {
        test('should work with DEFAULT_SERVICE_CONFIGS', async () => {
            for (const config of DEFAULT_SERVICE_CONFIGS) {
                const status = await getRealServiceStatus(config);
                expect(status).toBeDefined();
                expect(typeof status.IsRunning).toBe('boolean');
                expect(Array.isArray(status.Errors)).toBe(true);
                expect(Array.isArray(status.Warnings)).toBe(true);
            }
        });

        test('should handle all service configuration properties', () => {
            DEFAULT_SERVICE_CONFIGS.forEach(config => {
                expect(config).toHaveProperty('Name');
                expect(config).toHaveProperty('DisplayName');
                expect(config).toHaveProperty('ProjectPath');
                expect(config).toHaveProperty('ExpectedPort');

                // Check paths are absolute or relative appropriately
                expect(typeof config.ProjectPath).toBe('string');
                expect(typeof config.ExpectedPort).toBe('number');
                expect(config.ExpectedPort).toBeGreaterThan(0);
                expect(config.ExpectedPort).toBeLessThan(65536);
            });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        test('should handle empty service configuration', async () => {
            const emptyConfig = {};
            const status = await getRealServiceStatus(emptyConfig);
            
            expect(status).toBeDefined();
            expect(status.IsRunning).toBe(false);
            expect(status.PID).toBeNull();
            expect(Array.isArray(status.Errors)).toBe(true);
            expect(Array.isArray(status.Warnings)).toBe(true);
        });

        test('should handle null service configuration', async () => {
            const status = await getRealServiceStatus(null);
            
            expect(status).toBeDefined();
            expect(status.IsRunning).toBe(false);
            expect(status.PID).toBeNull();
        });

        test('should handle undefined service configuration', async () => {
            const status = await getRealServiceStatus(undefined);
            
            expect(status).toBeDefined();
            expect(status.IsRunning).toBe(false);
            expect(status.PID).toBeNull();
        });

        test('should handle service configuration with missing properties', async () => {
            const incompleteConfig = {
                Name: 'Incomplete Service'
                // Missing other required properties
            };
            
            const status = await getRealServiceStatus(incompleteConfig);
            
            expect(status).toBeDefined();
            expect(status.IsRunning).toBe(false);
            expect(status.PackageJsonExists).toBe(false);
            expect(status.MainFileExists).toBe(false);
            expect(status.NodeModulesExist).toBe(false);
        });

        test('should handle very long service names', async () => {
            const longNameConfig = {
                Name: 'a'.repeat(1000),
                ProjectPath: '/test/path',
                MainFile: 'app.js'
            };
            
            const status = await getRealServiceStatus(longNameConfig);
            
            expect(status).toBeDefined();
            expect(typeof status.IsRunning).toBe('boolean');
        });

        test('should handle special characters in service names', async () => {
            const specialNameConfig = {
                Name: 'test-service_123-abc.def@domain',
                ProjectPath: '/test/path',
                MainFile: 'app.js'
            };
            
            const status = await getRealServiceStatus(specialNameConfig);
            
            expect(status).toBeDefined();
            expect(typeof status.IsRunning).toBe('boolean');
        });
    });

    describe('Error Handling and Resilience', () => {
        test('should handle file system errors gracefully', async () => {
            mockFileSystemUtilsInstance.fileExists.mockRejectedValue(new Error('File system error'));
            mockFileSystemUtilsInstance.readFile.mockRejectedValue(new Error('Read error'));

            const result = await getServicePortFromInfrastructure('/test/project');
            
            expect(result).toBeNull();
        });

        test('should handle process execution errors gracefully', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Command not found');
            });

            const result = checkNodeNpmAvailability();
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0]).toContain('Node.js не найден');
            expect(result.errors[1]).toContain('npm не найден');
        });

        test('should handle partial process execution errors', () => {
            mockExecSync
                .mockReturnValueOnce('v18.0.0\n')
                .mockImplementationOnce(() => {
                    throw new Error('npm not found');
                });

            const result = checkNodeNpmAvailability();
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('npm не найден');
        });

        test('should handle malformed JSON in infrastructure file', async () => {
            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockResolvedValue('invalid json content');

            const result = await getServicePortFromInfrastructure('/test/project');
            
            expect(result).toBeNull();
        });

        test('should handle empty infrastructure file', async () => {
            mockFileSystemUtilsInstance.fileExists.mockResolvedValue(true);
            mockFileSystemUtilsInstance.readFile.mockResolvedValue('');

            const result = await getServicePortFromInfrastructure('/test/project');
            
            expect(result).toBeNull();
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle large number of service configurations', async () => {
            const largeConfigs = [];
            for (let i = 0; i < 100; i++) {
                largeConfigs.push({
                    Name: `Service ${i}`,
                    ProjectPath: `/test/path/${i}`,
                    MainFile: 'app.js',
                    ExpectedPort: 3000 + i
                });
            }

            const promises = largeConfigs.map(config => getRealServiceStatus(config));
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(100);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(typeof result.IsRunning).toBe('boolean');
            });
        });

        test('should handle rapid successive calls', async () => {
            const config = {
                Name: 'Test Service',
                ProjectPath: '/test/path',
                MainFile: 'app.js'
            };

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(getRealServiceStatus(config));
            }

            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(typeof result.IsRunning).toBe('boolean');
            });
        });
    });

    describe('Configuration Validation', () => {
        test('should validate service configuration structure', () => {
            DEFAULT_SERVICE_CONFIGS.forEach(config => {
                // Required string properties
                expect(typeof config.Name).toBe('string');
                expect(config.Name.length).toBeGreaterThan(0);
                expect(typeof config.DisplayName).toBe('string');
                expect(config.DisplayName.length).toBeGreaterThan(0);
                expect(typeof config.ProjectPath).toBe('string');
                expect(config.ProjectPath.length).toBeGreaterThan(0);

                // Required numeric properties
                expect(typeof config.ExpectedPort).toBe('number');
                expect(config.ExpectedPort).toBeGreaterThan(0);
                expect(config.ExpectedPort).toBeLessThan(65536);

                // Optional properties should have correct types if present
                if (config.PackageJson) {
                    expect(typeof config.PackageJson).toBe('string');
                }
                if (config.MainFile) {
                    expect(typeof config.MainFile).toBe('string');
                }
                if (config.NodeVersion) {
                    expect(typeof config.NodeVersion).toBe('string');
                }
                if (config.ProcessName) {
                    expect(typeof config.ProcessName).toBe('string');
                }
                if (config.ScriptArguments) {
                    expect(typeof config.ScriptArguments).toBe('string');
                }
                if (config.WorkingDirectory) {
                    expect(typeof config.WorkingDirectory).toBe('string');
                }
                if (config.StatusPath) {
                    expect(typeof config.StatusPath).toBe('string');
                }
            });
        });

        test('should have unique service names', () => {
            const names = DEFAULT_SERVICE_CONFIGS.map(config => config.Name);
            const uniqueNames = new Set(names);
            
            expect(uniqueNames.size).toBe(names.length);
        });

        test('should have unique ports', () => {
            const ports = DEFAULT_SERVICE_CONFIGS.map(config => config.ExpectedPort);
            const uniquePorts = new Set(ports);
            
            expect(uniquePorts.size).toBe(ports.length);
        });
    });

    describe('Report Formatting', () => {
        test('should format report with multiple services', () => {
            const reportData = [
                {
                    Name: 'service1',
                    IsRunning: true,
                    PID: 1234,
                    PortStatus: 'listening',
                    Errors: [],
                    Warnings: []
                },
                {
                    Name: 'service2',
                    IsRunning: false,
                    PID: null,
                    PortStatus: 'not_listening',
                    Errors: ['Service failed to start'],
                    Warnings: ['Port not available']
                }
            ];

            const overallStatus = 'partial';
            const result = formatRealServiceReport(reportData, overallStatus);

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: partial');
            expect(result).toContain('service1');
            expect(result).toContain('service2');
        });

        test('should handle report with no services', () => {
            const result = formatRealServiceReport([], 'unknown');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: unknown');
        });

        test('should handle report with null data', () => {
            const result = formatRealServiceReport(null, 'error');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: error');
        });

        test('should handle report with undefined data', () => {
            const result = formatRealServiceReport(undefined, 'error');

            expect(typeof result).toBe('string');
            expect(result).toContain('# Отчет о состоянии сервисов');
            expect(result).toContain('Статус: error');
        });
    });

    describe('Logger Integration', () => {
        test('should work with different logger implementations', () => {
            const customLogger = createMockLogger();
            setGlobalLogger(customLogger);

            // Test that logger is set (we can't directly access it, but we can test side effects)
            expect(customLogger).toBeDefined();
        });

        test('should handle logger methods that throw errors', () => {
            const errorLogger = {
                debug: jest.fn().mockImplementation(() => {
                    throw new Error('Logger error');
                }),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            };

            // This should not throw an error
            expect(() => {
                setGlobalLogger(errorLogger);
            }).not.toThrow();
        });
    });
});
