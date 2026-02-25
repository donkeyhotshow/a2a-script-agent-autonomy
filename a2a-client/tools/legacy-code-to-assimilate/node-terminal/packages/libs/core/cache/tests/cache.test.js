const CacheUtils = require('../index.js');
const path = require('path');

// Мокаем зависимости
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')), // Упрощенный join для тестов
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn(() => 'mocked-hash'),
}));

jest.mock('../logging', () => ({
  LoggingUtils: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const fs = require('fs').promises;
const fsSync = require('fs');
const { LoggingUtils } = require('../logging');

describe('CacheUtils', () => {
  let cacheUtils;
  let mockLoggerInstance;
  const mockCacheDir = '/mock/cache/dir';

  beforeEach(() => {
    mockLoggerInstance = new LoggingUtils();
    cacheUtils = new CacheUtils({
      logger: mockLoggerInstance,
      cacheDir: mockCacheDir,
      config: { enabled: true, ttl: 100, maxSize: 2 }
    });
    jest.clearAllMocks();
    // Мокаем setInterval, чтобы не запускать реальные таймеры
    jest.spyOn(global, 'setInterval').mockReturnValue('mockIntervalId');
    jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-01T00:00:00.000Z'));

  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('должен инициализироваться с дефолтными опциями', () => {
      const defaultCache = new CacheUtils();
      expect(defaultCache.logger).toBeInstanceOf(LoggingUtils);
      expect(defaultCache.config.enabled).toBe(true);
      expect(defaultCache.config.ttl).toBe(300000);
      expect(defaultCache.config.maxSize).toBe(1000);
      expect(defaultCache.cacheDir).toBe(path.join(process.cwd(), 'var/cache'));
      expect(defaultCache.cache).toBeInstanceOf(Map);
      expect(defaultCache.stats).toEqual({ hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 });
      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Система кэширования инициализирована', expect.any(Object));
    });

    test('должен инициализироваться с пользовательскими опциями', () => {
      expect(cacheUtils.logger).toBe(mockLoggerInstance);
      expect(cacheUtils.config.enabled).toBe(true);
      expect(cacheUtils.config.ttl).toBe(100);
      expect(cacheUtils.config.maxSize).toBe(2);
      expect(cacheUtils.cacheDir).toBe(mockCacheDir);
    });

    test('не должен инициализировать кэш, если config.enabled = false', () => {
      jest.clearAllMocks();
      const disabledCache = new CacheUtils({ logger: mockLoggerInstance, config: { enabled: false } });
      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Кэширование отключено');
      expect(global.setInterval).not.toHaveBeenCalled();
    });
  });

  describe('get и set', () => {
    test('должен устанавливать и получать значение', () => {
      cacheUtils.set('key1', 'value1');
      expect(cacheUtils.get('key1')).toBe('value1');
      expect(cacheUtils.stats.sets).toBe(1);
      expect(cacheUtils.stats.hits).toBe(1);
      expect(cacheUtils.stats.misses).toBe(0);
    });

    test('должен возвращать null для несуществующего ключа', () => {
      expect(cacheUtils.get('nonexistent')).toBeNull();
      expect(cacheUtils.stats.misses).toBe(1);
    });

    test('должен возвращать null для просроченного ключа', () => {
      cacheUtils.set('key-expired', 'value-expired', 10); // TTL 10ms
      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:10.000Z'));
      jest.advanceTimersByTime(11); // Перематываем время на 11ms
      expect(cacheUtils.get('key-expired')).toBeNull();
      expect(cacheUtils.stats.deletes).toBe(1); // Должен удалить просроченный ключ
      expect(cacheUtils.stats.misses).toBe(1);
    });

    test('должен корректно обрабатывать сложные объекты', () => {
      const obj = { a: 1, b: [2, 3] };
      cacheUtils.set('objKey', obj);
      expect(cacheUtils.get('objKey')).toEqual(obj);
      expect(cacheUtils.get('objKey')).not.toBe(obj); // Должен возвращать копию
    });
  });

  describe('has', () => {
    test('должен возвращать true для существующего ключа', () => {
      cacheUtils.set('key1', 'value1');
      expect(cacheUtils.has('key1')).toBe(true);
    });

    test('должен возвращать false для несуществующего ключа', () => {
      expect(cacheUtils.has('nonexistent')).toBe(false);
    });

    test('должен возвращать false для просроченного ключа', () => {
      cacheUtils.set('key-expired', 'value-expired', 10);
      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:10.000Z'));
      jest.advanceTimersByTime(11);
      expect(cacheUtils.has('key-expired')).toBe(false);
      expect(cacheUtils.stats.deletes).toBe(1);
    });
  });

  describe('delete', () => {
    test('должен удалять существующий ключ', () => {
      cacheUtils.set('key1', 'value1');
      expect(cacheUtils.has('key1')).toBe(true);
      cacheUtils.delete('key1');
      expect(cacheUtils.has('key1')).toBe(false);
      expect(cacheUtils.stats.deletes).toBe(1);
    });

    test('должен возвращать false при попытке удалить несуществующий ключ', () => {
      expect(cacheUtils.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    test('должен полностью очищать кэш', () => {
      cacheUtils.set('key1', 'value1');
      cacheUtils.set('key2', 'value2');
      expect(cacheUtils.size()).toBe(2);
      cacheUtils.clear();
      expect(cacheUtils.size()).toBe(0);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Кэш полностью очищен, удалено 2 записей');
    });
  });

  describe('size', () => {
    test('должен возвращать текущий размер кэша', () => {
      expect(cacheUtils.size()).toBe(0);
      cacheUtils.set('key1', 'value1');
      expect(cacheUtils.size()).toBe(1);
      cacheUtils.set('key2', 'value2');
      expect(cacheUtils.size()).toBe(2);
    });
  });

  describe('keys', () => {
    test('должен возвращать все ключи кэша', () => {
      cacheUtils.set('key1', 'value1');
      cacheUtils.set('key2', 'value2');
      expect(cacheUtils.keys()).toEqual(['key1', 'key2']);
    });
  });

  describe('getOrSet', () => {
    test('должен возвращать кэшированное значение, если оно существует', async () => {
      const fetchFn = jest.fn(() => Promise.resolve('fetched-value'));
      cacheUtils.set('cached-key', 'cached-value');
      const result = await cacheUtils.getOrSet('cached-key', fetchFn);
      expect(result).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('должен получать и устанавливать значение, если оно отсутствует', async () => {
      const fetchFn = jest.fn(() => Promise.resolve('fetched-value'));
      const result = await cacheUtils.getOrSet('new-key', fetchFn);
      expect(result).toBe('fetched-value');
      expect(fetchFn).toHaveBeenCalled();
      expect(cacheUtils.get('new-key')).toBe('fetched-value');
    });

    test('должен обрабатывать ошибки из fetchFunction', async () => {
      const fetchFn = jest.fn(() => Promise.reject(new Error('Fetch error')));
      await expect(cacheUtils.getOrSet('error-key', fetchFn)).rejects.toThrow('Fetch error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка получения данных для кэша:', expect.any(Error));
      expect(cacheUtils.has('error-key')).toBe(false);
    });
  });

  describe('mget и mset', () => {
    test('должен устанавливать несколько значений', () => {
      cacheUtils.mset({ keyA: 'valueA', keyB: 'valueB' });
      expect(cacheUtils.get('keyA')).toBe('valueA');
      expect(cacheUtils.get('keyB')).toBe('valueB');
      expect(cacheUtils.stats.sets).toBe(2);
    });

    test('должен получать несколько значений', () => {
      cacheUtils.set('keyX', 'valueX');
      cacheUtils.set('keyY', 'valueY');
      const results = cacheUtils.mget(['keyX', 'keyY', 'keyZ']);
      expect(results).toEqual({ keyX: 'valueX', keyY: 'valueY', keyZ: null });
    });
  });

  describe('deletePattern', () => {
    test('должен удалять ключи по паттерну', () => {
      cacheUtils.set('prefix-1', 1);
      cacheUtils.set('prefix-2', 2);
      cacheUtils.set('other-3', 3);
      
      const deletedCount = cacheUtils.deletePattern('^prefix-');
      expect(deletedCount).toBe(2);
      expect(cacheUtils.has('prefix-1')).toBe(false);
      expect(cacheUtils.has('prefix-2')).toBe(false);
      expect(cacheUtils.has('other-3')).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('должен удалять просроченные записи', () => {
      cacheUtils.set('expired-item', 'data', 10); // Просрочится
      cacheUtils.set('valid-item', 'data', 100000); // Останется

      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:10.000Z'));
      jest.advanceTimersByTime(11);
      
      const cleaned = cacheUtils.cleanup();
      expect(cleaned).toBe(1);
      expect(cacheUtils.has('expired-item')).toBe(false);
      expect(cacheUtils.has('valid-item')).toBe(true);
    });
  });

  describe('evictLRU', () => {
    test('должен вытеснять наименее используемые элементы при достижении maxSize', () => {
      cacheUtils.set('oldest', 1); // TTL 100
      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:01.000Z'));
      cacheUtils.set('middle', 2); // TTL 100
      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:02.000Z'));
      cacheUtils.set('newest', 3); // maxSize = 2, поэтому 'oldest' должен быть вытеснен
      
      expect(cacheUtils.size()).toBe(2);
      expect(cacheUtils.has('oldest')).toBe(false);
      expect(cacheUtils.has('middle')).toBe(true);
      expect(cacheUtils.has('newest')).toBe(true);
    });
  });

  describe('getStats', () => {
    test('должен возвращать правильную статистику кэша', () => {
      cacheUtils.set('k1', 'v1');
      cacheUtils.get('k1');
      cacheUtils.get('k2'); // miss
      cacheUtils.delete('k1');

      const stats = cacheUtils.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.currentSize).toBe(0);
      expect(stats.hitRate).toBe('50.00%');
      expect(stats.enabled).toBe(true);
    });
  });

  describe('saveToDisk и loadFromDisk', () => {
    test('должен сохранять кэш на диск и загружать его обратно', async () => {
      fs.mkdir.mockResolvedValueOnce(true);
      fs.writeFile.mockResolvedValueOnce(true);
      fsSync.existsSync.mockReturnValueOnce(true);
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        'disk-key': { value: 'disk-value', expiresAt: Date.now() + 100000 }
      }));

      cacheUtils.set('disk-key', 'disk-value');
      const saveResult = await cacheUtils.saveToDisk('test-cache.json');
      expect(saveResult.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith(mockCacheDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${mockCacheDir}/test-cache.json`,
        JSON.stringify({ 'disk-key': { value: 'disk-value', expiresAt: expect.any(Number) } }, null, 2),
        'utf8'
      );
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(`Кэш сохранен в ${mockCacheDir}/test-cache.json`);

      cacheUtils.clear(); // Очищаем кэш в памяти
      const loadResult = await cacheUtils.loadFromDisk('test-cache.json');
      expect(loadResult.success).toBe(true);
      expect(cacheUtils.get('disk-key')).toBe('disk-value');
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(`Кэш загружен из ${mockCacheDir}/test-cache.json, записей: 1`);
    });

    test('должен обрабатывать ошибки при сохранении на диск', async () => {
      fs.mkdir.mockRejectedValueOnce(new Error('Disk error'));
      const saveResult = await cacheUtils.saveToDisk('test-cache.json');
      expect(saveResult.success).toBe(false);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        `Ошибка при сохранении кэша на диск (${mockCacheDir}/test-cache.json): Disk error`
      );
    });

    test('должен обрабатывать ошибки при загрузке с диска', async () => {
      fsSync.existsSync.mockReturnValueOnce(true);
      fs.readFile.mockRejectedValueOnce(new Error('Read error'));
      const loadResult = await cacheUtils.loadFromDisk('test-cache.json');
      expect(loadResult.success).toBe(false);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        `Ошибка при загрузке кэша с диска (${mockCacheDir}/test-cache.json): Read error`
      );
    });

    test('должен пропускать просроченные записи при загрузке с диска', async () => {
      fs.mkdir.mockResolvedValueOnce(true);
      fs.writeFile.mockResolvedValueOnce(true);
      fsSync.existsSync.mockReturnValueOnce(true);
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        'valid-key': { value: 'valid-value', expiresAt: Date.now() + 100000 },
        'expired-key': { value: 'expired-value', expiresAt: Date.now() - 100000 }
      }));

      cacheUtils.set('initial-key', 'initial-value');
      await cacheUtils.saveToDisk('mixed-cache.json');
      cacheUtils.clear();

      const loadResult = await cacheUtils.loadFromDisk('mixed-cache.json');
      expect(loadResult.success).toBe(true);
      expect(cacheUtils.has('valid-key')).toBe(true);
      expect(cacheUtils.has('expired-key')).toBe(false);
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('Пропущена просроченная запись кэша при загрузке: expired-key');
    });

    test('должен логировать, если файл кэша не найден при загрузке', async () => {
      fsSync.existsSync.mockReturnValueOnce(false);
      const loadResult = await cacheUtils.loadFromDisk('nonexistent-cache.json');
      expect(loadResult.success).toBe(false);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        `Файл кэша не найден: ${mockCacheDir}/nonexistent-cache.json`
      );
    });
  });

  describe('middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;

    beforeEach(() => {
      mockRequest = { method: 'GET', originalUrl: '/api/data' };
      mockResponse = {
        statusCode: 200,
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    test('должен передавать управление дальше, если кэширование отключено', () => {
      const disabledCache = new CacheUtils({ logger: mockLoggerInstance, config: { enabled: false } });
      const middleware = disabledCache.middleware();
      middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    test('должен возвращать кэшированный ответ при попадании в кэш', () => {
      cacheUtils.set('http:GET:/api/data', { status: 200, data: { message: 'cached' } });
      const middleware = cacheUtils.middleware();
      middleware(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'cached' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('Cache hit for http:GET:/api/data');
    });

    test('должен кэшировать ответ при промахе в кэше', () => {
      const middleware = cacheUtils.middleware();
      middleware(mockRequest, mockResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(cacheUtils.has('http:GET:/api/data')).toBe(false); // Еще не кэшировано

      // Имитируем отправку ответа через res.json
      mockResponse.json({ message: 'new data' });
      expect(cacheUtils.has('http:GET:/api/data')).toBe(true);
      expect(cacheUtils.get('http:GET:/api/data')).toEqual({ status: 200, data: { message: 'new data' } });
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('Cache miss for http:GET:/api/data, setting cache');
    });

    test('middleware должен использовать заданный TTL', () => {
      cacheUtils.set('http:GET:/api/test-ttl', { status: 200, data: {} }, 50);
      const middleware = cacheUtils.middleware(20); // Переопределяем TTL на 20ms
      middleware({ method: 'GET', originalUrl: '/api/test-ttl' }, mockResponse, mockNext);
      jest.spyOn(global, 'Date').mockImplementationOnce(() => new Date('2024-01-01T00:00:20.000Z'));
      jest.advanceTimersByTime(21); // Перематываем время на 21ms
      mockResponse.json({ message: 'new data with short ttl' });

      expect(cacheUtils.get('http:GET:/api/test-ttl')).toBeNull(); // Должно просрочиться
    });
  });
});

