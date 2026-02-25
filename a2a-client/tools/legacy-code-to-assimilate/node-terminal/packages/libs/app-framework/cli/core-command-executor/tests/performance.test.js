/**
 * Тесты производительности для CommandExecutor
 * Проверяют производительность системы под нагрузкой
 */

import { CommandExecutor } from '../index.js';

describe('CommandExecutor Performance Tests', () => {
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
        timeout: 10000,
        maxConcurrentCommands: 50
      },
      security: {
        maxCommandLength: 50000,
        allowedCommands: [],
        blockedCommands: []
      }
    }, mockLogger);
  });

  afterEach(() => {
    executor.clearHistory();
    for (const id of executor.getActiveCommands()) {
      executor.cancel(id);
    }
  });

  describe('execution performance', () => {
    test('should execute simple commands quickly', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(executor.execute({ command: `echo "perf test ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const avgTimePerCommand = duration / iterations;

      // Проверяем результаты
      expect(results).toHaveLength(iterations);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем производительность
      expect(duration).toBeLessThan(5000); // менее 5 секунд для 1000 команд
      expect(avgTimePerCommand).toBeLessThan(10); // менее 10мс на команду

      console.log(`Executed ${iterations} commands in ${duration}ms (${avgTimePerCommand.toFixed(2)}ms per command)`);
    }, 10000);

    test('should handle concurrent execution efficiently', async () => {
      const concurrentCommands = 100;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < concurrentCommands; i++) {
        promises.push(executor.execute({ command: `echo "concurrent ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Проверяем результаты
      expect(results).toHaveLength(concurrentCommands);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем производительность
      expect(duration).toBeLessThan(2000); // менее 2 секунд для 100 команд

      console.log(`Executed ${concurrentCommands} concurrent commands in ${duration}ms`);
    }, 10000);

    test('should handle streaming performance', async () => {
      const streamCount = 50;
      const startTime = Date.now();

      const streams = [];
      for (let i = 0; i < streamCount; i++) {
        streams.push(executor.executeStream({ command: `echo "stream ${i}"` }));
      }

      const completePromises = streams.map(stream => {
        return new Promise(resolve => {
          stream.on('complete', resolve);
        });
      });

      await Promise.all(completePromises);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Проверяем производительность
      expect(duration).toBeLessThan(3000); // менее 3 секунд для 50 потоков

      console.log(`Executed ${streamCount} streams in ${duration}ms`);
    }, 10000);
  });

  describe('memory performance', () => {
    test('should handle large outputs efficiently', async () => {
      const largeOutputSize = 1000000; // 1MB
      const command = `yes "large output" | head -${Math.floor(largeOutputSize / 12)}`;
      
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await executor.execute({ command });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Проверяем результат
      expect(result.success).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(largeOutputSize * 0.8); // хотя бы 80% ожидаемого размера

      // Проверяем производительность
      expect(duration).toBeLessThan(5000); // менее 5 секунд
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // менее 50MB

      console.log(`Processed ${result.stdout.length} bytes in ${duration}ms, memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 10000);

    test('should handle many small commands without memory leaks', async () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await executor.execute({ command: `echo "small command ${i}"` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Проверяем историю
      const history = executor.getCommandHistory();
      expect(history).toHaveLength(iterations);

      // Проверяем память
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // менее 20MB

      // Очищаем историю и проверяем освобождение памяти
      executor.clearHistory();
      const clearedMemory = process.memoryUsage().heapUsed;
      const memoryAfterClear = clearedMemory - initialMemory;

      expect(executor.getCommandHistory()).toHaveLength(0);
      expect(memoryAfterClear).toBeLessThan(memoryIncrease);

      console.log(`Memory increase for ${iterations} commands: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after clear: ${(memoryAfterClear / 1024 / 1024).toFixed(2)}MB`);
    }, 15000);

    test('should handle concurrent large outputs efficiently', async () => {
      const concurrentCount = 10;
      const outputSize = 100000; // 100KB per command
      const command = `yes "concurrent large" | head -${Math.floor(outputSize / 15)}`;

      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < concurrentCount; i++) {
        promises.push(executor.execute({ command }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Проверяем результаты
      expect(results).toHaveLength(concurrentCount);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.stdout.length).toBeGreaterThan(outputSize * 0.8);
      });

      // Проверяем производительность
      expect(duration).toBeLessThan(10000); // менее 10 секунд
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // менее 100MB

      console.log(`Processed ${concurrentCount} large outputs in ${duration}ms, memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 15000);
  });

  describe('validation performance', () => {
    test('should validate commands quickly', async () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await executor.execute({ command: `echo "validation test ${i}"` });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTimePerCommand = duration / iterations;

      // Проверяем производительность
      expect(duration).toBeLessThan(30000); // менее 30 секунд для 10000 команд
      expect(avgTimePerCommand).toBeLessThan(5); // менее 5мс на команду

      console.log(`Validated and executed ${iterations} commands in ${duration}ms (${avgTimePerCommand.toFixed(2)}ms per command)`);
    }, 35000);

    test('should handle security validation efficiently', async () => {
      const secureExecutor = new CommandExecutor({
        server: { timeout: 5000, maxConcurrentCommands: 100 },
        security: {
          maxCommandLength: 10000,
          blockedCommands: Array.from({ length: 1000 }, (_, i) => `blocked${i}`),
          allowedCommands: Array.from({ length: 1000 }, (_, i) => `allowed${i}`)
        }
      }, mockLogger);

      const iterations = 1000;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(secureExecutor.execute({ command: `allowed${i % 1000} test` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const avgTimePerCommand = duration / iterations;

      // Проверяем результаты
      expect(results).toHaveLength(iterations);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем производительность
      expect(duration).toBeLessThan(10000); // менее 10 секунд
      expect(avgTimePerCommand).toBeLessThan(15); // менее 15мс на команду

      console.log(`Validated ${iterations} commands with large security lists in ${duration}ms (${avgTimePerCommand.toFixed(2)}ms per command)`);
    }, 15000);
  });

  describe('event system performance', () => {
    test('should handle high event throughput', async () => {
      const iterations = 1000;
      let eventCount = 0;

      // Слушаем все события
      executor.on('commandStarted', () => eventCount++);
      executor.on('stdout', () => eventCount++);
      executor.on('commandCompleted', () => eventCount++);

      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(executor.execute({ command: `echo "event test ${i}"` }));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Проверяем события
      expect(eventCount).toBe(iterations * 3); // started + stdout + completed

      // Проверяем производительность
      expect(duration).toBeLessThan(5000); // менее 5 секунд

      console.log(`Processed ${eventCount} events in ${duration}ms (${(eventCount / duration * 1000).toFixed(0)} events/sec)`);
    }, 10000);

    test('should handle many concurrent listeners efficiently', async () => {
      const listenerCount = 100;
      const commandCount = 50;
      let totalEvents = 0;

      // Добавляем много слушателей
      for (let i = 0; i < listenerCount; i++) {
        executor.on('commandCompleted', () => {
          totalEvents++;
        });
      }

      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < commandCount; i++) {
        promises.push(executor.execute({ command: `echo "listener test ${i}"` }));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Проверяем события
      expect(totalEvents).toBe(commandCount * listenerCount);

      // Проверяем производительность
      expect(duration).toBeLessThan(3000); // менее 3 секунд

      console.log(`Processed ${totalEvents} events with ${listenerCount} listeners in ${duration}ms`);
    }, 10000);
  });

  describe('stress testing', () => {
    test('should handle extreme concurrent load', async () => {
      const extremeLoad = 500;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < extremeLoad; i++) {
        promises.push(executor.execute({ command: `echo "extreme load ${i}"` }));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Проверяем результаты
      expect(results).toHaveLength(extremeLoad);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Проверяем производительность
      expect(duration).toBeLessThan(10000); // менее 10 секунд

      // Проверяем статистику
      const stats = executor.getStats();
      expect(stats.totalHistory).toBe(extremeLoad);
      expect(stats.activeCommands).toBe(0);

      console.log(`Handled extreme load of ${extremeLoad} commands in ${duration}ms`);
    }, 15000);

    test('should handle mixed workload efficiently', async () => {
      const workload = {
        simple: 200,
        complex: 50,
        streaming: 30,
        failed: 20
      };

      const startTime = Date.now();
      const promises = [];

      // Простые команды
      for (let i = 0; i < workload.simple; i++) {
        promises.push(executor.execute({ command: `echo "simple ${i}"` }));
      }

      // Сложные команды
      for (let i = 0; i < workload.complex; i++) {
        promises.push(executor.execute({ command: `echo "complex ${i}" && sleep 0.01` }));
      }

      // Потоковые команды
      for (let i = 0; i < workload.streaming; i++) {
        const stream = executor.executeStream({ command: `echo "stream ${i}"` });
        promises.push(new Promise(resolve => {
          stream.on('complete', resolve);
        }));
      }

      // Команды с ошибками
      for (let i = 0; i < workload.failed; i++) {
        promises.push(
          executor.execute({ command: 'exit 1' }).catch(() => ({ success: false }))
        );
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

      // Проверяем результаты
      expect(successful.length).toBe(workload.simple + workload.complex + workload.streaming);
      expect(failed.length).toBe(workload.failed);

      // Проверяем производительность
      expect(duration).toBeLessThan(15000); // менее 15 секунд

      console.log(`Mixed workload completed in ${duration}ms: ${successful.length} successful, ${failed.length} failed`);
    }, 20000);
  });
});
