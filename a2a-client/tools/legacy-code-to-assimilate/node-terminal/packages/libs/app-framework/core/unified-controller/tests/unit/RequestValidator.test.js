
import { RequestValidator } from '../../src/RequestValidator.js';

describe('RequestValidator', () => {
    let requestValidator;
    let mockLogger;
    let mockConfigManager;
    let consoleWarnSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        
        mockConfigManager = {
            validateSchema: jest.fn(),
            get: jest.fn(),
        };
        
        requestValidator = new RequestValidator({ configManager: mockConfigManager, logger: mockLogger });
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('should initialize with a ConfigManager and a logger', () => {
        expect(requestValidator.configManager).toBe(mockConfigManager);
        expect(requestValidator.logger).toBe(mockLogger);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should log a warning if initialized without a logger', () => {
        const validatorWithoutLogger = new RequestValidator({ configManager: mockConfigManager });
        expect(validatorWithoutLogger.logger.warn).toHaveBeenCalledWith("RequestValidator инициализирован без логгера. Логирование будет ограничено.");
        expect(consoleWarnSpy).toHaveBeenCalledWith("RequestValidator инициализирован без логгера. Логирование будет ограничено.");
    });

    test('should initialize with default ConfigManager if not provided', () => {
        const validatorWithoutConfig = new RequestValidator({ logger: mockLogger });
        expect(validatorWithoutConfig.configManager).toBeDefined();
        expect(validatorWithoutConfig.logger).toBe(mockLogger);
    });

    describe('validate', () => {
        test('should validate data successfully against a schema', async () => {
            const data = { id: '123', name: 'test' };
            const schemaName = 'userSchema';
            const validatedData = { valid: true, data: { ...data, isValid: true } };
            
            mockConfigManager.validateSchema.mockResolvedValue(validatedData);
            
            const result = await requestValidator.validate(data, schemaName);
            
            expect(mockConfigManager.validateSchema).toHaveBeenCalledWith(data, schemaName);
            expect(result).toEqual(validatedData);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Данные успешно прошли валидацию'),
                expect.objectContaining({ data: data, schema: schemaName })
            );
        });

        test('should return validation errors if validation fails', async () => {
            const data = { id: '123' };
            const schemaName = 'userSchema';
            const errors = ['name is required'];
            const validationResult = { valid: false, errors };
            
            mockConfigManager.validateSchema.mockResolvedValue(validationResult);
            
            const result = await requestValidator.validate(data, schemaName);
            
            expect(mockConfigManager.validateSchema).toHaveBeenCalledWith(data, schemaName);
            expect(result).toEqual(validationResult);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Ошибка валидации по схеме'),
                expect.objectContaining({ data, schema: schemaName, errors })
            );
        });

        test('should throw an error if configManager.validateSchema throws an error', async () => {
            const data = { id: '123' };
            const schemaName = 'userSchema';
            const validationError = new Error('Internal schema error');
            
            mockConfigManager.validateSchema.mockRejectedValue(validationError);
            
            await expect(requestValidator.validate(data, schemaName)).rejects.toThrow('Internal schema error');
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Критическая ошибка при валидации схемы'),
                expect.objectContaining({ data, schema: schemaName, error: validationError.message })
            );
        });

        test('should throw an error if schemaName is not provided', async () => {
            const data = { id: '123' };
            
            await expect(requestValidator.validate(data)).rejects.toThrow('Имя схемы не указано для валидации.');
            expect(mockLogger.error).toHaveBeenCalledWith('Имя схемы не указано для валидации.', expect.any(Object));
        });
    });

    describe('validationMiddleware', () => {
        test('should validate request params and call next if successful', async () => {
            const mockContext = { requestId: 'req1', params: { id: '123', name: 'test' } };
            const mockNext = jest.fn(async () => ({ status: 'success' }));
            const validatedData = { valid: true, data: { id: '123', name: 'test', isValid: true } };
            
            mockConfigManager.validateSchema.mockResolvedValue(validatedData);
            
            const middleware = requestValidator.validationMiddleware('userSchema');
            const result = await middleware(mockContext, mockNext);
            
            expect(mockConfigManager.validateSchema).toHaveBeenCalledWith(mockContext.params, 'userSchema');
            expect(mockContext.params).toEqual(validatedData.data); // params должны быть обновлены валидированными данными
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ status: 'success' });
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Request validation successful'),
                expect.objectContaining({ requestId: 'req1', schema: 'userSchema' })
            );
        });

        test('should throw a 400 error if validation fails in middleware', async () => {
            const mockContext = { requestId: 'req2', params: { id: '123' } };
            const mockNext = jest.fn(async () => {});
            const errors = ['name is required'];
            const validationResult = { valid: false, errors };
            
            mockConfigManager.validateSchema.mockResolvedValue(validationResult);
            
            const middleware = requestValidator.validationMiddleware('userSchema');
            
            let error;
            try {
                await middleware(mockContext, mockNext);
            } catch (e) {
                error = e;
            }
            
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Некорректные входные данные для маршрута: Ошибка валидации данных: name is required');
            expect(error.statusCode).toBe(400);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Request validation failed in middleware'),
                expect.objectContaining({ requestId: 'req2', schema: 'userSchema', errors })
            );
        });

        test('should throw a 400 error if configManager.validateSchema throws an error in middleware', async () => {
            const mockContext = { requestId: 'req3', params: { id: '123' } };
            const mockNext = jest.fn(async () => {});
            const validationError = new Error('Internal schema error');
            
            mockConfigManager.validateSchema.mockImplementation(() => {
                throw validationError;
            });
            
            const middleware = requestValidator.validationMiddleware('userSchema');
            
            await expect(middleware(mockContext, mockNext)).rejects.toThrow('Некорректные входные данные для маршрута');
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Critical error during request validation in middleware'),
                expect.objectContaining({ requestId: 'req3', schema: 'userSchema', error: validationError.message })
            );
        });
    });
});
