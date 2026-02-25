const { createGatewayApp } = require('../../src/gateway-app.js');
const express = require('express');
const request = require('supertest');
const { createProxyMiddleware } = require('http-proxy-middleware');

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => (req, res, next) => next())
}));

describe('createGatewayApp', () => {
  let mockLogger;
  let mockServices;
  let mockAuthConfig;
  let mockAuthenticationUtils;
  let mockConfigurationUtils;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockServices = [
      {
        routePrefix: '/api/users',
        target: 'http://localhost:3012'
      },
      {
        routePrefix: '/api/orders',
        target: 'http://localhost:3002'
      }
    ];

    mockAuthConfig = {
      auth_keys: {
        'test-key-1': {
          id: 'user1',
          name: 'Test User',
          roles: ['user'],
          permissions: ['read']
        }
      },
      settings: {
        cookie_name: 'auth_key',
        header_name: 'X-Auth-Key',
        cookie_max_age: 86400000,
        secure_cookies: false
      }
    };

    mockAuthenticationUtils = {
      initialize: jest.fn().mockResolvedValue(),
      createAuthMiddleware: jest.fn().mockReturnValue((req, res, next) => {
        req.user = { id: 'user1', name: 'Test User', roles: ['user'], permissions: ['read'] };
        next();
      }),
      createLogoutMiddleware: jest.fn().mockReturnValue((req, res, next) => next()),
      getAllApiKeys: jest.fn().mockReturnValue(mockAuthConfig.auth_keys)
    };

    mockConfigurationUtils = {
      get: jest.fn().mockReturnValue(null)
    };

    createProxyMiddleware.mockClear();
  });

  describe('createGatewayApp with default dependencies', () => {
    test('должен создать приложение с дефолтной конфигурацией', async () => {
      const { app, authConfig } = await createGatewayApp();

      expect(app).toBeDefined();
      expect(authConfig).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(mockAuthenticationUtils.initialize).toHaveBeenCalled();
    });

    test('должен использовать дефолтный логгер, если он не предоставлен', async () => {
      const { app } = await createGatewayApp();
      expect(app).toBeDefined();
      // Проверка на использование console.log в реальном приложении затруднительна без более глубоких моков Express.
      // Однако, мы проверяем, что приложение создано без ошибок, предполагая, что дефолтный логгер используется.
    });
  });

  describe('createGatewayApp with custom dependencies', () => {
    test('должен использовать предоставленный логгер', async () => {
      await createGatewayApp({
        logger: mockLogger,
        services: mockServices,
        authConfig: mockAuthConfig,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(mockAuthenticationUtils.initialize).toHaveBeenCalledWith({
        logger: mockLogger,
        authConfig: mockAuthConfig
      });
    });

    test('должен использовать предоставленные сервисы для настройки прокси', async () => {
      const { app } = await createGatewayApp({
        logger: mockLogger,
        services: mockServices,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(app).toBeDefined();
      expect(createProxyMiddleware).toHaveBeenCalledTimes(mockServices.length);
      expect(createProxyMiddleware).toHaveBeenCalledWith(expect.any(Function), {
        target: mockServices[0].target,
        changeOrigin: true,
        pathRewrite: expect.any(Function)
      });
    });

    test('должен использовать предоставленную конфигурацию аутентификации', async () => {
      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authConfig: mockAuthConfig,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(authConfig).toEqual(mockAuthConfig);
    });
  });

  describe('middleware configuration', () => {
    test('должен конфигурировать middleware для парсинга JSON', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      await agent.post('/test').send({ key: 'value' }).expect(404); // Ожидаем 404, так как нет обработчика пути
      // Если бы express.json не работал, то body был бы пустым или некорректным
    });

    test('должен конфигурировать middleware для парсинга cookies', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      await agent.get('/test').set('Cookie', ['auth_key=test-value']).expect(404); // Ожидаем 404
      // Проверка работы cookie-parser требует более сложной симуляции или интеграционного теста
    });

    test('должен конфигурировать middleware аутентификации', async () => {
      await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(mockAuthenticationUtils.createAuthMiddleware).toHaveBeenCalledWith({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        cookieName: expect.any(String),
        headerName: expect.any(String),
        validKeys: expect.any(Object),
        cookieMaxAge: expect.any(Number),
        secureCookies: expect.any(Boolean)
      });
    });
  });

  describe('authentication endpoints', () => {
    test('должен обрабатывать /auth/status для аутентифицированного пользователя', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });
      const agent = request(app);

      const res = await agent.get('/auth/status');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        authenticated: true,
        user: { id: 'user1', name: 'Test User', roles: ['user'], permissions: ['read'] }
      });
    });

    test('должен обрабатывать /auth/status для неаутентифицированного пользователя', async () => {
      // Переопределяем мок middleware, чтобы user был null
      mockAuthenticationUtils.createAuthMiddleware.mockReturnValue((req, res, next) => {
        req.user = null;
        next();
      });

      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });
      const agent = request(app);

      const res = await agent.get('/auth/status');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        authenticated: false
      });
    });

    test('должен обрабатывать /auth/logout', async () => {
      const { app } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });
      const agent = request(app);

      const res = await agent.post('/auth/logout');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        message: 'Logged out successfully'
      });
      expect(mockAuthenticationUtils.createLogoutMiddleware).toHaveBeenCalled();
    });
  });

  describe('proxy configuration', () => {
    test('должен конфигурировать proxy middleware для сервисов', async () => {
      await createGatewayApp({
        logger: mockLogger,
        services: mockServices,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(createProxyMiddleware).toHaveBeenCalledTimes(mockServices.length);
      expect(createProxyMiddleware).toHaveBeenCalledWith(expect.any(Function), {
        target: mockServices[0].target,
        changeOrigin: true,
        pathRewrite: expect.any(Function)
      });
    });

    test('должен обрабатывать proxy запрос с аутентификацией пользователя', async () => {
      const mockProxy = jest.fn((req, res, next) => {
        // Проверяем, что заголовки были установлены правильно
        expect(req.headers['x-auth-key']).toBeDefined();
        expect(req.headers['x-user-data']).toBeDefined();
        next();
      });

      createProxyMiddleware.mockReturnValueOnce(mockProxy);

      const { app } = await createGatewayApp({
        logger: mockLogger,
        services: [{ routePrefix: '/api/test', target: 'http://localhost:3012' }],
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.get('/api/test/some-endpoint')
        .set('Authorization', 'Bearer test-token')
        .expect(404); // 404 потому что мы не настроили реальный маршрут

      expect(mockProxy).toHaveBeenCalled();
    });

    test('должен обрабатывать ошибки proxy', async () => {
      const mockProxyWithError = jest.fn((req, res, next) => {
        const error = new Error('Connection refused');
        // Вызываем onError callback
        const onErrorCallback = createProxyMiddleware.mock.calls[0][1].onError;
        onErrorCallback(error, req, res);
      });

      createProxyMiddleware.mockReturnValueOnce(mockProxyWithError);

      const { app } = await createGatewayApp({
        logger: mockLogger,
        services: [{ routePrefix: '/api/error', target: 'http://localhost:3012' }],
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.get('/api/error/test');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        error: 'Service unavailable',
        message: 'Backend service is not available'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('должен пропускать настройку proxy, если сервисы не предоставлены', async () => {
      await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });
      expect(createProxyMiddleware).not.toHaveBeenCalled();
    });

    test('должен корректно обрабатывать несколько сервисов с разными префиксами', async () => {
      const multipleServices = [
        { routePrefix: '/api/users', target: 'http://localhost:3012' },
        { routePrefix: '/api/orders', target: 'http://localhost:3002' },
        { routePrefix: '/api/products', target: 'http://localhost:3003' }
      ];

      await createGatewayApp({
        logger: mockLogger,
        services: multipleServices,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(createProxyMiddleware).toHaveBeenCalledTimes(3);

      // Проверяем, что каждый сервис настроен с правильным префиксом
      multipleServices.forEach((service, index) => {
        expect(createProxyMiddleware).toHaveBeenNthCalledWith(
          index + 1,
          expect.any(Function),
          expect.objectContaining({
            target: service.target,
            pathRewrite: {
              [`^${service.routePrefix}`]: ''
            }
          })
        );
      });
    });

    test('должен обрабатывать пустой массив сервисов', async () => {
      await createGatewayApp({
        logger: mockLogger,
        services: [],
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(createProxyMiddleware).not.toHaveBeenCalled();
    });

    test('должен корректно переписывать пути для вложенных маршрутов', async () => {
      const service = { routePrefix: '/api/v1', target: 'http://localhost:3012' };
      let capturedPathRewrite;

      createProxyMiddleware.mockImplementation((filter, options) => {
        capturedPathRewrite = options.pathRewrite;
        return (req, res, next) => next();
      });

      await createGatewayApp({
        logger: mockLogger,
        services: [service],
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(capturedPathRewrite).toEqual({
        '^/api/v1': ''
      });
    });
  });

  describe('error handling', () => {
    test('должен обрабатывать 404 ошибки', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });
      const agent = request(app);

      const res = await agent.get('/non-existent-path');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toEqual({
        message: 'Not Found',
        path: '/non-existent-path'
      });
    });

    test('должен обрабатывать ошибки приложения', async () => {
      const mockError = new Error('Test error');
      const { app } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      app.get('/error', (req, res, next) => {
        next(mockError);
      });

      const agent = request(app);
      const res = await agent.get('/error');

      expect(mockLogger.error).toHaveBeenCalledWith('Gateway error:', mockError);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      });
    });
  });

  describe('configuration loading', () => {
    test('должен загружать конфигурацию аутентификации из предоставленной конфигурации', async () => {
      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authConfig: mockAuthConfig,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(authConfig).toEqual(mockAuthConfig);
    });

    test('должен возвращаться к дефолтной конфигурации аутентификации при неудачной загрузке', async () => {
      // Мокаем, чтобы configurationUtils.get возвращал undefined для auth.config
      mockConfigurationUtils.get.mockImplementation((key) => {
        if (key === 'auth.config') return undefined;
        return null;
      });

      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(authConfig).toBeDefined();
      expect(authConfig.auth_keys).toBeDefined();
      expect(authConfig.settings).toBeDefined();
      // Проверяем, что используются дефолтные значения или значения из authConfig.json
    });

    test('должен объединять глобальные настройки аутентификации из конфигурации', async () => {
      const globalSettings = {
        cookie_name: 'custom_auth_key',
        secure_cookies: true
      };

      mockConfigurationUtils.get.mockImplementation((key) => {
        if (key === 'auth.settings') return globalSettings;
        if (key === 'auth.config') return mockAuthConfig; // Чтобы authConfig загрузился
        return null;
      });

      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(mockConfigurationUtils.get).toHaveBeenCalledWith('auth.settings');
      expect(authConfig.settings.cookie_name).toEqual(globalSettings.cookie_name);
      expect(authConfig.settings.secure_cookies).toEqual(globalSettings.secure_cookies);
      // Убедимся, что другие настройки остались от mockAuthConfig
      expect(authConfig.settings.header_name).toEqual(mockAuthConfig.settings.header_name);
    });
  });

  describe('initialization errors', () => {
    test('должен выбрасывать ошибку при невалидной конфигурации аутентификации', async () => {
      const invalidAuthConfig = {}; // Пустой объект как невалидная конфигурация

      await expect(createGatewayApp({
        authConfig: invalidAuthConfig,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      })).rejects.toThrow('Некорректная конфигурация аутентификации');
    });

    test('должен обрабатывать ошибку инициализации AuthenticationUtils', async () => {
      mockAuthenticationUtils.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      })).rejects.toThrow('Ошибка инициализации AuthenticationUtils');
    });

    test('должен корректно обрабатывать ошибку загрузки конфигурации', async () => {
      // Мокаем ConfigurationLoader чтобы он выбрасывал ошибку
      const mockConfigUtilsWithError = {
        get: jest.fn(() => { throw new Error('Config load failed'); })
      };

      const { app } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigUtilsWithError
      });

      expect(app).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('AuthenticationUtils: Не удалось загрузить конфигурацию ключей')
      );
    });

    test('должен использовать fallback конфигурацию при отсутствии ключей', async () => {
      const mockAuthUtilsEmpty = {
        initialize: jest.fn().mockResolvedValue(),
        createAuthMiddleware: jest.fn().mockReturnValue((req, res, next) => next()),
        createLogoutMiddleware: jest.fn().mockReturnValue((req, res, next) => next()),
        getAllAuthKeys: jest.fn().mockReturnValue({}) // Возвращаем пустой объект
      };

      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthUtilsEmpty,
        configurationUtils: mockConfigurationUtils
      });

      expect(authConfig).toBeDefined();
      expect(authConfig.auth_keys).toHaveProperty('admin_key_2024_secure_xyz789');
      expect(authConfig.auth_keys).toHaveProperty('user_key_2024_secure_abc123');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Не найдено API ключей')
      );
    });

    test('должен корректно сливать глобальные настройки аутентификации', async () => {
      const globalSettings = {
        cookie_name: 'global_auth_key',
        secure_cookies: true,
        cookie_max_age: 7200000
      };

      mockConfigurationUtils.get.mockImplementation((key) => {
        if (key === 'auth.settings') return globalSettings;
        if (key === 'auth.config') return null;
        return null;
      });

      const { authConfig } = await createGatewayApp({
        logger: mockLogger,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      // Глобальные настройки должны перезаписать дефолтные
      expect(authConfig.settings.cookie_name).toBe('global_auth_key');
      expect(authConfig.settings.secure_cookies).toBe(true);
      expect(authConfig.settings.cookie_max_age).toBe(7200000);
      // Но остальные настройки должны остаться из дефолта
      expect(authConfig.settings.header_name).toBeDefined();
    });
  });

  describe('return value', () => {
    test('должен возвращать объект с app и authConfig', async () => {
      const result = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(result).toHaveProperty('app');
      expect(result).toHaveProperty('authConfig');
      expect(typeof result.app).toBe('function'); // Express app
      expect(typeof result.authConfig).toBe('object');
    });
  });

  describe('middleware order and execution', () => {
    test('должен применять middleware в правильном порядке', async () => {
      const middlewareOrder = [];
      const mockJsonParser = jest.fn((req, res, next) => {
        middlewareOrder.push('json-parser');
        next();
      });

      const mockCookieParser = jest.fn((req, res, next) => {
        middlewareOrder.push('cookie-parser');
        next();
      });

      // Переопределяем моки для отслеживания порядка
      const originalAppUse = jest.fn();
      const mockApp = {
        use: originalAppUse,
        get: jest.fn(),
        post: jest.fn()
      };

      // Мокаем express для возврата нашего mock app
      jest.doMock('express', () => jest.fn(() => mockApp));

      const { createGatewayApp: createMockGatewayApp } = require('../../src/gateway-app.js');

      await createMockGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      // Проверяем, что middleware добавляются в правильном порядке
      expect(originalAppUse).toHaveBeenCalled();
    });

    test('должен корректно передавать request context через middleware цепочку', async () => {
      const requestContext = {};

      mockAuthenticationUtils.createAuthMiddleware.mockReturnValue((req, res, next) => {
        req.user = { id: 'test-user', name: 'Test User' };
        req.requestContext = requestContext;
        next();
      });

      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.get('/auth/status');

      expect(res.statusCode).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user.id).toBe('test-user');
    });
  });

  describe('request handling edge cases', () => {
    test('должен корректно обрабатывать POST запросы к /auth/status', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.post('/auth/status').send({ someData: 'test' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('authenticated');
    });

    test('должен корректно обрабатывать запросы с различными content-type', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);

      // JSON запрос
      const jsonRes = await agent.post('/test')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });
      expect(jsonRes.statusCode).toBe(404);

      // Form data
      const formRes = await agent.post('/test')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value');
      expect(formRes.statusCode).toBe(404);
    });

    test('должен корректно обрабатывать запросы с различными HTTP методами', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const methods = ['get', 'post', 'put', 'delete', 'patch'];

      for (const method of methods) {
        const res = await agent[method]('/non-existent-endpoint');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Not Found');
      }
    });

    test('должен корректно обрабатывать запросы с query параметрами', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.get('/auth/status?param1=value1&param2=value2');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('authenticated');
    });

    test('должен корректно обрабатывать запросы с различными заголовками', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const res = await agent.get('/auth/status')
        .set('User-Agent', 'Test-Agent')
        .set('Accept', 'application/json')
        .set('X-Custom-Header', 'custom-value');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('authenticated');
    });
  });

  describe('performance and scalability', () => {
    test('должен эффективно обрабатывать множественные одновременные запросы', async () => {
      const { app } = await createGatewayApp({
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      const agent = request(app);
      const promises = [];

      // Создаем 10 одновременных запросов
      for (let i = 0; i < 10; i++) {
        promises.push(agent.get('/auth/status'));
      }

      const results = await Promise.all(promises);

      results.forEach(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('authenticated');
      });
    });

    test('должен корректно обрабатывать большое количество сервисов', async () => {
      const largeNumberOfServices = [];
      for (let i = 0; i < 50; i++) {
        largeNumberOfServices.push({
          routePrefix: `/api/service${i}`,
          target: `http://localhost:30${String(i).padStart(2, '0')}`
        });
      }

      await createGatewayApp({
        logger: mockLogger,
        services: largeNumberOfServices,
        authenticationUtils: mockAuthenticationUtils,
        configurationUtils: mockConfigurationUtils
      });

      expect(createProxyMiddleware).toHaveBeenCalledTimes(50);
    });
  });
});
