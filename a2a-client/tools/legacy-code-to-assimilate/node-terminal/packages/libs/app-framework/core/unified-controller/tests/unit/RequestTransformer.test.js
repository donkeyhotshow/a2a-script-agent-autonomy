import { RequestTransformer } from '../../src/RequestTransformer.js';

describe('RequestTransformer', () => {
  let requestTransformer;
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
    
    requestTransformer = new RequestTransformer({ logger: mockLogger });
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should initialize with a logger', () => {
    expect(requestTransformer.logger).toBe(mockLogger);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test('should log a warning if initialized without a logger', () => {
    const transformerWithoutLogger = new RequestTransformer();
    expect(consoleWarnSpy).toHaveBeenCalledWith("RequestTransformer инициализирован без логгера. Логирование будет ограничено.");
  });

  describe('transform', () => {
    test('should transform data successfully', () => {
      const data = { name: 'john', email: 'JOHN@EXAMPLE.COM' };
      const transformFn = (data) => ({
        ...data,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        email: data.email.toLowerCase(),
      });

      const result = requestTransformer.transform(data, transformFn);

      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Данные запроса успешно трансформированы.',
        expect.objectContaining({ original: data, transformed: result })
      );
    });

    test('should return original data if transformFn is not a function', () => {
      const data = { name: 'john' };
      const result = requestTransformer.transform(data, 'not a function');

      expect(result).toBe(data);
      expect(mockLogger.warn).toHaveBeenCalledWith("transformFn не является функцией. Данные будут возвращены без изменений.");
    });

    test('should handle errors in transform function', () => {
      const data = { name: 'john' };
      const transformFn = () => {
        throw new Error('Transform error');
      };

      expect(() => requestTransformer.transform(data, transformFn)).toThrow('Ошибка трансформации запроса: Transform error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Ошибка трансформации данных запроса: Transform error',
        expect.objectContaining({ data, error: expect.any(Error) })
      );
    });

    test('should handle null data', () => {
      const transformFn = (data) => data;
      const result = requestTransformer.transform(null, transformFn);

      expect(result).toBeNull();
    });

    test('should handle undefined data', () => {
      const transformFn = (data) => data;
      const result = requestTransformer.transform(undefined, transformFn);

      expect(result).toBeUndefined();
    });
  });

  describe('transformationMiddleware', () => {
    test('should transform request params and call next if successful', async () => {
      const mockContext = { requestId: 'req1', params: { name: 'john' } };
      const mockNext = jest.fn(async () => ({ status: 'success' }));
      const transformFn = (data) => ({
        ...data,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      });

      const middleware = requestTransformer.transformationMiddleware(transformFn);
      const result = await middleware(mockContext, mockNext);

      expect(mockContext.params.name).toBe('John');
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'success' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request transformation successful.',
        expect.objectContaining({ requestId: 'req1' })
      );
    });

    test('should throw a 400 error if transformation fails in middleware', async () => {
      const mockContext = { requestId: 'req2', params: { name: 'john' } };
      const mockNext = jest.fn(async () => {});
      const transformFn = () => {
        throw new Error('Transform error');
      };

      const middleware = requestTransformer.transformationMiddleware(transformFn);

      let error;
      try {
        await middleware(mockContext, mockNext);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Ошибка преобразования входных данных: Transform error');
      expect(error.statusCode).toBe(400);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request transformation failed: Transform error',
        expect.objectContaining({ requestId: 'req2', error: expect.any(Error) })
      );
    });

    test('should handle middleware with non-function transformFn', async () => {
      const mockContext = { requestId: 'req3', params: { name: 'john' } };
      const mockNext = jest.fn(async () => ({ status: 'success' }));

      const middleware = requestTransformer.transformationMiddleware('not a function');
      const result = await middleware(mockContext, mockNext);

      expect(mockContext.params).toEqual({ name: 'john' }); // Не изменены
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'success' });
      expect(mockLogger.warn).toHaveBeenCalledWith("transformFn не является функцией. Данные будут возвращены без изменений.");
    });

    test('should handle middleware with null context', async () => {
      const mockNext = jest.fn(async () => ({ status: 'success' }));
      const transformFn = (data) => data;

      const middleware = requestTransformer.transformationMiddleware(transformFn);

      let error;
      try {
        await middleware(null, mockNext);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Ошибка преобразования входных данных');
      expect(error.statusCode).toBe(400);
    });
  });
});