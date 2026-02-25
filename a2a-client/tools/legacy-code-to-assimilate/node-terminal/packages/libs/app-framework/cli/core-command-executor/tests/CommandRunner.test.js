import { EventEmitter } from 'events';
import { AppError, TimeoutError, CommandExecutionError } from '../CommandErrors.js';
import { CommandState } from '../CommandEnums.js';
import { CommandRunner } from '../CommandRunner.js';
import { ExecutionContext } from '../ExecutionContext.js';

// Mock execa to control command execution behavior
jest.mock('execa', () => {
  const { EventEmitter } = require('events');
  
  const mockExeca = jest.fn((command, options) => {
    const mockProcess = new EventEmitter();
    mockProcess.pid = 1000;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    let timeoutId;

    // Simulate command execution after a short delay
    setTimeout(() => {
      if (options.signal && options.signal.aborted) {
        mockProcess.emit('error', new Error('Command was cancelled'));
        mockProcess.exitCode = 1;
        mockProcess.killed = true;
        return;
      }

      if (command.includes('timeout')) {
        timeoutId = setTimeout(() => {
          mockProcess.emit('error', new Error('Command timed out'));
          mockProcess.timedOut = true;
          mockProcess.exitCode = 124;
        }, options.timeout || 100);
        return;
      }

      if (command.includes('exit 1') || command.includes('nonexistent_command')) {
        mockProcess.emit('error', new Error('Command failed'));
        mockProcess.exitCode = 1;
        mockProcess.failed = true;
      } else {
        if (command.includes('stdout')) {
          mockProcess.stdout.emit('data', Buffer.from("stdout test\n"));
        }
        if (command.includes('stderr')) {
          mockProcess.stderr.emit('data', Buffer.from("stderr test\n"));
        }
        if (command.includes('line 1')) {
          mockProcess.stdout.emit('data', Buffer.from("line 1\n"));
          mockProcess.stdout.emit('data', Buffer.from("line 2\n"));
        }
        if (command.includes('progress')) {
          mockProcess.stdout.emit('data', Buffer.from("progress 1\n"));
          mockProcess.stdout.emit('data', Buffer.from("progress 2\n"));
        }
        mockProcess.exitCode = 0;
      }
      clearTimeout(timeoutId);
      mockProcess.emit('close', mockProcess.exitCode);
    }, 50);

    const promise = new Promise((resolve, reject) => {
      mockProcess.on('close', (code) => {
        if (code === 0) {
          resolve(mockProcess);
        } else {
          reject(mockProcess);
        }
      });
      mockProcess.on('error', (err) => {
        reject(mockProcess);
      });
    });

    promise.stdout = mockProcess.stdout;
    promise.stderr = mockProcess.stderr;
    promise.pid = mockProcess.pid;
    promise.kill = jest.fn();
    return promise;
  });

  return {
    execa: mockExeca
  };
});

// Импортируем мок
import { execa } from 'execa';

