const { MiddlewareCore } = require('../../src/middleware-core.js');

describe('MiddlewareCore', () => {
  let middlewareCore;

  beforeEach(() => {
    middlewareCore = new MiddlewareCore();
  });

  describe('constructor', () => {
    test('should initialize with empty middleware map', () => {
      expect(middlewareCore.middleware).toBeInstanceOf(Map);
      expect(middlewareCore.middleware.size).toBe(0);
    });
  });

  describe('use', () => {
    test('should add middleware to the collection', () => {
      const middleware = (req, res, next) => {
        req.processed = true;
        next();
      };

      middlewareCore.use('testMiddleware', middleware);

      expect(middlewareCore.middleware.has('testMiddleware')).toBe(true);
      expect(middlewareCore.middleware.get('testMiddleware')).toBe(middleware);
    });

    test('should overwrite existing middleware with same name', () => {
      const middleware1 = (req, res, next) => next();
      const middleware2 = (req, res, next) => next();

      middlewareCore.use('testMiddleware', middleware1);
      middlewareCore.use('testMiddleware', middleware2);

      expect(middlewareCore.middleware.get('testMiddleware')).toBe(middleware2);
    });

    test('should handle multiple middleware', () => {
      const authMiddleware = (req, res, next) => next();
      const loggingMiddleware = (req, res, next) => next();
      const corsMiddleware = (req, res, next) => next();

      middlewareCore.use('auth', authMiddleware);
      middlewareCore.use('logging', loggingMiddleware);
      middlewareCore.use('cors', corsMiddleware);

      expect(middlewareCore.middleware.size).toBe(3);
      expect(middlewareCore.middleware.has('auth')).toBe(true);
      expect(middlewareCore.middleware.has('logging')).toBe(true);
      expect(middlewareCore.middleware.has('cors')).toBe(true);
    });

    test('should handle complex middleware functions', () => {
      const complexMiddleware = (req, res, next) => {
        req.user = { id: 1, roles: ['admin'] };
        res.setHeader('X-Custom-Header', 'value');
        if (req.headers.authorization) {
          req.authenticated = true;
        }
        next();
      };

      middlewareCore.use('complex', complexMiddleware);

      const storedMiddleware = middlewareCore.middleware.get('complex');
      expect(typeof storedMiddleware).toBe('function');
      expect(storedMiddleware.length).toBe(3); // req, res, next
    });
  });
});
