import StructuredLogger from '../StructuredLogger.js';
import { CommandState } from '../CommandEnums.js';

describe('StructuredLogger', () => {
  let mockLogger;
  let structuredLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    structuredLogger = new StructuredLogger(mockLogger);
  });

  test('should log command execution states', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo test',
      state: CommandState.PENDING
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution started',
      expect.objectContaining({
        type: 'command_execution',
        id: 'test-id',
        state: CommandState.PENDING
      })
    );
  });

  test('should log error states appropriately', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'bad command',
      state: CommandState.FAILED,
      error: new Error('Test error')
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Command execution failed',
      expect.objectContaining({
        type: 'command_execution',
        state: CommandState.FAILED
      })
    );
  });

  test('should log completed states', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo success',
      state: CommandState.COMPLETED,
      duration: 100
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution completed',
      expect.objectContaining({
        type: 'command_execution',
        state: CommandState.COMPLETED,
        duration: 100
      })
    );
  });

  test('should log cancelled states', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'sleep 10',
      state: CommandState.CANCELLED
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Command execution cancelled',
      expect.objectContaining({
        type: 'command_execution',
        state: CommandState.CANCELLED
      })
    );
  });

  test('should log timeout states', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'sleep 10',
      state: CommandState.TIMEOUT
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Command execution timed out',
      expect.objectContaining({
        type: 'command_execution',
        state: CommandState.TIMEOUT
      })
    );
  });

  test('should handle unknown state gracefully', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo test',
      state: 'unknown_state'
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution state change',
      expect.objectContaining({
        type: 'command_execution',
        state: 'unknown_state'
      })
    );
  });

  test('should include all provided data in log', () => {
    const logData = {
      id: 'test-id',
      command: 'echo test',
      state: CommandState.COMPLETED,
      duration: 150,
      exitCode: 0,
      stdout: 'test output',
      stderr: '',
      metadata: { platform: 'linux' }
    };

    structuredLogger.logCommand(logData);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution completed',
      expect.objectContaining(logData)
    );
  });

  test('should add timestamp to log data', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo test',
      state: CommandState.PENDING
    });

    const logCall = mockLogger.info.mock.calls[0];
    const logData = logCall[1];
    
    expect(logData.timestamp).toBeDefined();
    expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('should handle error objects in log data', () => {
    const error = new Error('Test error');
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'bad command',
      state: CommandState.FAILED,
      error: error
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Command execution failed',
      expect.objectContaining({
        error: error
      })
    );
  });

  test('should include command metadata in logs', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo test',
      state: CommandState.RUNNING,
      cwd: '/tmp',
      timeout: 5000
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution running',
      expect.objectContaining({
        cwd: '/tmp',
        timeout: 5000
      })
    );
  });

  test('should handle missing optional fields', () => {
    structuredLogger.logCommand({
      id: 'test-id',
      command: 'echo test',
      state: CommandState.PENDING
    });

    expect(mockLogger.info).toHaveBeenCalled();
  });

  test('should handle null logger without throwing', () => {
    const nullStructuredLogger = new StructuredLogger(null);
    expect(() => {
      nullStructuredLogger.logCommand({
        id: 'test-id',
        command: 'echo test',
        state: CommandState.PENDING
      });
    }).not.toThrow();
  });

  test('should handle undefined logger without throwing', () => {
    const undefinedStructuredLogger = new StructuredLogger(undefined);
    expect(() => {
      undefinedStructuredLogger.logCommand({
        id: 'test-id',
        command: 'echo test',
        state: CommandState.PENDING
      });
    }).not.toThrow();
  });

  test('should log different levels correctly based on state', () => {
    structuredLogger.logCommand({ id: 'id1', command: 'cmd1', state: CommandState.PENDING });
    expect(mockLogger.info).toHaveBeenCalled();
    mockLogger.info.mockClear();

    structuredLogger.logCommand({ id: 'id2', command: 'cmd2', state: CommandState.RUNNING });
    expect(mockLogger.info).toHaveBeenCalled();
    mockLogger.info.mockClear();

    structuredLogger.logCommand({ id: 'id3', command: 'cmd3', state: CommandState.COMPLETED });
    expect(mockLogger.info).toHaveBeenCalled();
    mockLogger.info.mockClear();

    structuredLogger.logCommand({ id: 'id4', command: 'cmd4', state: CommandState.FAILED, error: new Error('fail') });
    expect(mockLogger.error).toHaveBeenCalled();
    mockLogger.error.mockClear();

    structuredLogger.logCommand({ id: 'id5', command: 'cmd5', state: CommandState.CANCELLED });
    expect(mockLogger.warn).toHaveBeenCalled();
    mockLogger.warn.mockClear();

    structuredLogger.logCommand({ id: 'id6', command: 'cmd6', state: CommandState.TIMEOUT });
    expect(mockLogger.error).toHaveBeenCalled();
    mockLogger.error.mockClear();
  });

  test('should handle complex log data structures', () => {
    const complexData = {
      id: 'complex-id',
      command: 'echo "complex test"',
      state: CommandState.COMPLETED,
      duration: 150,
      exitCode: 0,
      stdout: 'complex output\nwith multiple lines',
      stderr: '',
      metadata: {
        platform: 'linux',
        cwd: '/tmp',
        pid: 12345,
        env: { NODE_ENV: 'test' }
      },
      customField: 'custom value'
    };

    structuredLogger.logCommand(complexData);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution completed',
      expect.objectContaining({
        ...complexData,
        type: 'command_execution',
        timestamp: expect.any(String)
      })
    );
  });

  test('should handle circular references in log data', () => {
    const circularData = {
      id: 'circular-id',
      command: 'echo "circular test"',
      state: CommandState.COMPLETED
    };
    
    // Создаем циклическую ссылку
    circularData.self = circularData;

    expect(() => {
      structuredLogger.logCommand(circularData);
    }).not.toThrow();

    expect(mockLogger.info).toHaveBeenCalled();
  });

  test('should handle very large log data', () => {
    const largeData = {
      id: 'large-id',
      command: 'echo "large test"',
      state: CommandState.COMPLETED,
      stdout: 'x'.repeat(100000), // 100KB строка
      metadata: {
        largeArray: Array.from({ length: 1000 }, (_, i) => `item${i}`)
      }
    };

    expect(() => {
      structuredLogger.logCommand(largeData);
    }).not.toThrow();

    expect(mockLogger.info).toHaveBeenCalled();
  });

  test('should handle unicode characters in log data', () => {
    const unicodeData = {
      id: 'unicode-id',
      command: 'echo "тест с кириллицей 🚀"',
      state: CommandState.COMPLETED,
      stdout: 'тест с кириллицей 🚀',
      metadata: {
        unicodeField: 'тест с эмодзи ❌✅'
      }
    };

    structuredLogger.logCommand(unicodeData);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution completed',
      expect.objectContaining({
        stdout: 'тест с кириллицей 🚀',
        metadata: expect.objectContaining({
          unicodeField: 'тест с эмодзи ❌✅'
        })
      })
    );
  });

  test('should handle special characters in log data', () => {
    const specialData = {
      id: 'special-id',
      command: 'echo "special chars: !@#$%^&*()"',
      state: CommandState.COMPLETED,
      stdout: 'special chars: !@#$%^&*()',
      metadata: {
        specialField: 'value with "quotes" and \'apostrophes\''
      }
    };

    structuredLogger.logCommand(specialData);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command execution completed',
      expect.objectContaining({
        stdout: 'special chars: !@#$%^&*()',
        metadata: expect.objectContaining({
          specialField: 'value with "quotes" and \'apostrophes\''
        })
      })
    );
  });

  test('should handle null and undefined values in log data', () => {
    const nullData = {
      id: 'null-id',
      command: 'echo "null test"',
      state: CommandState.COMPLETED,
      stdout: null,
      stderr: undefined,
      metadata: {
        nullField: null,
        undefinedField: undefined,
        emptyString: '',
        zeroValue: 0,
        falseValue: false
      }
    };

    expect(() => {
      structuredLogger.logCommand(nullData);
    }).not.toThrow();

    expect(mockLogger.info).toHaveBeenCalled();
  });

  test('should handle multiple rapid log calls', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      structuredLogger.logCommand({
        id: `rapid-id-${i}`,
        command: `echo "rapid test ${i}"`,
        state: CommandState.COMPLETED
      });
    }
    
    const endTime = Date.now();
    
    expect(mockLogger.info).toHaveBeenCalledTimes(1000);
    expect(endTime - startTime).toBeLessThan(1000); // менее 1 секунды
  });

  test('should handle concurrent log calls safely', async () => {
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        new Promise(resolve => {
          setTimeout(() => {
            structuredLogger.logCommand({
              id: `concurrent-id-${i}`,
              command: `echo "concurrent test ${i}"`,
              state: CommandState.COMPLETED
            });
            resolve();
          }, Math.random() * 10);
        })
      );
    }
    
    await Promise.all(promises);
    
    expect(mockLogger.info).toHaveBeenCalledTimes(100);
  });

  test('should handle logger methods that throw errors', () => {
    const errorLogger = {
      info: jest.fn().mockImplementation(() => {
        throw new Error('Logger error');
      }),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    const errorStructuredLogger = new StructuredLogger(errorLogger);
    
    expect(() => {
      errorStructuredLogger.logCommand({
        id: 'error-id',
        command: 'echo "error test"',
        state: CommandState.COMPLETED
      });
    }).toThrow('Logger error');
  });

  test('should handle logger with missing methods', () => {
    const incompleteLogger = {
      info: jest.fn()
      // Отсутствуют warn и error методы
    };
    
    const incompleteStructuredLogger = new StructuredLogger(incompleteLogger);
    
    expect(() => {
      incompleteStructuredLogger.logCommand({
        id: 'incomplete-id',
        command: 'echo "incomplete test"',
        state: CommandState.FAILED
      });
    }).toThrow();
  });

  test('should handle logger with non-function methods', () => {
    const invalidLogger = {
      info: 'not a function',
      warn: null,
      error: undefined
    };
    
    const invalidStructuredLogger = new StructuredLogger(invalidLogger);
    
    expect(() => {
      invalidStructuredLogger.logCommand({
        id: 'invalid-id',
        command: 'echo "invalid test"',
        state: CommandState.COMPLETED
      });
    }).toThrow();
  });

  test('should preserve original log data immutability', () => {
    const originalData = {
      id: 'immutable-id',
      command: 'echo "immutable test"',
      state: CommandState.COMPLETED
    };
    
    const originalDataCopy = { ...originalData };
    
    structuredLogger.logCommand(originalData);
    
    // Проверяем, что исходные данные не изменились
    expect(originalData).toEqual(originalDataCopy);
  });

  test('should handle different timestamp formats', () => {
    const data = {
      id: 'timestamp-id',
      command: 'echo "timestamp test"',
      state: CommandState.COMPLETED,
      timestamp: new Date('2023-01-01T00:00:00.000Z')
    };
    
    structuredLogger.logCommand(data);
    
    const logCall = mockLogger.info.mock.calls[0];
    const logData = logCall[1];
    
    // Проверяем, что timestamp перезаписывается текущим временем
    expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(logData.timestamp).not.toBe('2023-01-01T00:00:00.000Z');
  });
});
