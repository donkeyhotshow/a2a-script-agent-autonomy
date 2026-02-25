import { ResponseTransformer } from '../../src/ResponseTransformer.js';

describe('ResponseTransformer', () => {
  let responseTransformer;
  let mockLogger;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    
    responseTransformer = new ResponseTransformer({ logger: mockLogger });
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should initialize with a logger', () => {
    expect(responseTransformer.logger).toBe(mockLogger);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test('should log a warning if initialized without a logger', () => {
    const transformerWithoutLogger = new ResponseTransformer();
    expect(consoleWarnSpy).toHaveBeenCalledWith("ResponseTransformer инициализирован без логгера. Логирование будет ограничено.");
  });

  describe('transform', () => {
    test('should transform response data successfully', () => {
      const data = { success: true, data: { id: 1, name: 'John' } };
      const transformFn = (data) => ({
        ...data,
        timestamp: Date.now(),
        processed: true,
      });

      const result = responseTransformer.transform(data, transformFn);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'John' });
      expect(result.timestamp).toBeDefined();
      expect(result.processed).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Данные ответа успешно трансформированы.',
        expect.objectContaining({ original: data, transformed: result })
      );
    });

    test('should return original data if transformFn is not a function', () => {
      const data = { success: true };
      const result = responseTransformer.transform(data, 'not a function');

      expect(result).toBe(data);
      expect(mockLogger.warn).toHaveBeenCalledWith("transformFn не является функцией. Данные будут возвращены без изменений.");
    });

    test('should handle errors in transform function', () => {
      const data = { success: true };
      const transformFn = () => {
        throw new Error('Transform error');
      };

      expect(() => responseTransformer.transform(data, transformFn)).toThrow('Ошибка трансформации ответа: Transform error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Ошибка трансформации данных ответа: Transform error',
        expect.objectContaining({ data, error: expect.any(Error) })
      );
    });

    test('should handle null data', () => {
      const transformFn = (data) => data;
      const result = responseTransformer.transform(null, transformFn);

      expect(result).toBeNull();
    });

    test('should handle undefined data', () => {
      const transformFn = (data) => data;
      const result = responseTransformer.transform(undefined, transformFn);

      expect(result).toBeUndefined();
    });

    test('should handle complex nested data', () => {
      const data = {
        success: true,
        data: {
          users: [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' }
          ],
          meta: {
            total: 2,
            page: 1
          }
        }
      };
      const transformFn = (data) => ({
        ...data,
        data: {
          ...data.data,
          users: data.data.users.map(user => ({
            ...user,
            name: user.name.toUpperCase()
          }))
        }
      });

      const result = responseTransformer.transform(data, transformFn);

      expect(result.data.users[0].name).toBe('JOHN');
      expect(result.data.users[1].name).toBe('JANE');
      expect(result.data.meta).toEqual({ total: 2, page: 1 });
    });
  });

  describe('transformationMiddleware', () => {
    test('should transform response and call next if successful', async () => {
      const mockContext = { requestId: 'req1' };
      const mockNext = jest.fn(async () => ({ success: true, data: 'test' }));
      const transformFn = (data) => ({
        ...data,
        timestamp: Date.now(),
        processed: true,
      });

      const middleware = responseTransformer.transformationMiddleware(transformFn);
      const result = await middleware(mockContext, mockNext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
      expect(result.timestamp).toBeDefined();
      expect(result.processed).toBe(true);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should throw a 500 error if transformation fails in middleware', async () => {
      const mockContext = { requestId: 'req2' };
      const mockNext = jest.fn(async () => ({ success: true }));
      const transformFn = () => {
        throw new Error('Transform error');
      };

      const middleware = responseTransformer.transformationMiddleware(transformFn);

      let error;
      try {
        await middleware(mockContext, mockNext);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Ошибка преобразования исходящих данных: Transform error');
      expect(error.statusCode).toBe(500);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Response transformation failed: Transform error',
        expect.objectContaining({ requestId: 'req2', error: expect.any(Error) })
      );
    });

    test('should handle middleware with non-function transformFn', async () => {
      const mockContext = { requestId: 'req3' };
      const mockNext = jest.fn(async () => ({ success: true, data: 'test' }));

      const middleware = responseTransformer.transformationMiddleware('not a function');
      const result = await middleware(mockContext, mockNext);

      expect(result).toEqual({ success: true, data: 'test' }); // Не изменен
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith("transformFn не является функцией. Данные будут возвращены без изменений.");
    });

    test('should handle middleware with null context', async () => {
      const mockNext = jest.fn(async () => ({ success: true }));
      const transformFn = (data) => data;

      const middleware = responseTransformer.transformationMiddleware(transformFn);

      let error;
      try {
        await middleware(null, mockNext);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Ошибка преобразования исходящих данных');
      expect(error.statusCode).toBe(500);
    });

    test('should handle middleware when next throws an error', async () => {
      const mockContext = { requestId: 'req4' };
      const mockNext = jest.fn(async () => {
        throw new Error('Next error');
      });
      const transformFn = (data) => data;

      const middleware = responseTransformer.transformationMiddleware(transformFn);

      let error;
      try {
        await middleware(mockContext, mockNext);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Next error');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should handle middleware with async transform function', async () => {
      const mockContext = { requestId: 'req5' };
      const mockNext = jest.fn(async () => ({ success: true, data: 'test' }));
      const transformFn = async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          ...data,
          asyncProcessed: true,
        };
      };

      const middleware = responseTransformer.transformationMiddleware(transformFn);
      const result = await middleware(mockContext, mockNext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
      expect(result.asyncProcessed).toBe(true);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});