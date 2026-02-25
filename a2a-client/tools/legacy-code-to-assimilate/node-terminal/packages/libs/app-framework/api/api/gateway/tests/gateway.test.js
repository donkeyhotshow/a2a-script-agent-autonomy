const request = require('supertest');
const express = require('express');
const { createGatewayApp } = require('../src/gateway-app.js');
const ConfigManager = require('@libs/core/config-manager/index.js');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Используем реальный ConfigManager вместо муляжа

describe('Gateway App', () => {
  let app;
  let authConfig;
  let logger;

  beforeAll(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Используем реальную конфигурацию из файла
    const result = createGatewayApp({
      logger,
      services: [
        {
          routePrefix: '/mock-service',
          target: 'http://localhost:3001',
        },
        {
          routePrefix: '/error-service',
          target: 'http://localhost:3002',
        },
      ],
    });
    app = result.app;
    authConfig = result.authConfig;
  });

  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/non-existent-route');
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

  describe('Authentication Endpoints', () => {
    test('should return authenticated status for valid user via header', async () => {
      const res = await request(app)
        .get('/auth/status')
        .set(authConfig.settings.header_name, 'user_key_2024_secure_abc123');

      expect(res.statusCode).toEqual(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user.id).toEqual('user_001');
      expect(res.body.user.roles).toContain('user');
    });

    test('should return unauthenticated status for no user', async () => {
      const res = await request(app).get('/auth/status');
      expect(res.statusCode).toEqual(200);
      expect(res.body.authenticated).toBe(false);
    });

    test('should logout user and clear cookie', async () => {
      const res = await request(app)
        .get('/auth/logout')
        .set('Cookie', `${authConfig.settings.cookie_name}=user_key_2024_secure_abc123`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Logged out successfully');
      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader.some(cookie => cookie.startsWith(`${authConfig.settings.cookie_name}=;`))).toBe(true);
    });
  });

  describe('Service Proxying', () => {
    test('should proxy public request to mock service', async () => {
      const res = await request(app).get('/mock-service/some-path');

      expect(res.statusCode).toEqual(200);
      expect(res.body.service).toEqual('mock');
      expect(res.body.data).toEqual('Public data');
      expect(res.body.user).toBeNull();
    });

    test('should proxy authenticated user request to mock service with user data', async () => {
      const res = await request(app)
        .get('/mock-service/some-path')
        .set(authConfig.settings.header_name, 'user_key_2024_secure_abc123');

      expect(res.statusCode).toEqual(200);
      expect(res.body.service).toEqual('mock');
      expect(res.body.data).toEqual('User data');
      expect(res.body.user.id).toEqual('user_001');
    });

    test('should proxy authenticated admin request to mock service with admin data', async () => {
      const res = await request(app)
        .get('/mock-service/some-path')
        .set(authConfig.settings.header_name, 'admin_key_2024_secure_xyz789');

      expect(res.statusCode).toEqual(200);
      expect(res.body.service).toEqual('mock');
      expect(res.body.data).toEqual('Admin data');
      expect(res.body.user.id).toEqual('admin_001');
    });

    test('should handle proxy errors gracefully', async () => {
      const res = await request(app).get('/error-service/some-path');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Service unavailable');
      expect(res.body.message).toEqual('Backend service is not available');
      expect(logger.error).toHaveBeenCalledWith('Proxy error:', expect.any(Error));
    });
  });
});
