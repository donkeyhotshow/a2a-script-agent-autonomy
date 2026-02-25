const { RouteManager } = require('../../src/route-manager.js');

describe('RouteManager', () => {
  let routeManager;

  beforeEach(() => {
    routeManager = new RouteManager();
  });

  describe('constructor', () => {
    test('should initialize with empty routes map', () => {
      expect(routeManager.routes).toBeInstanceOf(Map);
      expect(routeManager.routes.size).toBe(0);
    });
  });

  describe('addRoute', () => {
    test('should add route to the collection', () => {
      const routeConfig = {
        method: 'GET',
        handler: (req, res) => res.json({ message: 'Hello' }),
        middleware: ['auth', 'logging']
      };

      routeManager.addRoute('/api/users', routeConfig);

      expect(routeManager.routes.has('/api/users')).toBe(true);
      expect(routeManager.routes.get('/api/users')).toEqual(routeConfig);
    });

    test('should overwrite existing route with same path', () => {
      const routeConfig1 = { method: 'GET', handler: jest.fn() };
      const routeConfig2 = { method: 'POST', handler: jest.fn() };

      routeManager.addRoute('/api/test', routeConfig1);
      routeManager.addRoute('/api/test', routeConfig2);

      expect(routeManager.routes.get('/api/test')).toEqual(routeConfig2);
    });

    test('should handle different HTTP methods for different paths', () => {
      const getRoute = { method: 'GET', handler: jest.fn() };
      const postRoute = { method: 'POST', handler: jest.fn() };
      const putRoute = { method: 'PUT', handler: jest.fn() };
      const deleteRoute = { method: 'DELETE', handler: jest.fn() };

      routeManager.addRoute('/api/resource/get', getRoute);
      routeManager.addRoute('/api/resource/post', postRoute);
      routeManager.addRoute('/api/resource/put', putRoute);
      routeManager.addRoute('/api/resource/delete', deleteRoute);

      // Каждый маршрут с разным методом должен быть добавлен отдельно по уникальному пути
      expect(routeManager.routes.size).toBe(4);
      expect(routeManager.getRoute('/api/resource/get')).toEqual(getRoute);
      expect(routeManager.getRoute('/api/resource/post')).toEqual(postRoute);
    });

    test('should handle complex route configurations', () => {
      const complexConfig = {
        method: 'POST',
        handler: (req, res) => res.json({ created: true }),
        middleware: ['auth', 'validation', 'logging'],
        schema: {
          body: {
            type: 'object',
            properties: {
              name: { type: 'string', required: true },
              email: { type: 'string', required: true }
            }
          }
        },
        rateLimit: { windowMs: 900000, max: 100 },
        cache: { ttl: 300, key: 'user:create' }
      };

      routeManager.addRoute('/api/users', complexConfig);

      const storedConfig = routeManager.routes.get('/api/users');
      expect(storedConfig.method).toBe('POST');
      expect(storedConfig.middleware).toEqual(['auth', 'validation', 'logging']);
      expect(storedConfig.schema.body.properties.name.required).toBe(true);
      expect(storedConfig.rateLimit.max).toBe(100);
      expect(storedConfig.cache.ttl).toBe(300);
    });

    test('should handle route parameters', () => {
      const routeConfig = {
        method: 'GET',
        handler: (req, res) => res.json({ id: req.params.id }),
        params: ['id']
      };

      routeManager.addRoute('/api/users/:id', routeConfig);

      const storedConfig = routeManager.routes.get('/api/users/:id');
      expect(storedConfig.params).toEqual(['id']);
    });
  });

  describe('removeRoute', () => {
    test('should remove existing route', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };
      routeManager.addRoute('/api/test', routeConfig);

      expect(routeManager.routes.has('/api/test')).toBe(true);

      routeManager.removeRoute('/api/test');

      expect(routeManager.routes.has('/api/test')).toBe(false);
    });

    test('should handle removing non-existent route', () => {
      expect(routeManager.routes.has('/api/nonexistent')).toBe(false);

      // Удаление несуществующего маршрута не должно вызывать ошибку
      expect(() => routeManager.removeRoute('/api/nonexistent')).not.toThrow();

      expect(routeManager.routes.has('/api/nonexistent')).toBe(false);
    });

    test('should return true when route is removed', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };
      routeManager.addRoute('/api/test', routeConfig);

      const result = routeManager.removeRoute('/api/test');

      expect(result).toBe(true);
    });

    test('should return false when route does not exist', () => {
      const result = routeManager.removeRoute('/api/nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getRoute', () => {
    test('should get existing route', () => {
      const routeConfig = {
        method: 'GET',
        handler: (req, res) => res.json({ message: 'Hello' })
      };

      routeManager.addRoute('/api/users', routeConfig);

      const result = routeManager.getRoute('/api/users');

      expect(result).toEqual(routeConfig);
    });

    test('should return undefined for non-existent route', () => {
      const result = routeManager.getRoute('/api/nonexistent');

      expect(result).toBeUndefined();
    });

    test('should handle exact path matching', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };

      routeManager.addRoute('/api/users', routeConfig);

      expect(routeManager.getRoute('/api/users')).toEqual(routeConfig);
      expect(routeManager.getRoute('/api/users/')).toBeUndefined(); // trailing slash
      expect(routeManager.getRoute('/api/user')).toBeUndefined(); // singular
    });
  });

  describe('getAllRoutes', () => {
    test('should return empty array when no routes', () => {
      const routes = routeManager.getAllRoutes();

      expect(routes).toEqual([]);
    });

    test('should return all routes as array of entries', () => {
      const route1 = { method: 'GET', handler: jest.fn() };
      const route2 = { method: 'POST', handler: jest.fn() };
      const route3 = { method: 'PUT', handler: jest.fn() };

      routeManager.addRoute('/api/users', route1);
      routeManager.addRoute('/api/orders', route2);
      routeManager.addRoute('/api/products', route3);

      const routes = routeManager.getAllRoutes();

      expect(routes).toHaveLength(3);
      expect(routes).toEqual([
        ['/api/users', route1],
        ['/api/orders', route2],
        ['/api/products', route3]
      ]);
    });

    test('should return routes in order of addition', () => {
      const route1 = { method: 'GET', handler: jest.fn() };
      const route2 = { method: 'POST', handler: jest.fn() };
      routeManager.addRoute('/api/first', route1);
      routeManager.addRoute('/api/second', route2);

      const routes = routeManager.getAllRoutes();

      expect(routes[0][0]).toBe('/api/first');
      expect(routes[1][0]).toBe('/api/second');
    });

    test('should handle routes with complex paths', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };

      routeManager.addRoute('/api/v1/users/:id/posts/:postId', routeConfig);

      const routes = routeManager.getAllRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0][0]).toBe('/api/v1/users/:id/posts/:postId');
    });
  });

  describe('route management operations', () => {
    test('should clear all routes', () => {
      routeManager.addRoute('/api/users', { method: 'GET', handler: jest.fn() });
      routeManager.addRoute('/api/orders', { method: 'POST', handler: jest.fn() });

      expect(routeManager.countRoutes()).toBe(2);

      routeManager.clear();

      expect(routeManager.countRoutes()).toBe(0);
    });

    test('should count routes', () => {
      expect(routeManager.countRoutes()).toBe(0);

      routeManager.addRoute('/api/users', { method: 'GET', handler: jest.fn() });
      expect(routeManager.countRoutes()).toBe(1);

      routeManager.addRoute('/api/orders', { method: 'POST', handler: jest.fn() });
      expect(routeManager.countRoutes()).toBe(2);

      routeManager.removeRoute('/api/users');
      expect(routeManager.countRoutes()).toBe(1);
    });

    test('should check if route exists', () => {
      routeManager.addRoute('/api/test', { method: 'GET', handler: jest.fn() });

      expect(routeManager.hasRoute('/api/test')).toBe(true);
      expect(routeManager.hasRoute('/api/nonexistent')).toBe(false);
    });
  });

  describe('route filtering', () => {
    test('should filter routes by method', () => {
      routeManager.addRoute('/api/users', { method: 'GET', handler: jest.fn() });
      routeManager.addRoute('/api/products', { method: 'POST', handler: jest.fn() });
      routeManager.addRoute('/api/orders', { method: 'GET', handler: jest.fn() });
      routeManager.addRoute('/api/items', { method: 'PUT', handler: jest.fn() });

      const getRoutes = routeManager.getRoutesByMethod('GET');
      expect(getRoutes).toHaveLength(2);
      expect(getRoutes[0][0]).toBe('/api/users');
      expect(getRoutes[1][0]).toBe('/api/orders');

      const postRoutes = routeManager.getRoutesByMethod('POST');
      expect(postRoutes).toHaveLength(1);
      expect(postRoutes[0][0]).toBe('/api/products');
    });

    test('should filter routes by path pattern', () => {
      routeManager.addRoute('/api/users', { method: 'GET', handler: jest.fn() });
      routeManager.addRoute('/api/users/profile', { method: 'GET', handler: jest.fn() });
      routeManager.addRoute('/api/orders', { method: 'POST', handler: jest.fn() });
      routeManager.addRoute('/admin/users', { method: 'GET', handler: jest.fn() });

      const apiRoutes = routeManager.getRoutesByPattern('/api/*');
      expect(apiRoutes).toHaveLength(3);
      expect(apiRoutes[0][0]).toBe('/api/users');
      expect(apiRoutes[1][0]).toBe('/api/users/profile');
      expect(apiRoutes[2][0]).toBe('/api/orders');

      const userRoutes = routeManager.getRoutesByPattern('*/users*');
      expect(userRoutes).toHaveLength(3);
      expect(userRoutes[0][0]).toBe('/api/users');
      expect(userRoutes[1][0]).toBe('/api/users/profile');
      expect(userRoutes[2][0]).toBe('/admin/users');
    });
  });

  describe('route validation', () => {
    test('should validate route configuration', () => {
      const validConfig = {
        method: 'GET',
        handler: (req, res) => res.json({}),
        middleware: ['auth']
      };

      expect(routeManager.validateRoute('/api/test', validConfig)).toBe(true);
    });

    test('should reject invalid route configuration', () => {
      const invalidConfig1 = {
        method: 'INVALID',
        handler: (req, res) => res.json({})
      };
      const invalidConfig2 = {
        method: 'GET',
        handler: 'not a function'
      };
      const invalidConfig3 = {
        // missing method
        handler: (req, res) => res.json({})
      };
      const invalidConfig4 = {
        method: 'GET'
        // missing handler
      };

      expect(routeManager.validateRoute('/api/test', invalidConfig1)).toBe(false);
      expect(routeManager.validateRoute('/api/test', invalidConfig2)).toBe(false);
      expect(routeManager.validateRoute('/api/test', invalidConfig3)).toBe(false);
      expect(routeManager.validateRoute('/api/test', invalidConfig4)).toBe(false);
      expect(routeManager.validateRoute('/api/test', null)).toBe(false);
      expect(routeManager.validateRoute('/api/test', undefined)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle null or undefined path', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };
      expect(() => routeManager.addRoute(null, routeConfig)).not.toThrow();
      expect(routeManager.hasRoute(null)).toBe(true);
      expect(() => routeManager.addRoute(undefined, routeConfig)).not.toThrow();
      expect(routeManager.hasRoute(undefined)).toBe(true);
    });

    test('should handle empty string path', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };
      routeManager.addRoute('', routeConfig);

      expect(routeManager.routes.has('')).toBe(true);
    });

    test('should handle special characters in path', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };
      const specialPath = '/api/users/:id/posts/:postId?query=value&filter=active';

      routeManager.addRoute(specialPath, routeConfig);

      expect(routeManager.routes.has(specialPath)).toBe(true);
      expect(routeManager.getRoute(specialPath)).toEqual(routeConfig);
    });

    test('should handle very long paths', () => {
      const longPath = '/api/' + 'a'.repeat(1000);
      const routeConfig = { method: 'GET', handler: jest.fn() };

      routeManager.addRoute(longPath, routeConfig);

      expect(routeManager.routes.has(longPath)).toBe(true);
    });

    test('should handle route config with circular references', () => {
      const config = { method: 'GET', handler: jest.fn() };
      config.self = config; // circular reference

      expect(() => routeManager.addRoute('/api/circular', config)).not.toThrow();
      expect(routeManager.routes.has('/api/circular')).toBe(true);
    });
  });

  describe('performance considerations', () => {
    test('should handle large number of routes efficiently', () => {
      const routeConfig = { method: 'GET', handler: jest.fn() };

      // Добавляем 1000 маршрутов
      for (let i = 0; i < 1000; i++) {
        routeManager.addRoute(`/api/route${i}`, routeConfig);
      }

      expect(routeManager.routes.size).toBe(1000);

      // Проверяем быстрый доступ
      const startTime = Date.now();
      const result = routeManager.getRoute('/api/route500');
      const endTime = Date.now();

      expect(result).toEqual(routeConfig);
      expect(endTime - startTime).toBeLessThan(10); // Должен быть очень быстрым
    });
  });
});
