const { LoggingUtils, defaultLogger } = require('../index.js');

// TODO: Создать полные тесты для LoggingUtils
describe('LoggingUtils', () => {
  let logger;

  beforeEach(() => {
    logger = new LoggingUtils();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      // TODO: Протестировать инициализацию с дефолтными опциями
      expect(logger).toBeDefined();
    });

    test('should initialize with custom options', () => {
      // TODO: Протестировать инициализацию с кастомными опциями
      const customLogger = new LoggingUtils({
        level: 'debug',
        prefix: '[TEST]'
      });
      expect(customLogger.level).toBe('debug');
      expect(customLogger.prefix).toBe('[TEST]');
    });
  });

  describe('log methods', () => {
    test('should have info method', () => {
      // TODO: Протестировать метод info
      expect(typeof logger.info).toBe('function');
    });

    test('should have warn method', () => {
      // TODO: Протестировать метод warn
      expect(typeof logger.warn).toBe('function');
    });

    test('should have error method', () => {
      // TODO: Протестировать метод error
      expect(typeof logger.error).toBe('function');
    });

    test('should have debug method', () => {
      // TODO: Протестировать метод debug
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('configuration methods', () => {
    test('should set log level', () => {
      // TODO: Протестировать установку уровня логирования
      logger.setLevel('debug');
      expect(logger.level).toBe('debug');
    });

    test('should set enabled state', () => {
      // TODO: Протестировать включение/отключение логирования
      logger.setEnabled(false);
      expect(logger.enabled).toBe(false);
    });

    test('should set prefix', () => {
      // TODO: Протестировать установку префикса
      logger.setPrefix('[CUSTOM]');
      expect(logger.prefix).toBe('[CUSTOM]');
    });
  });

  describe('defaultLogger', () => {
    test('should be instance of LoggingUtils', () => {
      // TODO: Проверить что defaultLogger является экземпляром LoggingUtils
      expect(defaultLogger).toBeInstanceOf(LoggingUtils);
    });
  });
});

