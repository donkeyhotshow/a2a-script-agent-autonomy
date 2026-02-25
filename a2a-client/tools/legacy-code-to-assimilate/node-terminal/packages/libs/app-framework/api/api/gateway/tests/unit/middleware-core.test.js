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

  describe('applyToRoute', () => {
    test('should apply single middleware to route', (done) => {
      const middleware = jest.fn((req, res, next) => next());
      middlewareCore.use('auth', middleware);

      const routeHandler = middlewareCore.applyToRoute('/api/users', ['auth']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, () => {
        expect(middleware).toHaveBeenCalled();
        done();
      });
    });

    test('should apply multiple middleware to route', (done) => {
      const authMiddleware = jest.fn((req, res, next) => {
        req.auth = true;
        next();
      });
      const loggingMiddleware = jest.fn((req, res, next) => {
        req.logged = true;
        next();
      });
      const validationMiddleware = jest.fn((req, res, next) => {
        req.validated = true;
        next();
      });

      middlewareCore.use('auth', authMiddleware);
      middlewareCore.use('logging', loggingMiddleware);
      middlewareCore.use('validation', validationMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/users', ['logging', 'auth', 'validation']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, () => {
        expect(loggingMiddleware).toHaveBeenCalled();
        expect(authMiddleware).toHaveBeenCalled();
        expect(validationMiddleware).toHaveBeenCalled();
        expect(mockReq.logged).toBe(true);
        expect(mockReq.auth).toBe(true);
        expect(mockReq.validated).toBe(true);
        done();
      });
    });

    test('should handle non-existent middleware names', (done) => {
      const existingMiddleware = jest.fn((req, res, next) => next());
      middlewareCore.use('existing', existingMiddleware);

      // nonExistent будет проигнорирован
      const routeHandler = middlewareCore.applyToRoute('/api/test', ['existing', 'nonExistent']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, () => {
        expect(existingMiddleware).toHaveBeenCalled();
        done();
      });
    });

    test('should handle empty middleware names array', (done) => {
      const routeHandler = middlewareCore.applyToRoute('/api/test', []);

      const mockReq = {};
      const mockRes = {};
      const finalNext = jest.fn(() => done());
      routeHandler(mockReq, mockRes, finalNext);

      expect(finalNext).toHaveBeenCalled();
    });

    test('should preserve middleware execution order', (done) => {
      const executionOrder = [];
      const middleware1 = jest.fn((req, res, next) => {
        executionOrder.push('first');
        next();
      });
      const middleware2 = jest.fn((req, res, next) => {
        executionOrder.push('second');
        next();
      });
      const middleware3 = jest.fn((req, res, next) => {
        executionOrder.push('third');
        next();
      });

      middlewareCore.use('first', middleware1);
      middlewareCore.use('second', middleware2);
      middlewareCore.use('third', middleware3);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['first', 'second', 'third']);

      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn(() => {
        expect(executionOrder).toEqual(['first', 'second', 'third']);
        done();
      });
      routeHandler(mockReq, mockRes, mockNext);
    });

    test('should handle middleware that calls next multiple times', (done) => {
      const badMiddleware = jest.fn((req, res, next) => {
        next();
        next(); // Calling next multiple times
      });
      middlewareCore.use('bad', badMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['bad']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('next() called multiple times');
        expect(badMiddleware).toHaveBeenCalledTimes(1);
        done();
      });
    });

    test('should handle middleware that throws an error', (done) => {
      const errorMiddleware = jest.fn((req, res, next) => {
        throw new Error('Something went wrong');
      });
      middlewareCore.use('error', errorMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['error']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Something went wrong');
        expect(errorMiddleware).toHaveBeenCalledTimes(1);
        done();
      });
    });

    test('should not call next if response is sent', (done) => {
      const sendingMiddleware = jest.fn((req, res, next) => {
        res.send('OK'); // Simulate sending a response
      });
      const nextMiddleware = jest.fn((req, res, next) => next());

      middlewareCore.use('send', sendingMiddleware);
      middlewareCore.use('next', nextMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['send', 'next']);

      const mockReq = {};
      const mockRes = { send: jest.fn(), finished: true }; // Simulate response sent
      routeHandler(mockReq, mockRes, () => {
        expect(sendingMiddleware).toHaveBeenCalled();
        expect(nextMiddleware).not.toHaveBeenCalled();
        done();
      });
    });

  });

  describe('middleware execution', () => {
    test('should execute middleware with correct parameters', (done) => {
      const middleware = jest.fn((req, res, next) => {
        expect(req).toBeDefined();
        expect(res).toBeDefined();
        expect(typeof next).toBe('function');
        req.middlewareExecuted = true;
        next();
      });

      middlewareCore.use('test', middleware);

      const storedMiddleware = middlewareCore.middleware.get('test');
      const mockReq = { originalUrl: '/test' };
      const mockRes = { status: jest.fn() };
      const mockNext = jest.fn(() => {
        expect(middleware).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
        expect(mockReq.middlewareExecuted).toBe(true);
        expect(mockNext).toHaveBeenCalled();
        done();
      });
      storedMiddleware(mockReq, mockRes, mockNext);
    });

    test('should handle middleware that modifies request', (done) => {
      const authMiddleware = (req, res, next) => {
        req.user = { id: 1, name: 'Test User' };
        req.authenticated = true;
        next();
      };

      middlewareCore.use('auth', authMiddleware);

      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockRes = {};
      const mockNext = jest.fn(() => {
        expect(mockReq.user).toEqual({ id: 1, name: 'Test User' });
        expect(mockReq.authenticated).toBe(true);
        expect(mockNext).toHaveBeenCalled();
        done();
      });
      const storedMiddleware = middlewareCore.middleware.get('auth');
      storedMiddleware(mockReq, mockRes, mockNext);
    });

    test('should handle middleware that modifies response', (done) => {
      const corsMiddleware = (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        next();
      };

      middlewareCore.use('cors', corsMiddleware);

      const mockReq = {};
      const mockRes = { setHeader: jest.fn(), finished: false };
      const mockNext = jest.fn(() => {
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        expect(mockNext).toHaveBeenCalled();
        done();
      });
      const storedMiddleware = middlewareCore.middleware.get('cors');
      storedMiddleware(mockReq, mockRes, mockNext);
    });

    test('should handle async middleware', async () => {
      const asyncMiddleware = async (req, res, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        req.asyncProcessed = true;
        next();
      };

      middlewareCore.use('async', asyncMiddleware);

      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const storedMiddleware = middlewareCore.middleware.get('async');
      await storedMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.asyncProcessed).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle middleware that throws error in applyToRoute', (done) => {
      const errorMiddleware = jest.fn((req, res, next) => {
        throw new Error('Middleware error from applyToRoute');
      });
      middlewareCore.use('error', errorMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/error', ['error']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Middleware error from applyToRoute');
        expect(errorMiddleware).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe('middleware removal', () => {
    test('should remove middleware from collection', () => {
      const middleware = (req, res, next) => next();
      middlewareCore.use('test', middleware);

      expect(middlewareCore.middleware.has('test')).toBe(true);

      const result = middlewareCore.remove('test');

      expect(result).toBe(true);
      expect(middlewareCore.middleware.has('test')).toBe(false);
    });

    test('should handle removal of non-existent middleware', () => {
      const result = middlewareCore.remove('nonExistent');

      expect(result).toBe(false);
    });
  });

  describe('middleware listing', () => {
    test('should return list of registered middleware', () => {
      middlewareCore.use('auth', (req, res, next) => next());
      middlewareCore.use('logging', (req, res, next) => next());
      middlewareCore.use('validation', (req, res, next) => next());

      const names = middlewareCore.getMiddlewareNames();

      expect(names).toEqual(['auth', 'logging', 'validation']);
    });

    test('should return empty list when no middleware registered', () => {
      const names = middlewareCore.getMiddlewareNames();

      expect(names).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('should handle null or undefined middleware name', () => {
      const middleware = (req, res, next) => next();
      middlewareCore.use(null, middleware);
      middlewareCore.use(undefined, middleware);
      expect(middlewareCore.middleware.has(null)).toBe(true);
      expect(middlewareCore.middleware.has(undefined)).toBe(true);
    });

    test('should handle non-function middleware', (done) => {
      // MiddlewareCore позволяет добавлять не-функции, но они вызовут ошибку при выполнении
      const nonFunctionMiddleware = 'not a function';
      middlewareCore.use('invalid', nonFunctionMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['invalid']);

      const mockReq = {};
      const mockRes = {};
      routeHandler(mockReq, mockRes, (err) => {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toMatch(/is not a function/);
        done();
      });
    });

    test('should handle middleware without next parameter', (done) => {
      const brokenMiddleware = (req, res) => {
        req.processed = true;
        // Не вызываем next()
      };

      middlewareCore.use('broken', brokenMiddleware);

      const routeHandler = middlewareCore.applyToRoute('/api/test', ['broken']);

      const mockReq = {};
      const mockRes = {};
      // Ожидаем, что next не будет вызван, и routeHandler просто завершится
      routeHandler(mockReq, mockRes, () => {
        expect(mockReq.processed).toBe(true);
        done();
      });
    });
  });
});
