/**
 * Интеграционные тесты для CommandExecutor
 * Проверяют взаимодействие всех компонентов системы
 */

import { EventEmitter } from 'events';
import { CommandExecutor } from '../index.js';
import { CommandState } from '../CommandEnums.js';
import { AppError, TimeoutError } from '../CommandErrors.js';

describe('CommandExecutor Integration Tests', () => {
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
        maxConcurrentCommands: 10
      },
      security: {
        maxCommandLength: 10000,
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

  describe('full execution lifecycle', () => {
    test('should complete full command lifecycle with all components', async () => {
      const request = { command: 'echo "integration test"' };
      const events = [];

      // Слушаем все события
      executor.on('commandStarted', (data) => {
        events.push({ type: 'started', id: data.id, timestamp: Date.now() });
      });

      executor.on('stdout', (data) => {
        events.push({ type: 'stdout', id: data.id, timestamp: Date.now() });
      });

      executor.on('commandCompleted', (data) => {
        events.push({ type: 'completed', id: data.id, timestamp: Date.now() });
      });

      const result = await executor.execute(request);

      // Проверяем результат
      expect(result.success).toBe(true);
      expect(result.command).toBe('echo "integration test"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('integration test');

      // Проверяем события
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('started');
      expect(events[1].type).toBe('stdout');
      expect(events[2].type).toBe('completed');

      // Проверяем логирование
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Command execution started',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.PENDING
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Command execution completed',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.COMPLETED
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(result.id);
      expect(history[0].success).toBe(true);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(1);
      expect(stats.stateStats.completed).toBe(1);
    }, 10000);

    test('should handle command failure with all components', async () => {
      const request = { command: 'exit 1' };
      const events = [];

      executor.on('commandFailed', (data) => {
        events.push({ type: 'failed', id: data.id, timestamp: Date.now() });
      });

      try {
        await executor.execute(request);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Проверяем события
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('failed');

      // Проверяем логирование ошибки
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Command execution failed',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.FAILED
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
      expect(history[0].exitCode).toBe(1);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.stateStats.failed).toBe(1);
    }, 10000);

    test('should handle command timeout with all components', async () => {
      const request = { command: 'sleep 10', timeout: 100 };
      const events = [];

      executor.on('commandTimeout', (data) => {
        events.push({ type: 'timeout', id: data.id, timestamp: Date.now() });
      });

      try {
        await executor.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }

      // Проверяем события
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('timeout');

      // Проверяем логирование таймаута
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Command execution timed out',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.TIMEOUT
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
      expect(history[0].metadata.timedOut).toBe(true);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.stateStats.timeout).toBe(1);
    }, 10000);

    test('should handle command cancellation with all components', async () => {
      const request = { command: 'sleep 5' };
      const events = [];

      executor.on('commandCancelled', (data) => {
        events.push({ type: 'cancelled', id: data.id, timestamp: Date.now() });
      });

      const executePromise = executor.execute(request);

      // Дождаться запуска команды
      await new Promise(resolve => setTimeout(resolve, 100));

      const activeCommands = executor.getActiveCommands();
      expect(activeCommands.length).toBe(1);

      const id = activeCommands[0];
      const cancelled = await executor.cancel(id);
      expect(cancelled).toBe(true);

      try {
        await executePromise;
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Проверяем события
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('cancelled');

      // Проверяем логирование отмены
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Command execution cancelled',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.CANCELLED
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
      expect(history[0].metadata.state).toBe(CommandState.CANCELLED);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.stateStats.cancelled).toBe(1);
    }, 10000);
  });

  describe('streaming integration', () => {
    test('should handle streaming execution with all components', async () => {
      const request = { command: 'echo "stream1" && sleep 0.1 && echo "stream2"' };
      const stream = executor.executeStream(request);
      const events = [];

      stream.on('start', (data) => {
        events.push({ type: 'start', id: data.id });
      });

      stream.on('stdout', (data) => {
        events.push({ type: 'stdout', id: data.id, data: data.data.trim() });
      });

      stream.on('complete', (data) => {
        events.push({ type: 'complete', id: data.id });
      });

      const completePromise = new Promise(resolve => {
        stream.on('complete', resolve);
      });

      await completePromise;

      // Проверяем события
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events[0].type).toBe('start');
      expect(events[events.length - 1].type).toBe('complete');

      const stdoutEvents = events.filter(e => e.type === 'stdout');
      expect(stdoutEvents.length).toBeGreaterThanOrEqual(2);

      // Проверяем логирование
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Command execution started',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.PENDING
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Command execution completed',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.COMPLETED
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
    }, 10000);

    test('should handle streaming error with all components', async () => {
      const request = { command: 'nonexistent_command_for_stream' };
      const stream = executor.executeStream(request);
      const events = [];

      stream.on('error', (error) => {
        events.push({ type: 'error', error: error.message });
      });

      const errorPromise = new Promise(resolve => {
        stream.on('error', resolve);
      });

      await errorPromise;

      // Проверяем события
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');

      // Проверяем логирование ошибки
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Command execution failed',
        expect.objectContaining({
          type: 'command_execution',
          state: CommandState.FAILED
        })
      );

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
    }, 10000);
  });

  describe('security integration', () => {
    test('should enforce security policies across all components', async () => {
      const secureExecutor = new CommandExecutor({
        server: { timeout: 5000, maxConcurrentCommands: 5 },
        security: {
          maxCommandLength: 100,
          blockedCommands: ['rm', 'del'],
          allowedCommands: ['echo', 'ls']
        }
      }, mockLogger);

      // Тест заблокированной команды
      try {
        await secureExecutor.execute({ command: 'rm -rf /tmp' });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain('blocked pattern');
      }

      // Тест неразрешенной команды
      try {
        await secureExecutor.execute({ command: 'git status' });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain('not in allowed list');
      }

      // Тест слишком длинной команды
      const longCommand = 'echo "' + 'a'.repeat(101) + '"';
      try {
        await secureExecutor.execute({ command: longCommand });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain('exceeds maximum');
      }

      // Тест разрешенной команды
      const result = await secureExecutor.execute({ command: 'echo "allowed"' });
      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('concurrent execution integration', () => {
    test('should handle multiple concurrent commands with all components', async () => {
      const requests = [
        { command: 'echo "concurrent 1"' },
        { command: 'echo "concurrent 2"' },
        { command: 'echo "concurrent 3"' },
        { command: 'echo "concurrent 4"' },
        { command: 'echo "concurrent 5"' }
      ];

      const events = [];
      executor.on('commandCompleted', (data) => {
        events.push({ type: 'completed', id: data.id });
      });

      const results = await Promise.all(
        requests.map(req => executor.execute(req))
      );

      // Проверяем результаты
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      // Проверяем события
      expect(events).toHaveLength(5);

      // Проверяем логирование
      expect(mockLogger.info).toHaveBeenCalledTimes(10); // 5 started + 5 completed

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(5);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(5);
      expect(stats.stateStats.completed).toBe(5);
      expect(stats.activeCommands).toBe(0);
    }, 10000);

    test('should handle concurrent streaming commands', async () => {
      const requests = [
        { command: 'echo "stream 1"' },
        { command: 'echo "stream 2"' },
        { command: 'echo "stream 3"' }
      ];

      const streams = requests.map(req => executor.executeStream(req));
      const allEvents = [];

      const completePromises = streams.map((stream, index) => {
        return new Promise(resolve => {
          stream.on('complete', (data) => {
            allEvents.push({ type: 'complete', index, id: data.id });
            resolve();
          });
        });
      });

      await Promise.all(completePromises);

      // Проверяем события
      expect(allEvents).toHaveLength(3);

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(3);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(3);
      expect(stats.stateStats.completed).toBe(3);
    }, 10000);
  });

  describe('error recovery integration', () => {
    test('should recover from errors and continue working', async () => {
      // Выполняем команду с ошибкой
      try {
        await executor.execute({ command: 'exit 1' });
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Выполняем команду с таймаутом
      try {
        await executor.execute({ command: 'sleep 10', timeout: 100 });
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }

      // Выполняем успешную команду
      const result = await executor.execute({ command: 'echo "recovery test"' });
      expect(result.success).toBe(true);

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(3);
      expect(history[0].success).toBe(false); // exit 1
      expect(history[1].success).toBe(false); // timeout
      expect(history[2].success).toBe(true);  // echo

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(3);
      expect(stats.stateStats.failed).toBe(1);
      expect(stats.stateStats.timeout).toBe(1);
      expect(stats.stateStats.completed).toBe(1);
    }, 15000);

    test('should maintain consistency after partial failures', async () => {
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

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(5);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(5);
      expect(stats.stateStats.completed).toBe(3);
      expect(stats.stateStats.failed).toBe(2);
    }, 15000);
  });

  describe('performance integration', () => {
    test('should handle high load with all components', async () => {
      const startTime = Date.now();
      const promises = [];

      // Запускаем 100 команд
      for (let i = 0; i < 100; i++) {
        promises.push(executor.execute({ command: `echo "load test ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Проверяем результаты
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем производительность
      expect(endTime - startTime).toBeLessThan(10000); // менее 10 секунд

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(100);

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(100);
      expect(stats.stateStats.completed).toBe(100);
      expect(stats.activeCommands).toBe(0);
    }, 15000);

    test('should handle memory efficiently under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(executor.execute({ command: `echo "memory test ${i}"` }));
      }

      await Promise.all(promises);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Проверяем, что память не растет чрезмерно
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // менее 10MB

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(50);

      // Очищаем историю и проверяем освобождение памяти
      executor.clearHistory();
      const clearedMemory = process.memoryUsage().heapUsed;
      
      expect(executor.getCommandHistory()).toHaveLength(0);
      expect(clearedMemory).toBeLessThan(finalMemory);
    }, 15000);
  });
});
