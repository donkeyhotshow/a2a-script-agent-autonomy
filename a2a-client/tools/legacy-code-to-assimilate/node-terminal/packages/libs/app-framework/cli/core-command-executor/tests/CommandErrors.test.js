import {
  AppError,
  TimeoutError,
  CommandExecutionError
} from '../CommandErrors.js';

describe('CommandErrors', () => {
  describe('AppError', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { field: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error).toBeInstanceOf(Error);
    });

    test('should create AppError with default values', () => {
      const error = new AppError('Default error');
      expect(error.code).toBe('APP_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({});
    });

    test('should inherit from Error', () => {
      const error = new AppError('Test error');
      expect(error).toBeInstanceOf(Error);
    });

    test('should be serializable to JSON', () => {
      const error = new AppError('Serializable error', 'SERIALIZE_TEST', 400, { data: 'test' });
      const serialized = JSON.stringify(error);

      const parsed = JSON.parse(serialized);
      expect(parsed.message).toBe('Serializable error');
      expect(parsed.code).toBe('SERIALIZE_TEST');
      expect(parsed.statusCode).toBe(400);
      expect(parsed.details).toEqual({ data: 'test' });
    });

    test('should not expose stack trace in JSON by default', () => {
      const error = new AppError('No stack in JSON');
      const json = error.toJSON();
      expect(json).not.toHaveProperty('stack');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('name');
    });
  });

  describe('TimeoutError', () => {
    test('should create TimeoutError with custom message', () => {
      const error = new TimeoutError('Custom timeout message');

      expect(error.message).toBe('Custom timeout message');
      expect(error.name).toBe('TimeoutError');
      expect(error).toBeInstanceOf(Error);
    });

    test('should create TimeoutError with default message', () => {
      const error = new TimeoutError();
      expect(error.message).toBe('Operation timed out');
      expect(error.name).toBe('TimeoutError');
    });

    test('should inherit from Error', () => {
      const error = new TimeoutError();
      expect(error).toBeInstanceOf(Error);
    });

    test('should be serializable to JSON', () => {
      const error = new TimeoutError('Test timeout');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);
      expect(parsed.message).toBe('Test timeout');
      expect(parsed.name).toBe('TimeoutError');
    });
  });

  describe('CommandExecutionError', () => {
    test('should create CommandExecutionError with correct properties', () => {
      const error = new CommandExecutionError('Execution failed', 'EXEC_FAILED', 500, { pid: 123 });

      expect(error.message).toBe('Execution failed');
      expect(error.code).toBe('EXEC_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ pid: 123 });
      expect(error).toBeInstanceOf(AppError);
    });

    test('should create CommandExecutionError with default values', () => {
      const error = new CommandExecutionError('Execution failed');
      expect(error.code).toBe('COMMAND_EXECUTION_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({});
    });

    test('should inherit from AppError', () => {
      const error = new CommandExecutionError('Execution failed');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  test('should have correct error inheritance chain', () => {
    const appError = new AppError('App error');
    const timeoutError = new TimeoutError('Timeout error');
    const commandError = new CommandExecutionError('Command error');

    expect(commandError).toBeInstanceOf(AppError);
    expect(commandError).toBeInstanceOf(Error);
    expect(timeoutError).toBeInstanceOf(Error);
    expect(appError).toBeInstanceOf(Error);
  });

  test('should handle error details correctly', () => {
    const details = { pid: 123, signal: 'SIGTERM', exitCode: 1 };
    const error = new AppError('Test error', 'TEST_CODE', 500, details);
    
    expect(error.details).toEqual(details);
    expect(error.details.pid).toBe(123);
    expect(error.details.signal).toBe('SIGTERM');
  });

  test('should handle empty error details', () => {
    const error = new AppError('Test error');
    expect(error.details).toEqual({});
  });

  test('should handle null error details', () => {
    const error = new AppError('Test error', 'TEST_CODE', 500, null);
    expect(error.details).toBeNull();
  });

  test('should preserve error stack trace', () => {
    const error = new AppError('Test error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
    expect(error.stack).toContain('Test error');
  });
});
