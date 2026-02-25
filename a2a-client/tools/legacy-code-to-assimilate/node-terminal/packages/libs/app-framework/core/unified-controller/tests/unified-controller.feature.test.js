// Импортируем реальные классы из UnifiedController
import { UniversalController } from '../src/UniversalController.js';
import PluginLoader from '../src/PluginLoader.js';
import { PluginManager } from '../src/PluginManager.js';
import { ErrorHandlerIntegration } from '../src/ErrorHandlerIntegration.js';
import { RequestValidator } from '../src/RequestValidator.js';
import { RequestTransformer } from '../src/RequestTransformer.js';
import { ResponseTransformer } from '../src/ResponseTransformer.js';

describe('UnifiedController расширенная функциональность', () => {
  let universalController;
  let pluginManager;
  let mockLogger;
  let mockErrorHandler;
  let mockConfigManager;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockErrorHandler = {
      handleError: jest.fn()
    };

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      validateSchema: jest.fn()
    };

    // Создаем реальные экземпляры классов
    universalController = new UniversalController({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager
    });

    pluginManager = new PluginManager({
      logger: mockLogger,
      errorHandler: mockErrorHandler
    });
  });

  describe('UniversalController - основная функциональность', () => {
    test('должен корректно инициализироваться с переданными зависимостями', () => {
      expect(universalController.logger).toBe(mockLogger);
      expect(universalController.errorHandler).toBe(mockErrorHandler);
      expect(universalController.configManager).toBe(mockConfigManager);
      
      expect(mockLogger.info).toHaveBeenCalledWith('UniversalController initialized');
    });

    test('должен регистрировать и управлять сервисами', async () => {
      const testService = {
        name: 'TestService',
        version: '1.0.0',
        start: jest.fn().mockResolvedValue(true),
        stop: jest.fn().mockResolvedValue(true)
      };

      const registrationResult = await universalController.registerService('test', testService);
      expect(registrationResult.success).toBe(true);
      expect(universalController.getService('test')).toBe(testService);

      expect(mockLogger.info).toHaveBeenCalledWith('Service registered successfully', {
        serviceId: 'test',
        serviceName: 'TestService'
      });
    });

    test('должен обрабатывать запросы через зарегистрированные сервисы', async () => {
      const mockService = {
        name: 'MockService',
        process: jest.fn().mockResolvedValue({ result: 'success', data: 'test' })
      };

      await universalController.registerService('mock', mockService);

      const request = { type: 'test', data: { id: 1 } };
      const response = await universalController.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.result).toBe('success');
      expect(mockService.process).toHaveBeenCalledWith(request);

      expect(mockLogger.info).toHaveBeenCalledWith('Request processed successfully', {
        requestType: 'test',
        serviceId: 'mock'
      });
    });

    test('должен корректно обрабатывать ошибки сервисов', async () => {
      const failingService = {
        name: 'FailingService',
        process: jest.fn().mockRejectedValue(new Error('Service error'))
      };

      await universalController.registerService('failing', failingService);

      const request = { type: 'test', data: { id: 1 } };
      
      try {
        await universalController.processRequest(request);
      } catch (error) {
        expect(error.message).toContain('Service error');
        expect(mockErrorHandler.handleError).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('Service processing failed', {
          serviceId: 'failing',
          error: expect.any(String)
        });
      }
    });
  });

  describe('PluginManager - управление плагинами', () => {
    test('должен загружать и управлять плагинами', async () => {
      const pluginConfig = {
        name: 'TestPlugin',
        version: '1.0.0',
        entry: './plugins/test-plugin.js'
      };

      const loadResult = await pluginManager.loadPlugin(pluginConfig);
      expect(loadResult.success).toBe(true);
      expect(pluginManager.getPlugin('TestPlugin')).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Plugin loaded successfully', {
        name: 'TestPlugin',
        version: '1.0.0'
      });
    });

    test('должен проверять совместимость плагинов', async () => {
      const compatibilityCheck = await pluginManager.checkCompatibility({
        name: 'TestPlugin',
        version: '1.0.0',
        dependencies: ['@core/logger']
      });

      expect(compatibilityCheck.compatible).toBeDefined();
      expect(compatibilityCheck.issues).toBeDefined();
      expect(compatibilityCheck.recommendations).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('Plugin compatibility checked', {
        plugin: 'TestPlugin',
        compatible: expect.any(Boolean)
      });
    });
  });

  describe('RequestValidator - валидация запросов', () => {
    let requestValidator;

    beforeEach(() => {
      requestValidator = new RequestValidator({
        configManager: mockConfigManager,
        logger: mockLogger
      });
    });

    test('должен валидировать входящие запросы', async () => {
      const request = { type: 'user.create', data: { name: 'John', email: 'john@example.com' } };
      const schema = { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } };

      mockConfigManager.validateSchema.mockResolvedValue({ valid: true, data: request.data });

      const validationResult = await requestValidator.validate(request, schema);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.data).toEqual(request.data);

      expect(mockConfigManager.validateSchema).toHaveBeenCalledWith(request.data, schema);
      expect(mockLogger.debug).toHaveBeenCalledWith('Request validation completed', {
        requestType: 'user.create',
        valid: true
      });
    });

    test('должен отклонять невалидные запросы', async () => {
      const invalidRequest = { type: 'user.create', data: { name: 123 } }; // name должен быть строкой
      const schema = { type: 'object', properties: { name: { type: 'string' } } };

      mockConfigManager.validateSchema.mockResolvedValue({ 
        valid: false, 
        errors: ['name must be a string'] 
      });

      const validationResult = await requestValidator.validate(invalidRequest, schema);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('name must be a string');

      expect(mockLogger.warn).toHaveBeenCalledWith('Request validation failed', {
        requestType: 'user.create',
        errors: expect.any(Array)
      });
    });
  });

  describe('RequestTransformer - трансформация запросов', () => {
    let requestTransformer;

    beforeEach(() => {
      requestTransformer = new RequestTransformer({ logger: mockLogger });
    });

    test('должен трансформировать входящие запросы', async () => {
      const request = { 
        type: 'user.create', 
        data: { name: 'john', email: 'JOHN@EXAMPLE.COM' },
        metadata: { source: 'api' }
      };

      const transformedRequest = await requestTransformer.transform(request);

      expect(transformedRequest.data.name).toBe('John'); // Первая буква заглавная
      expect(transformedRequest.data.email).toBe('john@example.com'); // email в нижнем регистре
      expect(transformedRequest.metadata.source).toBe('api');

      expect(mockLogger.debug).toHaveBeenCalledWith('Request transformation completed', {
        requestType: 'user.create',
        transformations: expect.any(Array)
      });
    });

    test('должен применять пользовательские трансформации', async () => {
      const customTransform = (data) => ({
        ...data,
        processed: true,
        timestamp: Date.now()
      });

      requestTransformer.addTransformation('user.create', customTransform);

      const request = { type: 'user.create', data: { name: 'John' } };
      const transformedRequest = await requestTransformer.transform(request);

      expect(transformedRequest.data.processed).toBe(true);
      expect(transformedRequest.data.timestamp).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Custom transformation applied', {
        requestType: 'user.create',
        transformation: 'custom'
      });
    });
  });

  describe('ResponseTransformer - трансформация ответов', () => {
    let responseTransformer;

    beforeEach(() => {
      responseTransformer = new ResponseTransformer({ logger: mockLogger });
    });

    test('должен трансформировать исходящие ответы', async () => {
      const response = {
        success: true,
        data: { id: 1, name: 'John' },
        metadata: { processingTime: 150 }
      };

      const transformedResponse = await responseTransformer.transform(response);

      expect(transformedResponse.success).toBe(true);
      expect(transformedResponse.data).toBeDefined();
      expect(transformedResponse.metadata).toBeDefined();
      expect(transformedResponse.timestamp).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('Response transformation completed', {
        success: true,
        transformations: expect.any(Array)
      });
    });

    test('должен форматировать ответы для различных клиентов', async () => {
      const response = { success: true, data: { id: 1, name: 'John' } };

      // Форматирование для API
      const apiResponse = await responseTransformer.formatForClient(response, 'api');
      expect(apiResponse.format).toBe('json');
      expect(apiResponse.data).toBeDefined();

      // Форматирование для веб-клиента
      const webResponse = await responseTransformer.formatForClient(response, 'web');
      expect(webResponse.format).toBe('html');
      expect(webResponse.data).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Response formatted for client', {
        clientType: 'api',
        format: 'json'
      });
    });
  });

  describe('ErrorHandlerIntegration - интеграция обработки ошибок', () => {
    let errorHandlerIntegration;

    beforeEach(() => {
      errorHandlerIntegration = new ErrorHandlerIntegration(mockErrorHandler);
    });

    test('должен интегрироваться с системой обработки ошибок', async () => {
      const error = new Error('Test error');
      const context = { requestId: 'req123', userId: 'user456' };

      await errorHandlerIntegration.handleError(error, context);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, context);
      expect(mockLogger.error).toHaveBeenCalledWith('Error handled through integration', {
        error: error.message,
        context: context
      });
    });

    test('должен предоставлять контекстную информацию об ошибках', async () => {
      const error = new Error('Validation failed');
      const context = { requestId: 'req123', service: 'user-service' };

      const errorInfo = await errorHandlerIntegration.getErrorContext(error, context);
      
      expect(errorInfo.error).toBe(error.message);
      expect(errorInfo.context).toEqual(context);
      expect(errorInfo.timestamp).toBeDefined();
      expect(errorInfo.severity).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('Error context retrieved', {
        error: error.message,
        context: context
      });
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен обрабатывать полный цикл запроса-ответа', async () => {
      // Регистрируем сервис
      const service = {
        name: 'IntegrationService',
        process: jest.fn().mockResolvedValue({ result: 'success', data: 'processed' })
      };

      await universalController.registerService('integration', service);

      // Создаем запрос
      const request = { type: 'integration.test', data: { test: 'data' } };

      // Валидируем запрос
      const requestValidator = new RequestValidator({ configManager: mockConfigManager, logger: mockLogger });
      mockConfigManager.validateSchema.mockResolvedValue({ valid: true, data: request.data });
      const validationResult = await requestValidator.validate(request, { type: 'object' });
      expect(validationResult.valid).toBe(true);

      // Трансформируем запрос
      const requestTransformer = new RequestTransformer({ logger: mockLogger });
      const transformedRequest = await requestTransformer.transform(request);
      expect(transformedRequest.data).toBeDefined();

      // Обрабатываем запрос
      const response = await universalController.processRequest(transformedRequest);
      expect(response.success).toBe(true);

      // Трансформируем ответ
      const responseTransformer = new ResponseTransformer({ logger: mockLogger });
      const transformedResponse = await responseTransformer.transform(response);
      expect(transformedResponse.timestamp).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Full request-response cycle completed', {
        requestType: 'integration.test',
        success: true
      });
    });
  });
});


