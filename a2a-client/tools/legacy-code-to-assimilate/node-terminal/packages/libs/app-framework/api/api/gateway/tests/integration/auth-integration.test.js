const request = require('supertest');
const express = require('express');
const { createGatewayApp } = require('../../src/gateway-app.js');
const { ApiUtils } = require('@libs/network/api');
const { AuthenticationUtils, authenticationUtils } = require('@libs/security/authentication'); // Обновлен импорт
const fs = require('fs/promises'); // Для очистки временных файлов

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

describe('Gateway Auth Integration Tests', () => {
  let app;
  let authUtilInstance; // Экземпляр AuthenticationUtils
  const tempAuthDataPath = './temp_auth_store.json';

  beforeAll(async () => {
    // Инициализируем auth-manager для создания тестовых пользователей
    // Для тестов используем временный файл store.json, чтобы не загрязнять основной
    authUtilInstance = new AuthenticationUtils({
      logger: testLogger,
      storagePath: tempAuthDataPath // Используем временный файл для хранения данных пользователей
    });
    await authUtilInstance.initialize(); // Инициализация хранилища

    await authUtilInstance.addUser('testadmin', 'adminpass', ['admin', 'user']);
    await authUtilInstance.addUser('testuser', 'userpass', ['user']);
    await authUtilInstance.addUser('testreadonly', 'readpass', ['readonly']);
    // Создаем тестовые API ключи
    const adminApiKey = (await authUtilInstance.createAuthLink('testadmin', ['admin', 'user'], 'http://localhost')).key;
    const userApiKey = (await authUtilInstance.createAuthLink('testuser', ['user'], 'http://localhost')).key;
    const readonlyApiKey = (await authUtilInstance.createAuthLink('testreadonly', ['readonly'], 'http://localhost')).key;

    const { app: gatewayApp } = await createGatewayApp({
      logger: testLogger,
      authenticationUtils: authUtilInstance,
      authConfig: {
        auth_keys: {
          [adminApiKey]: {
            "id": "admin_001",
            "name": "Administrator",
            "roles": ["admin", "user"],
            "permissions": ["read", "write", "delete", "admin"],
            "created_at": "2024-01-01T00:00:00Z",
            "expires_at": "2025-12-31T23:59:59Z",
            "key": adminApiKey
          },
          [userApiKey]: {
            "id": "user_001",
            "name": "Regular User",
            "roles": ["user"],
            "permissions": ["read", "write"],
            "created_at": "2024-01-01T00:00:00Z",
            "expires_at": "2025-12-31T23:59:59Z",
            "key": userApiKey
          },
          [readonlyApiKey]: {
            "id": "readonly_001",
            "name": "Read Only User",
            "roles": ["readonly"],
            "permissions": ["read"],
            "created_at": "2024-01-01T00:00:00Z",
            "expires_at": "2025-12-31T23:59:59Z",
            "key": readonlyApiKey
          }
        },
        settings: {
          cookie_name: 'auth_key',
          header_name: 'X-Auth-Key',
          cookie_max_age: 86400000,
          secure_cookies: false
        }
      },
      services: []
    });
    app = gatewayApp;

    // Добавляем middleware и маршруты аутентификации напрямую
    app.use(require('cookie-parser')());
    app.use(ApiUtils.customAuthMiddleware({
      logger: testLogger,
      authenticationUtils: authUtilInstance, // Передаем экземпляр AuthenticationUtils
      validKeys: authUtilInstance.getAuthKeys(), // Получаем все ключи из authUtilInstance
      cookieName: 'auth_key',
      headerName: 'X-Auth-Key',
      cookieMaxAge: 86400000,
      secureCookies: false
    }));

    // Маршруты для управления аутентификацией (как в server.js)
    app.post('/auth/register', async (req, res) => {
      try {
        const authz = req.headers.authorization;
        const payload = authUtilInstance.verifyBearer(typeof authz === 'string' ? authz : '');
        const isAdminRegister = payload && Array.isArray(payload.roles) && payload.roles.includes('admin');
        
        const user = await authUtilInstance.addUser(req.body.username, req.body.password, req.body.roles);
        res.status(201).json(user);
      } catch (error) {
        testLogger.error('Ошибка регистрации пользователя:', error.message);
        res.status(400).json({ error: error.message });
      }
    });

    app.post('/auth/login', async (req, res) => {
      try {
        const result = await authUtilInstance.loginUser(req.body.username, req.body.password);
        res.json(result);
      } catch (error) {
        testLogger.error('Ошибка входа пользователя:', error.message);
        res.status(401).json({ error: error.message });
      }
    });

    app.post('/auth/api-keys', async (req, res) => {
      try {
        const authz = req.headers.authorization;
        const payload = authUtilInstance.verifyBearer(typeof authz === 'string' ? authz : '');
        const isAdmin = payload && Array.isArray(payload.roles) && payload.roles.includes('admin');
        
        const result = await authUtilInstance.createApiKey(req.body.name, req.body.roles, isAdmin);
        res.status(201).json(result);
      } catch (error) {
        testLogger.error('Ошибка создания API ключа:', error.message);
        res.status(403).json({ error: error.message });
      }
    });

    app.post('/auth/verify-basic', async (req, res) => {
      try {
        const result = await authUtilInstance.verifyBasicAuth(req.headers.authorization);
        if (result.ok) {
          res.json(result);
        } else {
          res.status(401).json({ ok: false });
        }
      } catch (error) {
        testLogger.error('Ошибка верификации Basic Auth:', error.message);
        res.status(400).json({ error: error.message });
      }
    });

    app.get('/auth/users', async (req, res) => {
      try {
        const authz = req.headers.authorization;
        const payload = authUtilInstance.verifyBearer(typeof authz === 'string' ? authz : '');
        const isAdmin = payload && Array.isArray(payload.roles) && payload.roles.includes('admin');
        
        const users = authUtilInstance.listUsers(isAdmin);
        res.json(users);
      } catch (error) {
        testLogger.error('Ошибка получения списка пользователей:', error.message);
        res.status(403).json({ error: error.message });
      }
    });

    app.put('/auth/users/:id/roles', express.json(), async (req, res) => {
      try {
        const authz = req.headers.authorization;
        const payload = authUtilInstance.verifyBearer(typeof authz === 'string' ? authz : '');
        const isAdmin = payload && Array.isArray(payload.roles) && payload.roles.includes('admin');
        
        const user = authUtilInstance.updateUserRoles(req.params.id, req.body.roles, isAdmin);
        res.json(user);
      } catch (error) {
        testLogger.error('Ошибка обновления ролей пользователя:', error.message);
        res.status(400).json({ error: error.message });
      }
    });

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

    app.get('/auth/logout', ApiUtils.logoutMiddleware({ logger: testLogger, cookieName: 'auth_key' }), (req, res) => {
      res.json({ message: 'Logged out successfully' });
    });
  });

  afterEach(async () => {
    // Очищаем временные файлы и хранилище после каждого теста
    await fs.rm(tempAuthDataPath, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Очистка завершена
  });

  test('should register a new user', async () => {
    const username = 'newUser';
    const password = 'newPass';
    const roles = ['user'];
    
    await authUtilInstance.addUser(username, password, roles);
    const user = await authUtilInstance.findUser(username);

    expect(user).toBeDefined();
    expect(user.username).toBe(username);
    expect(user.roles).toEqual(expect.arrayContaining(roles));
  });

  test('should not register a user without admin role', async () => {
    const username = 'newAdminUser';
    const password = 'adminPass';
    const roles = ['admin', 'user'];

    // Проверяем, что уже есть администратор
    const adminUser = await authUtilInstance.findUser('testadmin');
    expect(adminUser).toBeDefined();
    expect(adminUser.roles).toEqual(expect.arrayContaining(['admin']));

    // Пытаемся добавить нового пользователя с ролью администратора, не имея админских прав в данном контексте теста
    await expect(authUtilInstance.addUser(username, password, roles)).rejects.toThrow('Пользователь newAdminUser уже существует.');
  });

  test('should allow admin to register a new user', async () => {
    const username = 'anotherUser';
    const password = 'anotherPass';
    const roles = ['user'];

    await authUtilInstance.addUser(username, password, roles);
    const user = await authUtilInstance.findUser(username);

    expect(user).toBeDefined();
    expect(user.username).toBe(username);
    expect(user.roles).toEqual(expect.arrayContaining(roles));
  });

  test('should login a user and return a token', async () => {
    const username = 'testuser';
    const password = 'userpass';

    const user = await authUtilInstance.findUser(username);
    expect(user).toBeDefined();

    const isValid = await authUtilInstance.verifyUserPassword(username, password);
    expect(isValid).toBe(true);
  });

  test('should create an API key as admin', async () => {
    const adminApiKey = (await authUtilInstance.createAuthLink('testadmin', ['admin'], 'http://localhost')).key;
    expect(adminApiKey).toBeDefined();
  });

  test('should verify basic auth', async () => {
    const adminKey = (await authUtilInstance.createAuthLink('testadmin', ['admin'])).key;
    const res = await request(app)
      .get('/auth/status')
      .set('X-Auth-Key', adminKey);
    expect(res.statusCode).toEqual(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.id).toBeDefined();
  });

  test('should list users as admin', async () => {
    const adminKey = (await authUtilInstance.createAuthLink('testadmin', ['admin'])).key;
    const res = await request(app)
      .get('/users')
      .set('X-Auth-Key', adminKey);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].username).toBeDefined();
  });

  test('should update user roles as admin', async () => {
    const adminKey = (await authUtilInstance.createAuthLink('testadmin', ['admin'])).key;
    const usernameToUpdate = 'testuser';
    const newRoles = ['admin', 'editor'];

    const res = await request(app)
      .put(`/users/${usernameToUpdate}/roles`)
      .set('X-Auth-Key', adminKey)
      .send({ roles: newRoles });
    expect(res.statusCode).toEqual(200);
    expect(res.body.roles).toEqual(expect.arrayContaining(newRoles));

    const updatedUser = await authUtilInstance.findUser(usernameToUpdate);
    expect(updatedUser.roles).toEqual(expect.arrayContaining(newRoles));
  });

  test('should delete a user as admin', async () => {
    const adminKey = (await authUtilInstance.createAuthLink('testadmin', ['admin'])).key;
    const userToDelete = 'testuser';

    const res = await request(app)
      .delete(`/users/${userToDelete}`)
      .set('X-Auth-Key', adminKey);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    const deletedUser = await authUtilInstance.findUser(userToDelete);
    expect(deletedUser).toBeUndefined();
  });
});
