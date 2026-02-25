import { UniversalController } from '../src/UniversalController.js';
import { PluginManager } from '../src/PluginManager.js';
import { RequestValidator } from '../src/RequestValidator.js';
import { RequestTransformer } from '../src/RequestTransformer.js';
import { ResponseTransformer } from '../src/ResponseTransformer.js';
import { LoggingUtils } from '@libs/core/logging';
import { ErrorHandlingUtils } from '@libs/error-management/error-handler';
import { ConfigurationUtils } from '@libs/core/configuration';
import { FileUtils } from '@libs/core/file-utils';
import path from 'path';

describe('UnifiedController интеграционные тесты', () => {
  let universalController;
  let pluginManager;
  let logger;
  let errorHandler;
  let configManager;
  const logFilePath = path.join(__dirname, '..\..\..\logging-reporting\core-logger\logs', 'unified-controller-integration.log'); // Updated path after libs reorganization

  beforeAll(async () => {
    logger = new LoggingUtils({
      appName: 'UnifiedControllerIntegrationTests',
      logLevel: 'debug',
      logFile: 'unified-controller-integration.log'
    });
    errorHandler = new ErrorHandlingUtils({ logger });
    configManager = new ConfigurationUtils({ configPath: './configs/test-config.json' });
    
    universalController = new UniversalController({
      logger,
      errorHandler,
      configManager
    });

    pluginManager = new PluginManager({
      logger,
      errorHandler,
      configManager
    });

    // Очищаем лог-файл перед началом тестов
    try {
      await FileUtils.writeFile(logFilePath, '');
    } catch (error) {
      // Игнорируем ошибки записи в лог-файл для тестов
    }
  });

  afterAll(async () => {
    try {
      await FileUtils.deleteFile(logFilePath);
    } catch (error) {
      // Игнорируем ошибки удаления лог-файла для тестов
    }
  });

  test('должен успешно инициализировать UniversalController с реальными зависимостями', () => {
    expect(universalController.logger).toBe(logger);
    expect(universalController.errorHandler).toBe(errorHandler);
    expect(universalController.configManager).toBe(configManager);
  });

  test('должен регистрировать и управлять сервисами с реальным логированием', async () => {
    const testService = {
      name: 'TestService',
      version: '1.0.0',
      start: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(true)
    };

    const registrationResult = await universalController.registerService('test', testService);
    expect(registrationResult.success).toBe(true);
    expect(universalController.getService('test')).toBe(testService);

    // Проверяем логирование
    const logContent = await FileUtils.readFile(logFilePath);
    expect(logContent).toContain('Service registered successfully');
    expect(logContent).toContain('test');
    expect(logContent).toContain('TestService');
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

    // Проверяем логирование
    const logContent = await FileUtils.readFile(logFilePath);
    expect(logContent).toContain('Request processed successfully');
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
      
      // Проверяем логирование ошибки
      const logContent = await FileUtils.readFile(logFilePath);
      expect(logContent).toContain('Service processing failed');
    }
  });

  test('должен загружать и управлять плагинами', async () => {
    const pluginConfig = {
      name: 'TestPlugin',
      version: '1.0.0',
      entry: './plugins/test-plugin.js'
    };

    const loadResult = await pluginManager.loadPlugin(pluginConfig);
    expect(loadResult.success).toBe(true);
    expect(pluginManager.getPlugin('TestPlugin')).toBeDefined();

    // Проверяем логирование
    const logContent = await FileUtils.readFile(logFilePath);
    expect(logContent).toContain('Plugin loaded successfully');
  });

  test('должен валидировать входящие запросы', async () => {
    const requestValidator = new RequestValidator({
      configManager,
      logger
    });

    const request = { type: 'user.create', data: { name: 'John', email: 'john@example.com' } };
    const schema = { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } };

    // Мокаем validateSchema для тестирования
    configManager.validateSchema = jest.fn().mockResolvedValue({ valid: true, data: request.data });

    const validationResult = await requestValidator.validate(request, schema);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.data).toEqual(request.data);
  });

  test('должен трансформировать входящие запросы', async () => {
    const requestTransformer = new RequestTransformer({ logger });

    const request = { 
      type: 'user.create', 
      data: { name: 'john', email: 'JOHN@EXAMPLE.COM' },
      metadata: { source: 'api' }
    };

    const transformedRequest = await requestTransformer.transform(request);

    expect(transformedRequest.data.name).toBe('John');
    expect(transformedRequest.data.email).toBe('john@example.com');
    expect(transformedRequest.metadata.source).toBe('api');
  });

  test('должен трансформировать исходящие ответы', async () => {
    const responseTransformer = new ResponseTransformer({ logger });

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
  });
});
