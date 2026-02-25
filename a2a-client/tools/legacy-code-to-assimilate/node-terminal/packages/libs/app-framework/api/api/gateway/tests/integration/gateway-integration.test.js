const request = require('supertest');
const express = require('express');
const { createGatewayApp } = require('../../src/gateway-app.js');
const { ApiUtils } = require('@libs/network/api');

// Тестовая конфигурация ключей (используем те же ключи, что и в main-gateway/server.js)
const testKeys = {
  "admin_key_2024_secure_xyz789": {
    "id": "admin_001",
    "name": "Administrator",
    "roles": ["admin", "user"],
    "permissions": ["read", "write", "delete", "admin"]
  },
  "user_key_2024_secure_abc123": {
    "id": "user_001",
    "name": "Regular User",
    "roles": ["user"],
    "permissions": ["read", "write"]
  },
  "readonly_key_2024_secure_def456": {
    "id": "readonly_001",
    "name": "Read Only User",
    "roles": ["readonly"],
    "permissions": ["read"]
  }
};

// Простой логгер для тестов
const testLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock-сервисы для проксирования
let mockApiService;
let mockAuthService;

describe('Gateway Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Запускаем мок-сервисы
    mockApiService = express();
    mockApiService.use(express.json());
    mockApiService.get('/public', (req, res) => res.json({ service: 'mock', data: 'Public data', user: req.user || null }));
    mockApiService.get('/private', (req, res) => res.json({ service: 'mock', data: 'User data', user: req.user || null }));
    mockApiService.get('/admin', (req, res) => res.json({ service: 'mock', data: 'Admin data', user: req.user || null }));
    const apiServer = await new Promise(resolve => {
      const s = mockApiService.listen(3001, () => resolve(s));
    });

    mockAuthService = express();
    mockAuthService.use(express.json());
    mockAuthService.post('/auth/verify', (req, res) => {
      // Простая имитация верификации, которая вернет данные пользователя
      const authKey = req.body.key;
      if (testKeys[authKey]) {
        res.json({ ok: true, user: testKeys[authKey] });
      } else {
        res.json({ ok: false });
      }
    });
    const authServer = await new Promise(resolve => {
      const s = mockAuthService.listen(5010, () => resolve(s));
    });

    const { app: gatewayApp, authConfig, authUtilInstance } = await createGatewayApp({
      logger: testLogger,
      authConfig: {
        auth_keys: testKeys,
        settings: {
          cookie_name: 'auth_key',
          header_name: 'X-Auth-Key',
          cookie_max_age: 86400000,
          secure_cookies: false
        }
      },
      services: [
        { name: 'api-service', path: '/api', target: 'http://localhost:3001', pathRewrite: { '^/api': '' } },
        { name: 'auth-service', path: '/auth', target: 'http://localhost:5010', pathRewrite: { '^/auth': '' } } // Пока оставим для тестов, но потом удалим
      ]
    });
    app = gatewayApp;

    // Добавляем middleware аутентификации
    app.use(require('cookie-parser')());
    app.use(authUtilInstance.createAuthMiddleware({
      logger: testLogger,
      authenticationUtils: authUtilInstance,
      validKeys: testKeys,
      cookieName: authConfig.settings.cookie_name,
      headerName: authConfig.settings.header_name,
      cookieMaxAge: authConfig.settings.cookie_max_age,
      secureCookies: authConfig.settings.secure_cookies
    }));

    app.get('/auth/status', (req, res) => {
      if (req.user) {
        res.json({
          authenticated: true,
          user: {
            id: req.user.id,
            name: req.user.name,
            roles: req.user.roles,
            permissions: req.user.permissions
          }
        });
      } else {
        res.json({ authenticated: false });
      }
    });

    app.get('/auth/logout', authUtilInstance.createLogoutMiddleware({ logger: testLogger, cookieName: 'auth_key' }), (req, res) => {
      res.json({ message: 'Logged out successfully' });
    });

    app.get('/api/public', (req, res) => {
      res.json({
        message: 'Public API endpoint',
        authenticated: !!req.user,
        user: req.user ? {
          id: req.user.id,
          name: req.user.name,
          roles: req.user.roles
        } : null
      });
    });

    app.get('/api/private', authUtilInstance.createRequireRoleMiddleware('user'), (req, res) => {
      res.json({
        message: 'Private API endpoint',
        user: {
          id: req.user.id,
          name: req.user.name,
          roles: req.user.roles,
          permissions: req.user.permissions
        }
      });
    });

    app.get('/api/admin', authUtilInstance.createRequireRoleMiddleware('admin'), (req, res) => {
      res.json({
        message: 'Admin API endpoint',
        user: {
          id: req.user.id,
          name: req.user.name,
          roles: req.user.roles,
          permissions: req.user.permissions
        }
      });
    });
  });

  afterAll(async () => {
    // Закрываем мок-сервисы
    await new Promise(resolve => mockApiService.close(resolve));
    await new Promise(resolve => mockAuthService.close(resolve));
  });

  test('should proxy public request to mock service', async () => {
    const res = await request(app).get('/api/public');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('mock');
    expect(res.body.data).toEqual('Public data');
    expect(res.body.authenticated).toBe(false);
  });

  test('should proxy authenticated user request to mock service with user data', async () => {
    const res = await request(app)
      .get('/api/private')
      .set('X-Auth-Key', 'user_key_2024_secure_abc123');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('mock');
    expect(res.body.data).toEqual('User data');
    expect(res.body.user.id).toEqual('user_001');
  });

  test('should proxy authenticated admin request to mock service with admin data', async () => {
    const res = await request(app)
      .get('/api/admin')
      .set('X-Auth-Key', 'admin_key_2024_secure_xyz789');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('mock');
    expect(res.body.data).toEqual('Admin data');
    expect(res.body.user.id).toEqual('admin_001');
  });

  test('should handle invalid auth keys gracefully', async () => {
    const res = await request(app)
      .get('/api/private')
      .set('X-Auth-Key', 'invalid_key_123');
    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Authentication required');
  });

  test('should handle missing auth gracefully', async () => {
    const res = await request(app)
      .get('/api/private');
    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Authentication required');
  });

  test('should return 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/unknown/route');
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toEqual('Not Found');
  });

  test('should handle internal server errors', async () => {
    app.get('/error-route', (req, res, next) => {
      next(new Error('Test error'));
    });
    const res = await request(app).get('/error-route');
    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Internal Server Error');
  });
});
