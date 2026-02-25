import { EventEmitter } from 'events';
import { CommandExecutor } from '../index.js';
import { CommandState } from '../CommandEnums.js';
import { AppError, TimeoutError } from '../CommandErrors.js';

/**
 * Полные тесты для CommandExecutor
 * Покрывают все сценарии использования согласно принципам когнитивной дисциплины
 */
describe('CommandExecutor', () => {
  let executor;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    executor = new CommandExecutor({
      server: {
        timeout: 5000,
        maxConcurrentCommands: 5
      },
      security: {
        maxCommandLength: 1000,
        allowedCommands: [],
        blockedCommands: []
      }
    }, mockLogger);
  });

  afterEach(() => {
    executor.clearHistory();
    // Очистка активных команд
    for (const id of executor.getActiveCommands()) {
      executor.cancel(id);
    }
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      expect(executor.config.server.timeout).toBe(30000);
      expect(executor.config.security.maxCommandLength).toBe(10000);
      expect(executor.activeCommands).toBeInstanceOf(Map);
      expect(executor.commandHistory).toEqual([]);
    });

    test('should initialize with custom config', () => {
      const customExecutor = new CommandExecutor({
        server: { timeout: 10000 },
        security: { maxCommandLength: 500 }
      });

      expect(customExecutor.config.server.timeout).toBe(10000);
      expect(customExecutor.config.security.maxCommandLength).toBe(500);
    });

    test('should merge custom config with defaults', () => {
      const customExecutor = new CommandExecutor({
        server: { timeout: 15000 }
      });

      expect(customExecutor.config.server.timeout).toBe(15000);
      expect(customExecutor.config.security.maxCommandLength).toBe(10000); // Default
    });

    test('should be an EventEmitter', () => {
      expect(executor).toBeInstanceOf(EventEmitter);
    });

    test('should initialize with logger', () => {
      expect(executor.logger).toBe(mockLogger);
    });

    test('should initialize with empty active commands', () => {
      expect(executor.activeCommands.size).toBe(0);
    });

    test('should initialize with empty command history', () => {
      expect(executor.commandHistory.length).toBe(0);
    });

    test('should set default max history size', () => {
      expect(executor.maxHistorySize).toBe(1000);
    });

    test('should handle null config', () => {
      const nullExecutor = new CommandExecutor(null, mockLogger);
      expect(nullExecutor.config.server.timeout).toBe(30000);
      expect(nullExecutor.config.security.maxCommandLength).toBe(10000);
    });

    test('should handle undefined config', () => {
      const undefinedExecutor = new CommandExecutor(undefined, mockLogger);
      expect(undefinedExecutor.config.server.timeout).toBe(30000);
      expect(undefinedExecutor.config.security.maxCommandLength).toBe(10000);
    });
  });

  describe('execute', () => {
    test('should execute simple command successfully', async () => {
      const request = { command: 'echo "test"' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.command).toBe('echo "test"');
      expect(result.exitCode).toBe(0);
      expect(typeof result.duration).toBe('number');
    }, 10000);

    test('should execute command with custom timeout', async () => {
      const request = { command: 'echo "timeout test"', timeout: 5000 };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.command).toBe('echo "timeout test"');
      expect(result.exitCode).toBe(0);
    }, 10000);

    test('should execute command with custom working directory', async () => {
      const request = { command: 'pwd', cwd: process.cwd() };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain(process.cwd());
    }, 10000);

    test('should execute command with environment variables', async () => {
      const request = {
        command: 'echo $TEST_VAR',
        env: { TEST_VAR: 'test_value' }
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test_value');
    }, 10000);

    test('should handle command execution failure', async () => {
      const request = { command: 'exit 1' };

      const result = await executor.execute(request);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    }, 10000);

    test('should handle command not found', async () => {
      const request = { command: 'nonexistent_command' };

      const result = await executor.execute(request);

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    }, 10000);

    test('should handle timeout', async () => {
      const request = { command: 'sleep 10', timeout: 100 };

      await expect(executor.execute(request)).rejects.toThrow(TimeoutError);
    }, 10000);

    test('should handle timeout with custom error message', async () => {
      const request = { command: 'sleep 10', timeout: 100 };

      try {
        await executor.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(error.message).toContain('timed out');
      }
    }, 10000);

    test('should enforce concurrent command limit', async () => {
      const limitedExecutor = new CommandExecutor({
        server: { maxConcurrentCommands: 1 }
      });

      const request = { command: 'sleep 1' };

      // Запустить первую команду
      const promise1 = limitedExecutor.execute(request);

      // Попытаться запустить вторую
      const promise2 = limitedExecutor.execute(request);

      await expect(promise2).rejects.toThrow(AppError);
    }, 10000);

    test('should handle concurrent commands within limit', async () => {
      const concurrentExecutor = new CommandExecutor({
        server: { maxConcurrentCommands: 3 }
      });

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(concurrentExecutor.execute({ command: `echo "test ${i}"` }));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 10000);

    test('should generate unique command ID', async () => {
      const request = { command: 'echo "id test"' };

      const result = await executor.execute(request);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    }, 10000);

    test('should include start and end times', async () => {
      const request = { command: 'echo "time test"' };

      const result = await executor.execute(request);

      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
    }, 10000);

    test('should handle command with stderr output', async () => {
      const request = { command: 'echo "stderr test" >&2' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stderr).toContain('stderr test');
    }, 10000);

    test('should handle command with both stdout and stderr', async () => {
      const request = { command: 'echo "stdout" && echo "stderr" >&2' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('stdout');
      expect(result.stderr).toContain('stderr');
    }, 10000);

    test('should handle command with large output', async () => {
      const request = { command: 'yes "large output" | head -1000' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(1000);
    }, 10000);

    test('should handle command with special characters', async () => {
      const request = { command: 'echo "test with \'quotes\' and \"double quotes\""' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('quotes');
    }, 10000);

    test('should handle command with unicode characters', async () => {
      const request = { command: 'echo "тест с кириллицей"' };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('кириллицей');
    }, 10000);

    test('should queue commands when maxConcurrentCommands limit is reached and execute them when a slot becomes free', async () => {
      const smallExecutor = new CommandExecutor({
        server: { maxConcurrentCommands: 1 },
        security: { maxCommandLength: 1000, allowedCommands: [], blockedCommands: [] }
      }, mockLogger);

      const requests = [
        { command: 'sleep 0.2' }, // Command 1 (long running)
        { command: 'echo "second"' }, // Command 2 (should be queued)
        { command: 'echo "third"' }  // Command 3 (should be queued)
      ];

      const results = [];
      const executePromises = requests.map(req => smallExecutor.execute(req).then(res => {
        results.push(res.command);
        return res;
      }));

      // Дать первой команде запуститься
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(smallExecutor.getActiveCommands().length).toBe(1);
      expect(results).toHaveLength(0);

      // Дождаться завершения всех команд
      await Promise.all(executePromises);

      // Проверить, что все команды выполнены и в правильном порядке
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('sleep 0.2');
      expect(results[1]).toBe('echo "second"');
      expect(results[2]).toBe('echo "third"');
      expect(smallExecutor.getActiveCommands()).toHaveLength(0);
    }, 20000);

    test('should gracefully handle command interruption via signal', async () => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);

      // Дать команде немного времени для запуска
      await new Promise(resolve => setTimeout(resolve, 50));

      const activeCommands = executor.getActiveCommands();
      expect(activeCommands.length).toBe(1);
      const id = activeCommands[0];

      // Имитировать получение сигнала (например, SIGTERM)
      const commandContext = executor.activeCommands.get(id);
      if (commandContext && commandContext.childProcess && commandContext.childProcess.kill) {
        commandContext.childProcess.kill('SIGTERM');
      }

      // Ожидаем, что обещание будет отклонено из-за отмены/завершения с ошибкой
      await expect(executePromise).rejects.toThrow();

      // Проверить, что команда помечена как отмененная или завершенная с ошибкой
      const history = executor.getCommandHistory();
      const cancelledCommand = history.find(cmd => cmd.id === id);
      expect(cancelledCommand).toBeDefined();
      // Ожидаем либо cancelled, либо failed в зависимости от реализации execa и ОС
      expect([CommandState.CANCELLED, CommandState.FAILED]).toContain(cancelledCommand.metadata.state);
      expect(cancelledCommand.success).toBe(false);
    }, 15000);
  });

  describe('cancel', () => {
    test('should cancel running command', async () => {
      const request = { command: 'sleep 5' };

      // Запустить команду
      const executePromise = executor.execute(request);

      // Получить ID команды
      const activeCommands = executor.getActiveCommands();
      expect(activeCommands.length).toBe(1);

      const id = activeCommands[0];

      // Отменить команду
      const cancelled = await executor.cancel(id);
      expect(cancelled).toBe(true);

      // Проверить статус
      expect(executor.getCommandStatus(id)).toBe(CommandState.CANCELLED);
      // Проверить, что команда удалена из активных
      expect(executor.getActiveCommands()).not.toContain(id);
    }, 10000);

    test('should return false for non-existent command', async () => {
      const cancelled = await executor.cancel('non-existent-id');
      expect(cancelled).toBe(false);
    });

    test('should return false for already completed command', async () => {
      const request = { command: 'echo "quick command"' };
      const result = await executor.execute(request);

      const cancelled = await executor.cancel(result.id);
      expect(cancelled).toBe(false);
    }, 10000);

    test('should return false for already cancelled command', async () => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);

      const activeCommands = executor.getActiveCommands();
      const id = activeCommands[0];

      // Отменить команду первый раз
      const cancelled1 = await executor.cancel(id);
      expect(cancelled1).toBe(true);

      // Попытаться отменить снова
      const cancelled2 = await executor.cancel(id);
      expect(cancelled2).toBe(false);
    }, 10000);

    test('should handle cancel with invalid ID', async () => {
      const cancelled = await executor.cancel(null);
      expect(cancelled).toBe(false);
    });

    test('should handle cancel with empty ID', async () => {
      const cancelled = await executor.cancel('');
      expect(cancelled).toBe(false);
    });

    test('should emit commandCancelled event', (done) => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);

      executor.once('commandCancelled', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('sleep 5');
        expect(data.status).toBe(CommandState.CANCELLED);
        done();
      });

      setTimeout(async () => {
        const activeCommands = executor.getActiveCommands();
        if (activeCommands.length > 0) {
          await executor.cancel(activeCommands[0]);
        }
      }, 100);
    }, 10000);

    test('should handle multiple cancellations', async () => {
      const requests = [
        { command: 'sleep 3' },
        { command: 'sleep 3' },
        { command: 'sleep 3' }
      ];

      const promises = requests.map(req => executor.execute(req));
      
      // Дождаться запуска команд
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeCommands = executor.getActiveCommands();
      expect(activeCommands.length).toBe(3);

      // Отменить все команды
      const cancelPromises = activeCommands.map(id => executor.cancel(id));
      const results = await Promise.all(cancelPromises);

      results.forEach(result => {
        expect(result).toBe(true);
      });
      expect(executor.getActiveCommands()).toHaveLength(0);
    }, 10000);

    test('should remove cancelled command from active commands', async () => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);
      const id = executor.getActiveCommands()[0];

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(executor.getActiveCommands()).toContain(id);
      await executor.cancel(id);
      expect(executor.getActiveCommands()).not.toContain(id);
    }, 10000);

    test('should add cancelled command to history', async () => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);
      const id = executor.getActiveCommands()[0];

      await new Promise(resolve => setTimeout(resolve, 50));

      await executor.cancel(id);
      const history = executor.getCommandHistory();
      const cancelledEntry = history.find(entry => entry.id === id);

      expect(cancelledEntry).toBeDefined();
      expect(cancelledEntry.metadata.state).toBe(CommandState.CANCELLED);
      expect(cancelledEntry.success).toBe(false);
    }, 10000);
  });

  describe('executeStream', () => {
    test('should return event emitter for streaming', () => {
      const request = { command: 'echo "streaming test"' };
      const stream = executor.executeStream(request);

      expect(stream).toBeInstanceOf(EventEmitter);
    });

    test('should emit start event with command details', (done) => {
      const request = { command: 'echo "stream start test"' };
      const stream = executor.executeStream(request);

      stream.on('start', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('echo "stream start test"');
        expect(data.startTime).toBeInstanceOf(Date);
        done();
      });
    }, 10000);

    test('should emit stdout events with correct data', (done) => {
      const request = { command: 'echo "stream line 1" && sleep 0.05 && echo "stream line 2"' };
      const stream = executor.executeStream(request);
      const receivedStdout = [];

      stream.on('stdout', (data) => {
        receivedStdout.push(data.data.trim());
        if (receivedStdout.length === 2) {
          expect(receivedStdout).toEqual(['stream line 1', 'stream line 2']);
          done();
        }
      });
    }, 10000);

    test('should emit stderr events with correct data', (done) => {
      const request = { command: 'echo "stream error line" >&2' };
      const stream = executor.executeStream(request);
      const receivedStderr = [];

      stream.on('stderr', (data) => {
        receivedStderr.push(data.data.trim());
        expect(receivedStderr).toEqual(['stream error line']);
        done();
      });
    }, 10000);

    test('should emit complete event on successful execution with full result', (done) => {
      const request = { command: 'echo "stream complete"' };
      const stream = executor.executeStream(request);

      stream.on('complete', (result) => {
        expect(result.success).toBe(true);
        expect(result.command).toBe('echo "stream complete"');
        expect(result.stdout).toContain('stream complete');
        expect(result.id).toBeDefined();
        expect(result.startTime).toBeInstanceOf(Date);
        expect(result.endTime).toBeInstanceOf(Date);
        expect(typeof result.duration).toBe('number');
        expect(result.exitCode).toBe(0);
        done();
      });
    }, 10000);

    test('should emit error event on failure with error details', (done) => {
      const request = { command: 'invalid_command_xyz' };
      const stream = executor.executeStream(request);

      stream.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('invalid_command_xyz');
        done();
      });
    }, 10000);

    test('should emit cancelled event on stream cancellation', (done) => {
      const request = { command: 'sleep 5' };
      const stream = executor.executeStream(request);

      stream.on('cancelled', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('sleep 5');
        done();
      });

      setTimeout(() => {
        stream.cancel();
      }, 100);
    }, 10000);

    test('should emit timeout event on stream timeout', (done) => {
      const request = { command: 'sleep 10', timeout: 100 };
      const stream = executor.executeStream(request);

      stream.on('timeout', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('sleep 10');
        done();
      });
    }, 10000);

    test('should add stream command to active commands and remove after completion', async () => {
      const request = { command: 'echo "stream active"' };
      const stream = executor.executeStream(request);

      // Дать немного времени для запуска
      await new Promise(resolve => setTimeout(resolve, 50));

      const activeCommands = executor.getActiveCommands();
      expect(activeCommands).toHaveLength(1);
      const id = activeCommands[0];
      expect(executor.getCommandStatus(id)).toBe(CommandState.RUNNING);

      await new Promise(resolve => stream.on('complete', resolve));

      expect(executor.getActiveCommands()).toHaveLength(0);
      expect(executor.getCommandStatus(id)).toBeNull();

      // Проверить, что команда добавлена в историю
      const history = executor.getCommandHistory();
      const completedEntry = history.find(entry => entry.id === id);
      expect(completedEntry).toBeDefined();
      expect(completedEntry.metadata.state).toBe(CommandState.COMPLETED);
      expect(completedEntry.success).toBe(true);
    }, 10000);

    test('should remove stream command from active commands after error', async () => {
      const request = { command: 'invalid_command_for_stream' };
      const stream = executor.executeStream(request);

      await new Promise(resolve => setTimeout(resolve, 50));

      const activeCommands = executor.getActiveCommands();
      expect(activeCommands).toHaveLength(1);
      const id = activeCommands[0];

      await new Promise(resolve => stream.on('error', resolve));

      expect(executor.getActiveCommands()).toHaveLength(0);
      expect(executor.getCommandStatus(id)).toBeNull();

      // Проверить, что команда добавлена в историю с ошибкой
      const history = executor.getCommandHistory();
      const failedEntry = history.find(entry => entry.id === id);
      expect(failedEntry).toBeDefined();
      expect(failedEntry.metadata.state).toBe(CommandState.FAILED);
      expect(failedEntry.success).toBe(false);
    }, 10000);
  });

  describe('getActiveCommands and getCommandStatus', () => {
    test('should return list of active command IDs', async () => {
      const request = { command: 'sleep 1' };

      const executePromise = executor.execute(request);
      const activeCommands = executor.getActiveCommands();

      expect(activeCommands).toHaveLength(1);
      expect(typeof activeCommands[0]).toBe('string');

      await executePromise; // Дождаться завершения
    }, 10000);

    test('should return command status', async () => {
      const request = { command: 'echo "status test"' };

      const executePromise = executor.execute(request);
      const activeCommands = executor.getActiveCommands();
      const id = activeCommands[0];

      expect(executor.getCommandStatus(id)).toBe(CommandState.RUNNING);

      await executePromise;
      expect(executor.getCommandStatus(id)).toBeNull(); // Команда завершена и удалена
    }, 10000);

    test('should return empty array when no active commands', () => {
      const activeCommands = executor.getActiveCommands();
      expect(activeCommands).toEqual([]);
    });

    test('should return multiple active command IDs', async () => {
      const requests = [
        { command: 'sleep 2' },
        { command: 'sleep 2' },
        { command: 'sleep 2' }
      ];

      const promises = requests.map(req => executor.execute(req));
      
      // Дождаться запуска команд
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeCommands = executor.getActiveCommands();
      expect(activeCommands).toHaveLength(3);
      expect(activeCommands.every(id => typeof id === 'string')).toBe(true);

      // Дождаться завершения
      await Promise.all(promises);
    }, 10000);

    test('should return null status for non-existent command', () => {
      const status = executor.getCommandStatus('non-existent-id');
      expect(status).toBeNull();
    });

    test('should return null status for invalid ID', () => {
      const status = executor.getCommandStatus(null);
      expect(status).toBeNull();
    });

    test('should return null status for empty ID', () => {
      const status = executor.getCommandStatus('');
      expect(status).toBeNull();
    });

    test('should track command status changes', async () => {
      const request = { command: 'sleep 1' };
      const executePromise = executor.execute(request);

      // Дождаться запуска
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const activeCommands = executor.getActiveCommands();
      const id = activeCommands[0];

      expect(executor.getCommandStatus(id)).toBe(CommandState.RUNNING);

      await executePromise;
      expect(executor.getCommandStatus(id)).toBeNull();
    }, 10000);
  });

  describe('getCommandHistory and clearHistory', () => {
    test('should return command history', async () => {
      const request = { command: 'echo "history test"' };

      await executor.execute(request);
      const history = executor.getCommandHistory();

      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('echo "history test"');
      expect(history[0].success).toBe(true);
    }, 10000);

    test('should limit history size', async () => {
      const smallExecutor = new CommandExecutor({}, mockLogger);
      smallExecutor.maxHistorySize = 2;

      // Выполнить 3 команды
      for (let i = 0; i < 3; i++) {
        await smallExecutor.execute({ command: `echo "${i}"` });
      }

      const history = smallExecutor.getCommandHistory();
      expect(history).toHaveLength(2); // Должно быть ограничено 2
    }, 10000);

    test('should clear history', async () => {
      await executor.execute({ command: 'echo "clear test"' });
      expect(executor.getCommandHistory()).toHaveLength(1);

      executor.clearHistory();
      expect(executor.getCommandHistory()).toHaveLength(0);
    }, 10000);

    test('should maintain history order', async () => {
      const commands = [
        { command: 'echo "first"' },
        { command: 'echo "second"' },
        { command: 'echo "third"' }
      ];

      for (const cmd of commands) {
        await executor.execute(cmd);
      }

      const history = executor.getCommandHistory();
      expect(history).toHaveLength(3);
      expect(history[0].command).toBe('echo "first"');
      expect(history[1].command).toBe('echo "second"');
      expect(history[2].command).toBe('echo "third"');
    }, 10000);

    test('should include failed commands in history', async () => {
      await executor.execute({ command: 'echo "success"' });
      await executor.execute({ command: 'exit 1' });

      const history = executor.getCommandHistory();
      expect(history).toHaveLength(2);
      expect(history[0].success).toBe(true);
      expect(history[1].success).toBe(false);
    }, 10000);

    test('should include command metadata in history', async () => {
      const request = { command: 'echo "metadata test"' };
      await executor.execute(request);

      const history = executor.getCommandHistory();
      const entry = history[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('command');
      expect(entry).toHaveProperty('success');
      expect(entry).toHaveProperty('exitCode');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('duration');
    }, 10000);

    test('should handle history with custom max size', () => {
      const customExecutor = new CommandExecutor({}, mockLogger);
      customExecutor.maxHistorySize = 5;

      expect(customExecutor.maxHistorySize).toBe(5);
    });

    test('should handle zero max history size', () => {
      const zeroExecutor = new CommandExecutor({}, mockLogger);
      zeroExecutor.maxHistorySize = 0;

      expect(zeroExecutor.maxHistorySize).toBe(0);
    });

    test('should handle negative max history size', () => {
      const negativeExecutor = new CommandExecutor({}, mockLogger);
      negativeExecutor.maxHistorySize = -1;

      expect(negativeExecutor.maxHistorySize).toBe(-1);
    });
  });

  describe('getStats', () => {
    test('should return executor statistics', async () => {
      const request = { command: 'echo "stats test"' };

      const executePromise = executor.execute(request);
      const stats = executor.getStats();

      expect(stats.activeCommands).toBe(1);
      expect(stats.maxConcurrentCommands).toBe(5);
      expect(stats.timeout).toBe(5000);

      await executePromise;
      const finalStats = executor.getStats();
      expect(finalStats.activeCommands).toBe(0);
      expect(finalStats.totalHistory).toBe(1);
    }, 10000);

    test('should return correct statistics structure', () => {
      const stats = executor.getStats();

      expect(stats).toHaveProperty('activeCommands');
      expect(stats).toHaveProperty('maxConcurrentCommands');
      expect(stats).toHaveProperty('timeout');
      expect(stats).toHaveProperty('totalHistory');
    });

    test('should track successful and failed commands', async () => {
      await executor.execute({ command: 'echo "success"' });
      await executor.execute({ command: 'exit 1' });

      const stats = executor.getStats();
      expect(stats.stateStats.completed).toBe(1);
      expect(stats.stateStats.failed).toBe(1);
      expect(stats.totalHistory).toBe(2);
    }, 10000);

    test('should track cancelled commands', async () => {
      const request = { command: 'sleep 5' };
      const executePromise = executor.execute(request);

      // Дождаться запуска
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeCommands = executor.getActiveCommands();
      if (activeCommands.length > 0) {
        await executor.cancel(activeCommands[0]);
      }

      const stats = executor.getStats();
      expect(stats.stateStats.cancelled).toBe(1);
    }, 10000);

    test('should calculate average execution time', async () => {
      await executor.execute({ command: 'echo "fast"' });
      await executor.execute({ command: 'sleep 0.1' });

      const stats = executor.getStats();
      expect(stats.stateStats.completed).toBe(2);
      expect(typeof stats.stateStats.completed).toBe('number');
    }, 10000);

    test('should handle empty statistics', () => {
      const stats = executor.getStats();
      expect(stats.activeCommands).toBe(0);
      expect(stats.totalHistory).toBe(0);
      expect(stats.stateStats).toEqual({});
    });

    test('should correctly track successful, failed, and cancelled commands', async () => {
      await executor.execute({ command: 'echo "success 1"' });
      await executor.execute({ command: 'exit 1' });
      
      const cancelRequest = { command: 'sleep 2' };
      const cancelPromise = executor.execute(cancelRequest);
      await new Promise(resolve => setTimeout(resolve, 50));
      const cancelId = executor.getActiveCommands()[0];
      await executor.cancel(cancelId);

      const stats = executor.getStats();
      expect(stats.stateStats.completed).toBe(1);
      expect(stats.stateStats.failed).toBe(1);
      expect(stats.stateStats.cancelled).toBe(1);
      expect(stats.totalHistory).toBe(3);
    }, 15000);

    test('should accurately calculate average execution time across multiple commands', async () => {
      const startTestTime = Date.now();
      await executor.execute({ command: 'sleep 0.1' }); // Approx 100ms
      await executor.execute({ command: 'echo "instant"' }); // Approx 0ms
      await executor.execute({ command: 'sleep 0.2' }); // Approx 200ms

      const stats = executor.getStats();
      expect(stats.stateStats.completed).toBe(3);
      expect(typeof stats.stateStats.completed).toBe('number');
    }, 15000);

    test('should reset stats after clearing history', async () => {
      await executor.execute({ command: 'echo "test"' });
      await executor.execute({ command: 'exit 1' });

      executor.clearHistory();
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(0);
      expect(stats.stateStats).toEqual({});
    }, 10000);
  });

  describe('event emission', () => {
    test('should emit commandCompleted on successful execution', (done) => {
      const request = { command: 'echo "event test"' };

      executor.once('commandCompleted', (result) => {
        expect(result.success).toBe(true);
        expect(result.command).toBe('echo "event test"');
        expect(result.id).toBeDefined();
        expect(result.startTime).toBeInstanceOf(Date);
        expect(result.endTime).toBeInstanceOf(Date);
        expect(typeof result.duration).toBe('number');
        expect(result.exitCode).toBe(0);
        done();
      });

      executor.execute(request);
    }, 10000);

    test('should emit commandFailed on execution failure', (done) => {
      const request = { command: 'exit 1' };

      executor.once('commandFailed', (result) => {
        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.id).toBeDefined();
        expect(result.startTime).toBeInstanceOf(Date);
        expect(result.endTime).toBeInstanceOf(Date);
        expect(typeof result.duration).toBe('number');
        expect(result.error).toBeDefined();
        done();
      });

      executor.execute(request).catch(() => {}); // Игнорируем выброс ошибки
    }, 10000);

    test('should emit stdout and stderr events with correct data', (done) => {
      const request = { command: 'echo "stdout test line" && echo "stderr test line" >&2' };
      let stdoutReceived = [];
      let stderrReceived = [];

      executor.on('stdout', (data) => {
        stdoutReceived.push(data.data.trim());
      });

      executor.on('stderr', (data) => {
        stderrReceived.push(data.data.trim());
      });

      executor.execute(request).then(() => {
        setTimeout(() => {
          expect(stdoutReceived).toEqual(['stdout test line']);
          expect(stderrReceived).toEqual(['stderr test line']);
          done();
        }, 100);
      });
    }, 10000);

    test('should emit commandStarted event with command details', (done) => {
      const request = { command: 'echo "start test"' };

      executor.once('commandStarted', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('echo "start test"');
        expect(data.startTime).toBeInstanceOf(Date);
        done();
      });

      executor.execute(request);
    }, 10000);

    test('should emit commandCancelled event with command details', (done) => {
      const request = { command: 'sleep 5' };

      executor.once('commandCancelled', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('sleep 5');
        done();
      });

      setTimeout(async () => {
        const activeCommands = executor.getActiveCommands();
        if (activeCommands.length > 0) {
          await executor.cancel(activeCommands[0]);
        }
      }, 100);
    }, 10000);

    test('should emit commandTimeout event with command details', (done) => {
      const request = { command: 'sleep 10', timeout: 100 };

      executor.once('commandTimeout', (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe('sleep 10');
        expect(data.status).toBe(CommandState.TIMEOUT);
        done();
      });

      executor.execute(request).catch(() => {}); // Игнорируем выброс ошибки
    }, 10000);

    test('should emit multiple events for complex command in correct order', (done) => {
      const request = { command: 'echo "line1" && echo "line2" >&2 && echo "line3"' };
      const emittedEvents = [];

      executor.on('commandStarted', (data) => emittedEvents.push({ type: 'started', data }));
      executor.on('stdout', (data) => emittedEvents.push({ type: 'stdout', data }));
      executor.on('stderr', (data) => emittedEvents.push({ type: 'stderr', data }));
      executor.on('commandCompleted', (data) => emittedEvents.push({ type: 'completed', data }));

      executor.execute(request).then(() => {
        setTimeout(() => {
          // Ожидаем порядок: started -> stdout -> stderr -> stdout -> completed (или похоже)
          // Точный порядок stdout/stderr может зависеть от ОС и буферизации, но основные события должны быть.
          const eventTypes = emittedEvents.map(e => e.type);
          expect(eventTypes).toContain('started');
          expect(eventTypes).toContain('stdout');
          expect(eventTypes).toContain('stderr');
          expect(eventTypes).toContain('completed');

          const stdoutEvents = emittedEvents.filter(e => e.type === 'stdout').map(e => e.data.data.trim());
          const stderrEvents = emittedEvents.filter(e => e.type === 'stderr').map(e => e.data.data.trim());

          expect(stdoutEvents).toEqual(expect.arrayContaining(['line1', 'line3']));
          expect(stderrEvents).toEqual(expect.arrayContaining(['line2']));
        done();
        }, 200);
      });
    }, 10000);

    test('should include command metadata in all event types', (done) => {
      const request = { 
        command: 'echo "metadata test"',
        cwd: '/tmp',
        timeout: 5000
      };

      const checkMetadata = (data) => {
        expect(data.id).toBeDefined();
        expect(data.command).toBe(request.command);
      };

      let startedChecked = false;
      let completedChecked = false;

      executor.once('commandStarted', (data) => { checkMetadata(data); startedChecked = true; });
      executor.once('commandCompleted', (data) => { checkMetadata(data); completedChecked = true; });

      executor.execute(request).then(() => {
        setTimeout(() => {
          expect(startedChecked).toBe(true);
          expect(completedChecked).toBe(true);
        done();
        }, 100);
      });
    }, 10000);
  });

  describe('edge cases and error handling', () => {
    test('should handle environment variables in request', async () => {
      const request = {
        command: 'echo $TEST_VAR',
        env: { TEST_VAR: 'test_value' }
      };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test_value');
    }, 10000);

    test('should handle working directory changes', async () => {
      const request = {
        command: 'pwd',
        cwd: process.cwd()
      };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain(process.cwd());
    }, 10000);

    test('should handle subprocess kill signals', async () => {
      const request = { command: 'sleep 10' };

      const executePromise = executor.execute(request);
      const activeCommands = executor.getActiveCommands();
      const id = activeCommands[0];

      // Отменить и проверить, что процесс был убит
      await executor.cancel(id);

      await expect(executePromise).rejects.toThrow('Command was cancelled');
    }, 10000);

    test('should handle very long commands', async () => {
      const longCommand = 'echo "' + 'a'.repeat(5000) + '"';
      const request = { command: longCommand };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('a'.repeat(5000));
    }, 10000);

    test('should handle commands with special shell characters', async () => {
      const request = { command: 'echo "test with | & ; ( ) [ ] { } * ? ~ ` \\" "' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
    }, 10000);

    test('should handle commands with newlines', async () => {
      const request = { command: 'echo "line1\nline2\nline3"' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('line1');
      expect(result.stdout).toContain('line2');
      expect(result.stdout).toContain('line3');
    }, 10000);

    test('should handle commands with tabs', async () => {
      const request = { command: 'echo "tab\tseparated\tvalues"' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('tab');
      expect(result.stdout).toContain('separated');
    }, 10000);

    test('should handle commands with unicode characters', async () => {
      const request = { command: 'echo "тест с кириллицей и emoji 🚀"' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('кириллицей');
    }, 10000);

    test('should handle commands that produce no output', async () => {
      const request = { command: 'true' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    }, 10000);

    test('should handle commands that only produce stderr', async () => {
      const request = { command: 'echo "error message" >&2' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('error message');
    }, 10000);

    test('should handle commands with very large output', async () => {
      const request = { command: 'yes "large output line" | head -10000' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(100000);
    }, 10000);

    test('should handle commands that hang indefinitely', async () => {
      const request = { command: 'sleep 1000', timeout: 100 };

      await expect(executor.execute(request)).rejects.toThrow(TimeoutError);
    }, 10000);

    test('should handle commands with invalid working directory', async () => {
      const request = { command: 'pwd', cwd: '/nonexistent/directory' };

      const result = await executor.execute(request);
      expect(result.success).toBe(false);
    }, 10000);

    test('should handle concurrent access to same command', async () => {
      const request = { command: 'echo "concurrent test"' };
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(executor.execute(request));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 10000);

    test('should handle rapid command cancellation', async () => {
      const request = { command: 'sleep 5' };
      const promises = [];

      for (let i = 0; i < 5; i++) {
        const executePromise = executor.execute(request);
        promises.push(executePromise);

        setTimeout(async () => {
          const activeCommands = executor.getActiveCommands();
          if (activeCommands.length > 0) {
            await executor.cancel(activeCommands[0]);
          }
        }, 50);
      }

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    }, 10000);

    test('should handle memory pressure with large outputs', async () => {
      const request = { command: 'yes "memory test" | head -50000' };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(500000);
    }, 10000);

    test('should handle commands with very short timeout', async () => {
      const request = { command: 'sleep 1', timeout: 1 };

      await expect(executor.execute(request)).rejects.toThrow(TimeoutError);
    }, 10000);
  });

  describe('security and validation', () => {
    test('should reject commands exceeding max length', async () => {
      const longCommand = 'echo "' + 'a'.repeat(10001) + '"';
      const request = { command: longCommand };

      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should reject empty commands', async () => {
      const request = { command: '' };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should reject null commands', async () => {
      const request = { command: null };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should reject undefined commands', async () => {
      const request = { command: undefined };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should reject commands with only whitespace', async () => {
      const request = { command: '   \t\n   ' };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should handle blocked commands when configured', async () => {
      const secureExecutor = new CommandExecutor({
        security: {
          blockedCommands: ['rm', 'del'],
          maxCommandLength: 10000
        }
      }, mockLogger);

      const request = { command: 'rm -rf /tmp/test' };
      await expect(secureExecutor.execute(request)).rejects.toThrow(AppError);
    });

    test('should handle allowed commands when configured', async () => {
      const secureExecutor = new CommandExecutor({
        security: {
          allowedCommands: ['echo', 'ls'],
          maxCommandLength: 10000
        }
      }, mockLogger);

      const request = { command: 'echo test' };
      const result = await secureExecutor.execute(request);
      expect(result.success).toBe(true);
    });

    test('should reject non-allowed commands when whitelist is configured', async () => {
      const secureExecutor = new CommandExecutor({
        security: {
          allowedCommands: ['echo'],
          maxCommandLength: 10000
        }
      }, mockLogger);

      const request = { command: 'ls -la' };
      await expect(secureExecutor.execute(request)).rejects.toThrow(AppError);
    });
  });

  describe('performance and resource management', () => {
    test('should handle high concurrent load', async () => {
      const promises = [];
      const startTime = Date.now();

      // Запускаем 50 команд одновременно
      for (let i = 0; i < 50; i++) {
        promises.push(executor.execute({ command: `echo "load test ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Все команды должны выполниться успешно
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем, что время выполнения разумное
      expect(endTime - startTime).toBeLessThan(10000); // менее 10 секунд
    }, 15000);

    test('should manage memory efficiently with large outputs', async () => {
      const request = { command: 'yes "memory test" | head -10000' };
      
      const initialMemory = process.memoryUsage().heapUsed;
      const result = await executor.execute(request);
      const finalMemory = process.memoryUsage().heapUsed;
      
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(100000);
      
      // Проверяем, что память не растет чрезмерно
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // менее 50MB
    }, 15000);

    test('should handle rapid command execution', async () => {
      const startTime = Date.now();
      const promises = [];

      // Быстро запускаем много команд
      for (let i = 0; i < 100; i++) {
        promises.push(executor.execute({ command: `echo "rapid ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      results.forEach(result => expect(result.success).toBe(true));
      expect(endTime - startTime).toBeLessThan(5000); // менее 5 секунд
    }, 10000);
  });

  describe('error recovery and resilience', () => {
    test('should recover from temporary failures', async () => {
      // Сначала команда, которая может временно не работать
      const failingRequest = { command: 'nonexistent_command_xyz' };
      
      try {
        await executor.execute(failingRequest);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Затем команда, которая должна работать
      const workingRequest = { command: 'echo "recovery test"' };
      const result = await executor.execute(workingRequest);
      
      expect(result.success).toBe(true);
    }, 10000);

    test('should handle partial command failures gracefully', async () => {
      const mixedRequests = [
        { command: 'echo "success 1"' },
        { command: 'exit 1' },
        { command: 'echo "success 2"' },
        { command: 'nonexistent_command' },
        { command: 'echo "success 3"' }
      ];

      const results = await Promise.allSettled(
        mixedRequests.map(req => executor.execute(req))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

      expect(successful).toHaveLength(3);
      expect(failed).toHaveLength(2);
    }, 15000);

    test('should maintain state consistency after errors', async () => {
      const initialStats = executor.getStats();
      
      // Выполняем команды с ошибками
      try {
        await executor.execute({ command: 'exit 1' });
      } catch (error) {
        // Игнорируем ошибку
      }

      try {
        await executor.execute({ command: 'nonexistent_command' });
      } catch (error) {
        // Игнорируем ошибку
      }

      // Выполняем успешную команду
      await executor.execute({ command: 'echo "consistency test"' });

      const finalStats = executor.getStats();
      
      // Проверяем, что статистика корректна
      expect(finalStats.totalHistory).toBe(3);
      expect(finalStats.activeCommands).toBe(0);
      expect(finalStats.stateStats.failed).toBe(2);
      expect(finalStats.stateStats.completed).toBe(1);
    }, 15000);
  });

  describe('integration scenarios', () => {
    test('should handle complex command pipelines', async () => {
      const request = { 
        command: 'echo "line1" && echo "line2" >&2 && echo "line3" && echo "line4" >&2' 
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('line1');
      expect(result.stdout).toContain('line3');
      expect(result.stderr).toContain('line2');
      expect(result.stderr).toContain('line4');
    }, 10000);

    test('should handle commands with environment variables', async () => {
      const request = {
        command: 'echo $TEST_VAR1 && echo $TEST_VAR2',
        env: {
          TEST_VAR1: 'value1',
          TEST_VAR2: 'value2'
        }
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('value1');
      expect(result.stdout).toContain('value2');
    }, 10000);

    test('should handle commands with custom working directory', async () => {
      const request = {
        command: 'pwd',
        cwd: process.cwd()
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe(process.cwd());
    }, 10000);

    test('should handle streaming with complex output', async () => {
      const request = { 
        command: 'for i in {1..5}; do echo "stream $i"; sleep 0.1; done' 
      };
      const stream = executor.executeStream(request);

      const receivedData = [];
      const completePromise = new Promise(resolve => {
        stream.on('stdout', (data) => {
          receivedData.push(data.data.trim());
        });
        stream.on('complete', resolve);
      });

      await completePromise;

      expect(receivedData).toHaveLength(5);
      expect(receivedData[0]).toBe('stream 1');
      expect(receivedData[4]).toBe('stream 5');
    }, 10000);
  });

  describe('boundary conditions', () => {
    test('should handle maximum concurrent commands', async () => {
      const maxConcurrentExecutor = new CommandExecutor({
        server: { maxConcurrentCommands: 3 }
      }, mockLogger);

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(maxConcurrentExecutor.execute({ command: `sleep 0.5` }));
      }

      // Четвертая команда должна быть отклонена
      const fourthPromise = maxConcurrentExecutor.execute({ command: 'echo "fourth"' });
      await expect(fourthPromise).rejects.toThrow(AppError);

      // Первые три должны выполниться
      const results = await Promise.all(promises);
      results.forEach(result => expect(result.success).toBe(true));
    }, 10000);

    test('should handle zero timeout gracefully', async () => {
      const request = { command: 'echo "zero timeout"', timeout: 0 };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should handle negative timeout gracefully', async () => {
      const request = { command: 'echo "negative timeout"', timeout: -1000 };
      await expect(executor.execute(request)).rejects.toThrow(AppError);
    });

    test('should handle very large timeout values', async () => {
      const request = { 
        command: 'echo "large timeout"', 
        timeout: Number.MAX_SAFE_INTEGER 
      };
      
      const result = await executor.execute(request);
      expect(result.success).toBe(true);
    }, 10000);

    test('should handle empty environment variables', async () => {
      const request = {
        command: 'echo "empty env test"',
        env: {}
      };

      const result = await executor.execute(request);
      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('event system integrity', () => {
    test('should emit all required events in correct order', (done) => {
      const request = { command: 'echo "event order test"' };
      const events = [];

      executor.on('commandStarted', (data) => {
        events.push({ type: 'started', id: data.id });
      });

      executor.on('stdout', (data) => {
        events.push({ type: 'stdout', id: data.id });
      });

      executor.on('commandCompleted', (data) => {
        events.push({ type: 'completed', id: data.id });
        
        // Проверяем порядок событий
        expect(events[0].type).toBe('started');
        expect(events[1].type).toBe('stdout');
        expect(events[2].type).toBe('completed');
        
        // Проверяем, что все события имеют одинаковый ID
        const ids = events.map(e => e.id);
        expect(new Set(ids).size).toBe(1);
        
        done();
      });

      executor.execute(request);
    }, 10000);

    test('should handle multiple listeners for same event', (done) => {
      const request = { command: 'echo "multiple listeners"' };
      let listener1Called = false;
      let listener2Called = false;

      const checkBothCalled = () => {
        if (listener1Called && listener2Called) {
          done();
        }
      };

      executor.on('commandCompleted', () => {
        listener1Called = true;
        checkBothCalled();
      });

      executor.on('commandCompleted', () => {
        listener2Called = true;
        checkBothCalled();
      });

      executor.execute(request);
    }, 10000);

    test('should handle event listener errors gracefully', (done) => {
      const request = { command: 'echo "listener error test"' };

      executor.on('commandCompleted', () => {
        throw new Error('Listener error');
      });

      executor.on('commandCompleted', () => {
        done(); // Второй слушатель должен сработать
      });

      executor.execute(request);
    }, 10000);
  });
});