describe('CommandRunner', () => {
  let runner;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      server: { timeout: 5000 },
      security: { maxCommandLength: 10000 }
    };
    runner = new CommandRunner(mockConfig);
    execa.mockClear();
  });

  describe('executeWithTimeout', () => {
    test('should execute a simple command successfully', async () => {
      const request = { command: 'echo hello' };
      const context = new ExecutionContext('id-1', request);

      const result = await runner.executeWithTimeout(context);

      expect(execa).toHaveBeenCalledWith(request.command, expect.any(Object));
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    test('should handle command execution failure', async () => {
      const request = { command: 'exit 1' };
      const context = new ExecutionContext('id-2', request);

      const result = await runner.executeWithTimeout(context);

      expect(execa).toHaveBeenCalledWith(request.command, expect.any(Object));
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    test('should handle command timeout', async () => {
      const request = { command: 'sleep 1000 timeout', timeout: 100 };
      const context = new ExecutionContext('id-3', request);

      const executePromise = runner.executeWithTimeout(context);

      await expect(executePromise).rejects.toThrow(TimeoutError);
      expect(execa).toHaveBeenCalledWith(request.command, expect.objectContaining({ timeout: 100 }));
    });

    test('should handle command cancellation', async () => {
      const request = { command: 'sleep 1000' };
      const context = new ExecutionContext('id-4', request);

      const executePromise = runner.executeWithTimeout(context);

      context.abortController.abort();

      await expect(executePromise).rejects.toThrow(AppError);
      expect(execa).toHaveBeenCalledWith(request.command, expect.any(Object));
    });

    test('should pass cwd option to execa', async () => {
      const request = { command: 'pwd', cwd: '/test-dir' };
      const context = new ExecutionContext('id-5', request);

      await runner.executeWithTimeout(context);

      expect(execa).toHaveBeenCalledWith(request.command, expect.objectContaining({
        cwd: '/test-dir'
      }));
    });

    test('should pass env options to execa', async () => {
      const request = { command: 'env', env: { TEST_VAR: 'test_value' } };
      const context = new ExecutionContext('id-6', request);

      await runner.executeWithTimeout(context);

      expect(execa).toHaveBeenCalledWith(request.command, expect.objectContaining({
        env: expect.objectContaining({ TEST_VAR: 'test_value' })
      }));
    });

    test('should use default timeout from config if not provided in request', async () => {
      const request = { command: 'echo default timeout' };
      const context = new ExecutionContext('id-7', request);

      await runner.executeWithTimeout(context);

      expect(execa).toHaveBeenCalledWith(request.command, expect.objectContaining({
        timeout: mockConfig.server.timeout
      }));
    });

    test('should return stdout and stderr in result on success', async () => {
      const request = { command: 'echo stdout && echo stderr >&2' };
      const context = new ExecutionContext('id-8', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.stdout).toContain("stdout test");
      expect(result.stderr).toContain("stderr test");
    });

    test('should include metadata in successful result', async () => {
      const request = { command: 'echo metadata' };
      const context = new ExecutionContext('id-9', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.platform).toBe(process.platform);
      expect(result.metadata.cwd).toBe(request.cwd || process.cwd());
      expect(result.metadata.pid).toBeDefined();
    });

    test('should include metadata in failed result', async () => {
      const request = { command: 'exit 1' };
      const context = new ExecutionContext('id-10', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.platform).toBe(process.platform);
      expect(result.metadata.cwd).toBe(request.cwd || process.cwd());
      expect(result.metadata.pid).toBeDefined();
      expect(result.metadata.killed).toBeDefined();
      expect(result.metadata.timedOut).toBeDefined();
      expect(result.metadata.signal).toBeDefined();
    });
  });

  describe('executeStreamInternal', () => {
    let mockStream;
    let emitStdoutSpy;
    let emitStderrSpy;

    beforeEach(() => {
      mockStream = new EventEmitter();
      emitStdoutSpy = jest.fn();
      emitStderrSpy = jest.fn();
    });

    test('should emit complete event on successful streaming execution', async () => {
      const request = { command: 'echo streaming test' };
      const context = new ExecutionContext('stream-id-1', request);

      const completePromise = new Promise(resolve => {
        mockStream.on('complete', resolve);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      const result = await completePromise;
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('stdout test');
      expect(emitStdoutSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'stream-id-1', data: expect.any(String) }));
      expect(mockStream.emit).toHaveBeenCalledWith('close');
    });

    test('should emit error event on streaming execution failure', async () => {
      const request = { command: 'invalid_command_xyz' };
      const context = new ExecutionContext('stream-id-2', request);

      const errorPromise = new Promise((resolve, reject) => {
        mockStream.on('error', reject);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      await expect(errorPromise).rejects.toBeDefined();
      expect(mockStream.emit).toHaveBeenCalledWith('close');
    });

    test('should emit stdout events during streaming', async () => {
      const request = { command: 'echo line 1 line 2' };
      const context = new ExecutionContext('stream-id-3', request);

      await new Promise(resolve => {
        let count = 0;
        emitStdoutSpy.mockImplementationOnce((data) => {
          expect(data.data).toContain('line 1');
          count++;
        }).mockImplementationOnce((data) => {
          expect(data.data).toContain('line 2');
          count++;
          resolve();
        });

        runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);
      });
      expect(emitStdoutSpy).toHaveBeenCalledTimes(2);
    });

    test('should emit stderr events during streaming', async () => {
      const request = { command: 'echo error line >&2' };
      const context = new ExecutionContext('stream-id-4', request);

      await new Promise(resolve => {
        emitStderrSpy.mockImplementationOnce((data) => {
          expect(data.data).toContain('stderr test');
          resolve();
        });
        runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);
      });
      expect(emitStderrSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle streaming timeout', async () => {
      const request = { command: 'sleep 1000 timeout', timeout: 100 };
      const context = new ExecutionContext('stream-id-5', request);

      const errorPromise = new Promise((resolve, reject) => {
        mockStream.on('error', reject);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      await expect(errorPromise).rejects.toThrow(TimeoutError);
      expect(mockStream.emit).toHaveBeenCalledWith('close');
    });

    test('should handle streaming cancellation', async () => {
      const request = { command: 'sleep 1000' };
      const context = new ExecutionContext('stream-id-6', request);

      const errorPromise = new Promise((resolve, reject) => {
        mockStream.on('error', reject);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      context.abortController.abort();

      await expect(errorPromise).rejects.toThrow(AppError);
      expect(mockStream.emit).toHaveBeenCalledWith('close');
    });

    test('should emit progress events for long-running commands', async () => {
      const request = { command: 'for i in {1..5}; do echo "progress $i"; sleep 0.1; done progress' };
      const context = new ExecutionContext('stream-id-7', request);

      await new Promise(resolve => {
        let progressCount = 0;
        emitStdoutSpy.mockImplementation(() => {
          progressCount++;
          if (progressCount >= 2) {
            resolve();
          }
        });
        runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);
      });
      expect(emitStdoutSpy).toHaveBeenCalledTimes(2);
    });

    test('should handle stream cancellation during execution', async () => {
      const request = { command: 'sleep 5' };
      const context = new ExecutionContext('stream-id-8', request);

      const errorPromise = new Promise((resolve, reject) => {
        mockStream.on('error', reject);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      context.abortController.abort();

      await expect(errorPromise).rejects.toThrow(AppError);
    });

    test('should handle stream with mixed stdout and stderr', async () => {
      const request = { command: 'echo "mixed output" && echo "mixed error" >&2' };
      const context = new ExecutionContext('stream-id-9', request);

      const completePromise = new Promise(resolve => {
        mockStream.on('complete', resolve);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      const result = await completePromise;
      expect(result.success).toBe(true);
      expect(emitStdoutSpy).toHaveBeenCalled();
      expect(emitStderrSpy).toHaveBeenCalled();
    });

    test('should handle stream with no output', async () => {
      const request = { command: 'true' };
      const context = new ExecutionContext('stream-id-10', request);

      const completePromise = new Promise(resolve => {
        mockStream.on('complete', resolve);
      });

      runner.executeStreamInternal(context, mockStream, emitStdoutSpy, emitStderrSpy);

      const result = await completePromise;
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle execa errors gracefully', async () => {
      const request = { command: 'nonexistent_command_xyz' };
      const context = new ExecutionContext('error-id-1', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    test('should handle process kill signals', async () => {
      const request = { command: 'sleep 10' };
      const context = new ExecutionContext('kill-id-1', request);

      const executePromise = runner.executeWithTimeout(context);
      
      context.abortController.abort();

      await expect(executePromise).rejects.toThrow(AppError);
    });

    test('should handle timeout with custom duration', async () => {
      const request = { command: 'sleep 1000 timeout', timeout: 50 };
      const context = new ExecutionContext('timeout-id-1', request);

      await expect(runner.executeWithTimeout(context)).rejects.toThrow(TimeoutError);
    });

    test('should preserve context state during execution', async () => {
      const request = { command: 'echo "context test"' };
      const context = new ExecutionContext('context-id-1', request);

      const result = await runner.executeWithTimeout(context);
      
      expect(context.id).toBe('context-id-1');
      expect(context.request).toBe(request);
      expect(context.state).toBeDefined();
      expect(result.id).toBe('context-id-1');
    });

    test('should handle large output efficiently', async () => {
      const request = { command: 'yes "large output" | head -1000' };
      const context = new ExecutionContext('large-id-1', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(1000);
    });

    test('should handle unicode output correctly', async () => {
      const request = { command: 'echo "тест с кириллицей 🚀"' };
      const context = new ExecutionContext('unicode-id-1', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('кириллицей');
    });
  });

  describe('configuration and options', () => {
    test('should use default timeout when not specified', async () => {
      const request = { command: 'echo "default timeout"' };
      const context = new ExecutionContext('default-id-1', request);

      await runner.executeWithTimeout(context);
      expect(execa).toHaveBeenCalledWith(
        request.command, 
        expect.objectContaining({ timeout: mockConfig.server.timeout })
      );
    });

    test('should merge environment variables correctly', async () => {
      const request = { 
        command: 'env', 
        env: { TEST_VAR: 'test_value' } 
      };
      const context = new ExecutionContext('env-id-1', request);

      await runner.executeWithTimeout(context);
      expect(execa).toHaveBeenCalledWith(
        request.command,
        expect.objectContaining({
          env: expect.objectContaining({ TEST_VAR: 'test_value' })
        })
      );
    });

    test('should handle empty environment variables', async () => {
      const request = { command: 'echo "empty env"', env: {} };
      const context = new ExecutionContext('empty-env-id-1', request);

      const result = await runner.executeWithTimeout(context);
      expect(result.success).toBe(true);
    });

    test('should handle null working directory', async () => {
      const request = { command: 'pwd', cwd: null };
      const context = new ExecutionContext('null-cwd-id-1', request);

      await runner.executeWithTimeout(context);
      expect(execa).toHaveBeenCalledWith(
        request.command,
        expect.objectContaining({ cwd: process.cwd() })
      );
    });

    test('should handle undefined working directory', async () => {
      const request = { command: 'pwd', cwd: undefined };
      const context = new ExecutionContext('undefined-cwd-id-1', request);

      await runner.executeWithTimeout(context);
      expect(execa).toHaveBeenCalledWith(
        request.command,
        expect.objectContaining({ cwd: process.cwd() })
      );
    });
  });
});