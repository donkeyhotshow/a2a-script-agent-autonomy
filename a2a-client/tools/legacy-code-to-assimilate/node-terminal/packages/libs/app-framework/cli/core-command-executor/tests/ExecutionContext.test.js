import { ExecutionContext } from '../ExecutionContext.js';
import { CommandState } from '../CommandEnums.js';

describe('ExecutionContext', () => {
  test('should initialize with correct properties', () => {
    const id = 'test-id';
    const request = { command: 'echo hello', cwd: '/tmp', timeout: 1000 };

    const context = new ExecutionContext(id, request);

    expect(context.id).toBe(id);
    expect(context.request).toEqual(request);
    expect(context.startTime).toBeInstanceOf(Date);
    expect(context.state).toBe(CommandState.PENDING);
    expect(context.abortController).toBeInstanceOf(AbortController);
    expect(context.subprocess).toBeNull();
    expect(context.stdout).toBe('');
    expect(context.stderr).toBe('');
  });

  test('should update state correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    expect(context.state).toBe(CommandState.PENDING);
    
    context.updateState(CommandState.RUNNING);
    expect(context.state).toBe(CommandState.RUNNING);
    
    context.updateState(CommandState.COMPLETED);
    expect(context.state).toBe(CommandState.COMPLETED);
  });

  test('should set subprocess correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    const mockSubprocess = { pid: 123 };
    
    context.setSubprocess(mockSubprocess);
    expect(context.subprocess).toBe(mockSubprocess);
  });

  test('should append stdout correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    expect(context.stdout).toBe('');
    
    context.appendStdout('hello');
    expect(context.stdout).toBe('hello');
    
    context.appendStdout(' world');
    expect(context.stdout).toBe('hello world');
  });

  test('should append stderr correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    expect(context.stderr).toBe('');
    
    context.appendStderr('error1');
    expect(context.stderr).toBe('error1');
    
    context.appendStderr('\nerror2');
    expect(context.stderr).toBe('error1\nerror2');
  });

  test('should calculate duration correctly', () => {
    const startTime = new Date();
    const context = new ExecutionContext('id', { command: 'test' });
    
    // Мокаем startTime для точного тестирования
    context.startTime = startTime;
    
    const duration = context.getDuration();
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  test('should handle abort controller correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    expect(context.abortController).toBeInstanceOf(AbortController);
    expect(context.abortController.signal.aborted).toBe(false);
    
    context.abortController.abort();
    expect(context.abortController.signal.aborted).toBe(true);
  });

  test('should handle empty stdout and stderr', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStdout('');
    context.appendStderr('');
    
    expect(context.stdout).toBe('');
    expect(context.stderr).toBe('');
  });

  test('should handle null/undefined subprocess', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.setSubprocess(null);
    expect(context.subprocess).toBeNull();
    
    context.setSubprocess(undefined);
    expect(context.subprocess).toBeUndefined();
  });

  test('should preserve request object', () => {
    const request = { 
      command: 'echo test', 
      cwd: '/tmp', 
      timeout: 5000,
      env: { TEST_VAR: 'value' }
    };
    const context = new ExecutionContext('id', request);
    
    expect(context.request).toBe(request);
    expect(context.request.command).toBe('echo test');
    expect(context.request.cwd).toBe('/tmp');
    expect(context.request.timeout).toBe(5000);
    expect(context.request.env).toEqual({ TEST_VAR: 'value' });
  });

  test('should handle state transitions correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    expect(context.state).toBe(CommandState.PENDING);
    
    context.updateState(CommandState.RUNNING);
    expect(context.state).toBe(CommandState.RUNNING);
    
    context.updateState(CommandState.COMPLETED);
    expect(context.state).toBe(CommandState.COMPLETED);
    
    context.updateState(CommandState.FAILED);
    expect(context.state).toBe(CommandState.FAILED);
    
    context.updateState(CommandState.CANCELLED);
    expect(context.state).toBe(CommandState.CANCELLED);
    
    context.updateState(CommandState.TIMEOUT);
    expect(context.state).toBe(CommandState.TIMEOUT);
  });

  test('should handle multiple stdout appends', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStdout('line1\n');
    context.appendStdout('line2\n');
    context.appendStdout('line3\n');
    
    expect(context.stdout).toBe('line1\nline2\nline3\n');
  });

  test('should handle multiple stderr appends', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStderr('error1\n');
    context.appendStderr('error2\n');
    context.appendStderr('error3\n');
    
    expect(context.stderr).toBe('error1\nerror2\nerror3\n');
  });

  test('should handle mixed stdout and stderr appends', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStdout('output1\n');
    context.appendStderr('error1\n');
    context.appendStdout('output2\n');
    context.appendStderr('error2\n');
    
    expect(context.stdout).toBe('output1\noutput2\n');
    expect(context.stderr).toBe('error1\nerror2\n');
  });

  test('should handle large output efficiently', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    const largeOutput = 'x'.repeat(10000);
    
    context.appendStdout(largeOutput);
    expect(context.stdout).toBe(largeOutput);
    expect(context.stdout.length).toBe(10000);
  });

  test('should handle unicode output correctly', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStdout('тест с кириллицей 🚀\n');
    context.appendStderr('ошибка с эмодзи ❌\n');
    
    expect(context.stdout).toBe('тест с кириллицей 🚀\n');
    expect(context.stderr).toBe('ошибка с эмодзи ❌\n');
  });

  test('should handle special characters in output', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    context.appendStdout(specialChars);
    
    expect(context.stdout).toBe(specialChars);
  });

  test('should handle newlines and tabs in output', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    const multilineOutput = 'line1\n\tindented line\nline2';
    context.appendStdout(multilineOutput);
    
    expect(context.stdout).toBe(multilineOutput);
  });

  test('should calculate duration accurately', () => {
    const startTime = new Date();
    const context = new ExecutionContext('id', { command: 'test' });
    
    // Мокаем startTime для точного тестирования
    context.startTime = startTime;
    
    // Ждем немного времени
    const waitTime = 100;
    setTimeout(() => {
      const duration = context.getDuration();
      expect(duration).toBeGreaterThanOrEqual(waitTime - 10); // допуск на погрешность
      expect(duration).toBeLessThan(waitTime + 50);
    }, waitTime);
  });

  test('should handle abort controller state changes', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    expect(context.abortController.signal.aborted).toBe(false);
    
    context.abortController.abort();
    expect(context.abortController.signal.aborted).toBe(true);
    
    // Попытка повторной отмены не должна вызывать ошибку
    expect(() => context.abortController.abort()).not.toThrow();
  });

  test('should handle subprocess with different properties', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    const mockSubprocess1 = { pid: 123, kill: jest.fn() };
    const mockSubprocess2 = { pid: 456, kill: jest.fn(), stdout: {}, stderr: {} };
    
    context.setSubprocess(mockSubprocess1);
    expect(context.subprocess).toBe(mockSubprocess1);
    
    context.setSubprocess(mockSubprocess2);
    expect(context.subprocess).toBe(mockSubprocess2);
  });

  test('should handle concurrent modifications safely', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    // Симулируем конкурентные модификации
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        new Promise(resolve => {
          setTimeout(() => {
            context.appendStdout(`line${i}\n`);
            context.appendStderr(`error${i}\n`);
            resolve();
          }, Math.random() * 10);
        })
      );
    }
    
    return Promise.all(promises).then(() => {
      expect(context.stdout.split('\n').length).toBeGreaterThan(90);
      expect(context.stderr.split('\n').length).toBeGreaterThan(90);
    });
  });

  test('should maintain immutability of request object', () => {
    const originalRequest = { command: 'echo test' };
    const context = new ExecutionContext('id', originalRequest);
    
    // Попытка изменить request не должна влиять на контекст
    originalRequest.command = 'modified command';
    
    expect(context.request.command).toBe('echo test'); // Должно остаться неизменным
  });

  test('should handle edge case with empty string appends', () => {
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.appendStdout('');
    context.appendStderr('');
    context.appendStdout('actual output');
    context.appendStderr('actual error');
    
    expect(context.stdout).toBe('actual output');
    expect(context.stderr).toBe('actual error');
  });

  test('should handle very long duration calculations', () => {
    const pastTime = new Date(Date.now() - 86400000); // 24 часа назад
    const context = new ExecutionContext('id', { command: 'test' });
    
    context.startTime = pastTime;
    const duration = context.getDuration();
    
    expect(duration).toBeGreaterThan(86400000); // более 24 часов
    expect(duration).toBeLessThan(86400000 + 1000); // с небольшим допуском
  });
});
