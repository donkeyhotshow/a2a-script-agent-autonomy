import { ErrorHandlerIntegration } from '../../src/ErrorHandlerIntegration.js';

describe('ErrorHandlerIntegration', () => {
    let errorHandlerIntegration;
    let mockErrorHandler;

    beforeEach(() => {
        mockErrorHandler = {
            handle: jest.fn(),
        };
        
    errorHandlerIntegration = new ErrorHandlerIntegration(mockErrorHandler);
    });

    afterEach(() => {
    jest.clearAllMocks();
    });

  test('should initialize with an error handler', () => {
        expect(errorHandlerIntegration.errorHandler).toBe(mockErrorHandler);
  });

  test('should throw an error if initialized without an error handler', () => {
    expect(() => new ErrorHandlerIntegration()).toThrow("ErrorHandler instance is required for ErrorHandlerIntegration.");
  });

  test('should throw an error if initialized with null error handler', () => {
    expect(() => new ErrorHandlerIntegration(null)).toThrow("ErrorHandler instance is required for ErrorHandlerIntegration.");
  });

  test('should throw an error if initialized with undefined error handler', () => {
    expect(() => new ErrorHandlerIntegration(undefined)).toThrow("ErrorHandler instance is required for ErrorHandlerIntegration.");
  });

  describe('registerGlobalErrorHandler', () => {
    test('should register global error handler middleware', () => {
      const mockApp = {
        use: jest.fn(),
      };

      errorHandlerIntegration.registerGlobalErrorHandler(mockApp);

      expect(mockApp.use).toHaveBeenCalledTimes(1);
      expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle errors in global error handler middleware', () => {
      const mockApp = {
        use: jest.fn(),
      };

      errorHandlerIntegration.registerGlobalErrorHandler(mockApp);

      const middleware = mockApp.use.mock.calls[0][0];
      const mockReq = {};
      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();
      const error = new Error('Test error');

      middleware(error, mockReq, mockRes, mockNext);

      expect(mockErrorHandler.handle).toHaveBeenCalledWith(error, { req: mockReq, res: mockRes, next: mockNext });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
    });

    test('should not send response if headers already sent', () => {
      const mockApp = {
        use: jest.fn(),
      };

      errorHandlerIntegration.registerGlobalErrorHandler(mockApp);

      const middleware = mockApp.use.mock.calls[0][0];
      const mockReq = {};
      const mockRes = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();
        const error = new Error('Test error');

      middleware(error, mockReq, mockRes, mockNext);

      expect(mockErrorHandler.handle).toHaveBeenCalledWith(error, { req: mockReq, res: mockRes, next: mockNext });
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });

  describe('catchAsync', () => {
    test('should wrap async function and handle successful execution', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);

      const mockReq = {};
      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();

      const result = await wrappedFn(mockReq, mockRes, mockNext);

      expect(result).toBe('success');
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockErrorHandler.handle).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    test('should wrap async function and handle errors', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);

      const mockReq = {};
      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.any(Error), { req: mockReq, res: mockRes, next: mockNext });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
    });

    test('should not send response if headers already sent in catchAsync', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
            const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);
            
            const mockReq = {};
      const mockRes = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
            const mockNext = jest.fn();
        
            await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.any(Error), { req: mockReq, res: mockRes, next: mockNext });
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    test('should handle async function without res parameter', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
            const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);
        
            const mockReq = {};
            const mockNext = jest.fn();

      await wrappedFn(mockReq, null, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, null, mockNext);
      expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.any(Error), { req: mockReq, res: null, next: mockNext });
    });

    test('should handle async function with undefined res parameter', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);

            const mockReq = {};
            const mockNext = jest.fn();

      await wrappedFn(mockReq, undefined, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, undefined, mockNext);
      expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.any(Error), { req: mockReq, res: undefined, next: mockNext });
    });

    test('should handle async function that returns a promise', async () => {
      const asyncFn = jest.fn().mockResolvedValue(Promise.resolve('promise result'));
      const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);

      const mockReq = {};
      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();

      const result = await wrappedFn(mockReq, mockRes, mockNext);

      expect(result).toBe('promise result');
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockErrorHandler.handle).not.toHaveBeenCalled();
    });

    test('should handle async function that rejects with a promise', async () => {
      const asyncFn = jest.fn().mockRejectedValue(Promise.reject(new Error('Promise error')));
      const wrappedFn = errorHandlerIntegration.catchAsync(asyncFn);

            const mockReq = {};
      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
            const mockNext = jest.fn();

      await wrappedFn(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.any(Error), { req: mockReq, res: mockRes, next: mockNext });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith("Internal Server Error");
    });
});
});