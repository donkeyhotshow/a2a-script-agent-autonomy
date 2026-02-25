/**
 * Тесты для HousekeepingManager
 * Система управления техническим обслуживанием и очисткой
 */

const HousekeepingManager = require('../index');
const { spawn } = require('child_process');
const path = require('path');

// Мокаем child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('HousekeepingManager', () => {
  let housekeepingManager;
  let mockLogger;
  let mockSpawn;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    // Мокаем spawn для имитации процессов
    mockSpawn = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          // Имитируем успешное завершение процесса
          setTimeout(() => callback(0), 10);
        }
        return mockSpawn;
      })
    };

    spawn.mockReturnValue(mockSpawn);

    housekeepingManager = new HousekeepingManager({
      logger: mockLogger,
      interval: 100, // Уменьшаем интервал для тестов
      taskManagerCliPath: '/test/path/cli.js'
    });
  });

  afterEach(() => {
    // Очистка временных файлов после каждого теста
    try {
      // await fs.rm(tempDir, { recursive: true, force: true }); // This line was removed as per the edit hint
    } catch (error) {
      // Игнорируем ошибки при очистке
    }
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Конструктор и инициализация', () => {
    test('должен создавать экземпляр с дефолтными настройками', () => {
      const manager = new HousekeepingManager();
      
      expect(manager).toBeInstanceOf(HousekeepingManager);
      expect(manager.logger).toBe(console);
      expect(manager.housekeepingIntervalMs).toBe(60 * 1000);
      expect(manager.taskManagerCliPath).toBe(path.join(process.cwd(), 'libs', 'task-manager', 'cli.js'));
      expect(manager.housekeepingTimer).toBeNull();
    });

    test('должен принимать кастомные опции', () => {
      const options = {
        logger: mockLogger,
        interval: 5000,
        taskManagerCliPath: '/custom/path/cli.js'
      };
      
      const manager = new HousekeepingManager(options);
      
      expect(manager.logger).toBe(mockLogger);
      expect(manager.housekeepingIntervalMs).toBe(5000);
      expect(manager.taskManagerCliPath).toBe('/custom/path/cli.js');
    });

    test('должен инициализировать состояние по умолчанию', () => {
      expect(housekeepingManager.housekeepingTimer).toBeNull();
    });
  });

  describe('Запуск housekeeping', () => {
    test('должен запускать housekeeping tasks', () => {
      housekeepingManager.start();
      
      expect(mockLogger.info).toHaveBeenCalledWith('[HousekeepingManager] Starting housekeeping tasks.');
      expect(housekeepingManager.housekeepingTimer).not.toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('[HousekeepingManager] Housekeeping started.');
    });

    test('не должен запускать если уже запущен', () => {
      housekeepingManager.start();
      const firstTimer = housekeepingManager.housekeepingTimer;
      
      housekeepingManager.start();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('[HousekeepingManager] Housekeeping is already running.');
      expect(housekeepingManager.housekeepingTimer).toBe(firstTimer);
    });

    test('должен устанавливать интервал', () => {
      jest.useFakeTimers();
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(spawn).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('Выполнение задач housekeeping', () => {
    test('должен запускать cleanup задачи', () => {
      jest.useFakeTimers();
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        ['/test/path/cli.js', 'cleanup'],
        { stdio: 'inherit' }
      );
      jest.useRealTimers();
    });

    test('должен запускать heartbeat задачи', () => {
      jest.useFakeTimers();
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        ['/test/path/cli.js', 'heartbeat'],
        { stdio: 'inherit' }
      );
      jest.useRealTimers();
    });

    test('должен обрабатывать ошибки cleanup процесса', () => {
      jest.useFakeTimers();
      
      // Мокаем процесс с ошибкой
      const errorSpawn = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            callback(1); // Код выхода 1 (ошибка)
          }
          return errorSpawn;
        })
      };
      
      spawn.mockReturnValueOnce(errorSpawn);
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[HousekeepingManager] task-manager cleanup exited with code 1'
      );
      jest.useRealTimers();
    });

    test('должен обрабатывать ошибки heartbeat процесса', () => {
      jest.useFakeTimers();
      
      let callCount = 0;
      spawn.mockImplementation(() => {
        callCount++;
        if (callCount === 2) { // Второй вызов (heartbeat)
          return {
            on: jest.fn().mockImplementation((event, callback) => {
              if (event === 'close') {
                callback(1); // Код выхода 1 (ошибка)
              }
              return this;
            })
          };
        }
        return mockSpawn;
      });
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[HousekeepingManager] task-manager heartbeat exited with code 1'
      );
      jest.useRealTimers();
    });

    test('должен обрабатывать исключения при запуске процессов', () => {
      jest.useFakeTimers();
      
      spawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });
      
      housekeepingManager.start();
      
      // Промотаем время до первого выполнения
      jest.advanceTimersByTime(100);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[HousekeepingManager] Failed to run cleanup:',
        expect.any(Error)
      );
      jest.useRealTimers();
    });
  });

  describe('Остановка housekeeping', () => {
    test('должен останавливать housekeeping', () => {
      housekeepingManager.start();
      expect(housekeepingManager.housekeepingTimer).not.toBeNull();
      
      housekeepingManager.stop();
      
      expect(housekeepingManager.housekeepingTimer).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('[HousekeepingManager] Housekeeping stopped.');
    });

    test('должен выводить предупреждение если не запущен', () => {
      housekeepingManager.stop();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('[HousekeepingManager] Housekeeping is not running.');
    });

    test('должен корректно обрабатывать множественные вызовы stop', () => {
      housekeepingManager.start();
      housekeepingManager.stop();
      
      housekeepingManager.stop();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('[HousekeepingManager] Housekeeping is not running.');
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен запускать и останавливать циклы housekeeping', () => {
      jest.useFakeTimers();
      
      housekeepingManager.start();
      
      // Первое выполнение
      jest.advanceTimersByTime(100);
      expect(spawn).toHaveBeenCalledTimes(2); // cleanup + heartbeat
      
      // Второе выполнение
      jest.advanceTimersByTime(100);
      expect(spawn).toHaveBeenCalledTimes(4); // cleanup + heartbeat x2
      
      housekeepingManager.stop();
      
      // После остановки новых вызовов быть не должно
      jest.advanceTimersByTime(200);
      expect(spawn).toHaveBeenCalledTimes(4); // Количество не изменилось
      
      jest.useRealTimers();
    });

    test('должен использовать правильные пути и аргументы для task-manager', () => {
      jest.useFakeTimers();
      
      const customPath = '/custom/task-manager/cli.js';
      const customManager = new HousekeepingManager({
        logger: mockLogger,
        interval: 100,
        taskManagerCliPath: customPath
      });
      
      customManager.start();
      
      jest.advanceTimersByTime(100);
      
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        [customPath, 'cleanup'],
        { stdio: 'inherit' }
      );
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        [customPath, 'heartbeat'],
        { stdio: 'inherit' }
      );
      
      customManager.stop();
      jest.useRealTimers();
    });

    test('должен правильно настраивать unref для таймера', () => {
      const mockTimer = {
        unref: jest.fn()
      };
      
      jest.spyOn(global, 'setInterval').mockReturnValue(mockTimer);
      
      housekeepingManager.start();
      
      expect(mockTimer.unref).toHaveBeenCalled();
      
      global.setInterval.mockRestore();
    });
  });

  describe('Обработка различных статусов процессов', () => {
    test('должен обрабатывать успешное завершение процессов', () => {
      jest.useFakeTimers();
      
      housekeepingManager.start();
      
      jest.advanceTimersByTime(100);
      
      // Проверяем, что ошибки не логировались
      expect(mockLogger.error).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('должен обрабатывать различные коды выхода', () => {
      jest.useFakeTimers();
      
      let callCount = 0;
      spawn.mockImplementation(() => {
        callCount++;
        const exitCode = callCount === 1 ? 0 : 2; // cleanup успешен, heartbeat с ошибкой
        
        return {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'close') {
              callback(exitCode);
            }
            return this;
          })
        };
      });
      
      housekeepingManager.start();
      
      jest.advanceTimersByTime(100);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[HousekeepingManager] task-manager heartbeat exited with code 2'
      );
      jest.useRealTimers();
    });
  });
});