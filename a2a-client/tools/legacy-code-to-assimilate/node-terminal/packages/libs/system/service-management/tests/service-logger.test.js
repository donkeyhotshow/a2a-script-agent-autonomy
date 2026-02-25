/**
 * ServiceLogger - Unit Tests
 * Тестирование логгера сервисов
 */

const { ServiceLogger } = require('../src/ServiceLogger');

describe('ServiceLogger', () => {
    let serviceLogger;
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        serviceLogger = new ServiceLogger(mockLogger);
    });

    describe('Constructor', () => {
        test('should create instance with logger', () => {
            expect(serviceLogger).toBeDefined();
            expect(serviceLogger.logger).toBe(mockLogger);
        });
    });

    describe('Service Event Logging', () => {
        test('should log service event with info level', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'Starting service';
            const data = { pid: 123 };

            serviceLogger.logServiceEvent(serviceId, eventType, message, data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                data
            );
        });

        test('should log service event without data', () => {
            const serviceId = 'test-service';
            const eventType = 'STOP';
            const message = 'Stopping service';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle empty service ID', () => {
            const serviceId = '';
            const eventType = 'CONFIG_LOAD';
            const message = 'Loading configuration';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle null service ID', () => {
            const serviceId = null;
            const eventType = 'CONFIG_LOAD';
            const message = 'Loading configuration';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:null][${eventType}] ${message}`,
                {}
            );
        });
    });

    describe('Service Error Logging', () => {
        test('should log service error with error level', () => {
            const serviceId = 'test-service';
            const message = 'Failed to start service';
            const error = new Error('Process start failed');
            const data = { attempt: 1 };

            serviceLogger.logServiceError(serviceId, message, error, data);

            expect(mockLogger.error).toHaveBeenCalledWith(
                `[Service:${serviceId}][ERROR] ${message}: ${error.message}`,
                { ...data, stack: error.stack }
            );
        });

        test('should log service error without data', () => {
            const serviceId = 'test-service';
            const message = 'Service crashed';
            const error = new Error('Unexpected error');

            serviceLogger.logServiceError(serviceId, message, error);

            expect(mockLogger.error).toHaveBeenCalledWith(
                `[Service:${serviceId}][ERROR] ${message}: ${error.message}`,
                { stack: error.stack }
            );
        });

        test('should handle error without stack trace', () => {
            const serviceId = 'test-service';
            const message = 'Service failed';
            const error = { message: 'Simple error' };

            serviceLogger.logServiceError(serviceId, message, error);

            expect(mockLogger.error).toHaveBeenCalledWith(
                `[Service:${serviceId}][ERROR] ${message}: ${error.message}`,
                { stack: undefined }
            );
        });

        test('should handle null error', () => {
            const serviceId = 'test-service';
            const message = 'Service failed';
            const error = null;

            serviceLogger.logServiceError(serviceId, message, error);

            expect(mockLogger.error).toHaveBeenCalledWith(
                `[Service:${serviceId}][ERROR] ${message}: null`,
                { stack: undefined }
            );
        });
    });

    describe('Service Warning Logging', () => {
        test('should log service warning with warn level', () => {
            const serviceId = 'test-service';
            const message = 'Service is unhealthy';
            const data = { healthCheck: 'failed' };

            serviceLogger.logServiceWarn(serviceId, message, data);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `[Service:${serviceId}][WARN] ${message}`,
                data
            );
        });

        test('should log service warning without data', () => {
            const serviceId = 'test-service';
            const message = 'Service is running slowly';

            serviceLogger.logServiceWarn(serviceId, message);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `[Service:${serviceId}][WARN] ${message}`,
                {}
            );
        });
    });

    describe('Service Debug Logging', () => {
        test('should log service debug with debug level', () => {
            const serviceId = 'test-service';
            const message = 'Service configuration loaded';
            const data = { configPath: '/path/to/config' };

            serviceLogger.logServiceDebug(serviceId, message, data);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                `[Service:${serviceId}][DEBUG] ${message}`,
                data
            );
        });

        test('should log service debug without data', () => {
            const serviceId = 'test-service';
            const message = 'Service health check completed';

            serviceLogger.logServiceDebug(serviceId, message);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                `[Service:${serviceId}][DEBUG] ${message}`,
                {}
            );
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        test('should handle very long service IDs', () => {
            const serviceId = 'a'.repeat(1000);
            const eventType = 'START';
            const message = 'Starting service';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle special characters in service ID', () => {
            const serviceId = 'test-service_123-abc.def@domain';
            const eventType = 'START';
            const message = 'Starting service';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle very long messages', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'a'.repeat(10000);

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle empty messages', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = '';

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] `,
                {}
            );
        });

        test('should handle null messages', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = null;

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] null`,
                {}
            );
        });

        test('should handle undefined messages', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = undefined;

            serviceLogger.logServiceEvent(serviceId, eventType, message);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] undefined`,
                {}
            );
        });
    });

    describe('Data Handling', () => {
        test('should handle complex data objects', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'Starting service';
            const data = {
                pid: 123,
                config: { name: 'Test Service', port: 3000 },
                metadata: { version: '1.0.0', environment: 'test' },
                nested: { deep: { value: 'test' } }
            };

            serviceLogger.logServiceEvent(serviceId, eventType, message, data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                data
            );
        });

        test('should handle circular references in data', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'Starting service';
            const data = { name: 'Test Service' };
            data.self = data; // Create circular reference

            serviceLogger.logServiceEvent(serviceId, eventType, message, data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                data
            );
        });

        test('should handle null data', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'Starting service';
            const data = null;

            serviceLogger.logServiceEvent(serviceId, eventType, message, data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });

        test('should handle undefined data', () => {
            const serviceId = 'test-service';
            const eventType = 'START';
            const message = 'Starting service';
            const data = undefined;

            serviceLogger.logServiceEvent(serviceId, eventType, message, data);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `[Service:${serviceId}][${eventType}] ${message}`,
                {}
            );
        });
    });

    describe('Logger Integration', () => {
        test('should work with different logger implementations', () => {
            const customLogger = {
                info: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };

            const customServiceLogger = new ServiceLogger(customLogger);
            customServiceLogger.logServiceEvent('test-service', 'START', 'Starting service');

            expect(customLogger.info).toHaveBeenCalled();
        });

        test('should handle logger methods that throw errors', () => {
            const errorLogger = {
                info: jest.fn().mockImplementation(() => {
                    throw new Error('Logger error');
                }),
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn()
            };

            const errorServiceLogger = new ServiceLogger(errorLogger);

            expect(() => {
                errorServiceLogger.logServiceEvent('test-service', 'START', 'Starting service');
            }).toThrow('Logger error');
        });
    });
});
