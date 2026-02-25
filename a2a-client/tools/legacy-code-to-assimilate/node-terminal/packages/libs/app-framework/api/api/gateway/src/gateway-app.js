/**
 * Gateway App Factory
 * Extracted from main-gateway/server.js
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cookieParser = require('cookie-parser');
const { AuthenticationUtils } = require('@libs/security/authentication');
const { ConfigurationLoader } = require('@libs/app-framework/core/configuration/configuration-loader/index.js');
const { readFileSync, existsSync } = require('fs');
const path = require('path');
// const ConfigManager = require('../../../core/config-manager/index.js'); // Удален старый импорт

/**
 * Создает gateway приложение с кастомной аутентификацией
 * @param {object} dependencies - Зависимости для создания приложения
 * @param {object} [dependencies.logger=console] - Экземпляр логгера.
 * @param {Array<object>} [dependencies.services=[]] - Список сервисов для проксирования.
 * @param {object} [dependencies.authConfig=null] - Предоставленная конфигурация аутентификации (для тестов).
 * @param {AuthenticationUtils} [dependencies.authenticationUtils=null] - Экземпляр AuthenticationUtils.
 * @param {ConfigurationUtils} [dependencies.configurationUtils=null] - Экземпляр ConfigurationUtils.
 * @returns {object} Объект с app и authConfig
 */
async function createGatewayApp(dependencies = {}) {
  const {
    logger = console,
    services = [],
    authConfig: providedAuthConfig = null,
    authenticationUtils: providedAuthenticationUtils = null,
    configurationUtils: providedConfigurationUtils = null
  } = dependencies;

  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(cookieParser());

  const authUtil = providedAuthenticationUtils || new AuthenticationUtils({ logger });
  const configUtil = providedConfigurationUtils || new ConfigurationLoader({ logger });

  // Инициализация AuthenticationUtils
  await authUtil.initialize();

  // Загружаем конфигурацию аутентификации
  let authConfig;
  try {
    if (providedAuthConfig) {
      authConfig = providedAuthConfig;
    } else {
      // Используем ConfigurationUtils для загрузки конфигурации
      const configPath = path.join(process.cwd(), 'libs/security/authentication/data/store.json');
      
      try {
        // Загружаем актуальный список ключей из AuthenticationUtils
        authConfig = { 
          auth_keys: authUtil.getAllAuthKeys(), 
          settings: { 
            cookie_name: "auth_key",
            header_name: "X-Auth-Key",
            cookie_max_age: 86400000,
            secure_cookies: false
          }
        };
        
        // Если в ConfigManager есть настройки, можно их смержить
        const globalAuthSettings = configUtil.get('auth.settings'); 
        if (globalAuthSettings) {
          Object.assign(authConfig.settings, globalAuthSettings);
        }

        if (Object.keys(authConfig.auth_keys).length === 0) {
          logger.warn(`AuthenticationUtils: Не найдено API ключей. Использование fallback конфигурации.`);
          // Fallback auth_keys, если ключи не найдены
          authConfig.auth_keys = {
            "admin_key_2024_secure_xyz789": {
              "id": "admin_001",
              "name": "Administrator",
              "roles": ["admin", "user"],
              "permissions": ["read", "write", "delete", "admin"],
              "created_at": "2024-01-01T00:00:00Z",
              "expires_at": "2025-12-31T23:59:59Z"
            },
            "user_key_2024_secure_abc123": {
              "id": "user_001",
              "name": "Regular User",
              "roles": ["user"],
              "permissions": ["read", "write"],
              "created_at": "2024-01-01T00:00:00Z",
              "expires_at": "2025-12-31T23:59:59Z"
            }
          };
        }

      } catch (loadError) {
        logger.warn(`AuthenticationUtils: Не удалось загрузить конфигурацию ключей. Использование fallback конфигурации.`);
        authConfig = null;
      }
      
      // Если конфигурация не загружена, используем fallback
      if (!authConfig || !authConfig.auth_keys || Object.keys(authConfig.auth_keys).length === 0) {
        logger.warn('Использование fallback конфигурации для тестов/дефолта');
        authConfig = {
          auth_keys: {
            "admin_key_2024_secure_xyz789": {
              "id": "admin_001",
              "name": "Administrator",
              "roles": ["admin", "user"],
              "permissions": ["read", "write", "delete", "admin"],
              "created_at": "2024-01-01T00:00:00Z",
              "expires_at": "2025-12-31T23:59:59Z"
            },
            "user_key_2024_secure_abc123": {
              "id": "user_001",
              "name": "Regular User",
              "roles": ["user"],
              "permissions": ["read", "write"],
              "created_at": "2024-01-01T00:00:00Z",
              "expires_at": "2025-12-31T23:59:59Z"
            }
          },
          settings: {
            cookie_name: "auth_key",
            header_name: "X-Auth-Key",
            cookie_max_age: 86400000,
            secure_cookies: false
          }
        };
        logger.warn('authConfig после fallback:', authConfig);
      }
    }
  } catch (error) {
    logger.error('Ошибка при инициализации загрузки конфигурации аутентификации:', error);
    throw new Error('Не удалось инициализировать загрузку конфигурации аутентификации');
  }

  // Проверяем, что authConfig существует и имеет нужные свойства
  if (!authConfig || !authConfig.settings || !authConfig.auth_keys) {
    logger.error('Некорректная конфигурация аутентификации:', authConfig);
    throw new Error('Некорректная конфигурация аутентификации');
  }

  // Подключаем кастомную аутентификацию
  app.use(authUtil.createAuthMiddleware({
    logger,
    authenticationUtils: authUtil,
    cookieName: authConfig.settings.cookie_name,
    headerName: authConfig.settings.header_name,
    validKeys: authConfig.auth_keys,
    cookieMaxAge: authConfig.settings.cookie_max_age,
    secureCookies: authConfig.settings.secure_cookies
  }));

  // Auth endpoints
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

  app.get('/auth/logout', authUtil.createLogoutMiddleware({
    logger,
    cookieName: authConfig.settings.cookie_name
  }), (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });

  // Настраиваем прокси для сервисов
  if (services && services.length > 0) {
    services.forEach(service => {
      const proxy = createProxyMiddleware({
        target: service.target,
        changeOrigin: true,
        pathRewrite: {
          [`^${service.routePrefix}`]: ''
        },
        onProxyReq: (proxyReq, req, res) => {
          // Передаем аутентификацию к backend сервисам
          if (req.user && req.user.key) {
            proxyReq.setHeader('X-Auth-Key', req.user.key);
            proxyReq.setHeader('X-User-Data', JSON.stringify({
              id: req.user.id,
              name: req.user.name,
              roles: req.user.roles,
              permissions: req.user.permissions
            }));
          }
          
          // Сохраняем Authorization header для обратной совместимости
          if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
          }
        },
        onError: (err, req, res) => {
          logger.error('Proxy error:', err);
          res.status(500).json({ 
            error: 'Service unavailable',
            message: 'Backend service is not available'
          });
        }
      });

      // Используем точное совпадение маршрута
      app.use(service.routePrefix, proxy);
    });
  }

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ 
      message: 'Not Found',
      path: req.originalUrl
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Gateway error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  });

  return { app, authConfig };
}

export { createGatewayApp };
