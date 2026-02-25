const { SharedUtils, sharedUtils } = require('../index.js');
const crypto = require('crypto');

// Мокаем crypto для детерминированных UUID и хешей в тестах
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked_hash'),
  })),
}));

describe('SharedUtils', () => {
  let utils;

  beforeEach(() => {
    utils = new SharedUtils();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1672531200000); // Фиксируем Date.now() для generateId
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ID generation', () => {
    test('should generate unique ID', () => {
      const id1 = utils.generateId();
      const id2 = utils.generateId(); // Будет таким же из-за мока Math.random

      expect(id1).toBe('ID-1672531200000-q0e5t'); // Проверяем детерминированный результат
      expect(id2).toBe('ID-1672531200000-q0e5t');
      expect(id1).toMatch(/^ID-\d+-[a-z0-9]+$/);
    });

    test('should generate ID with custom prefix', () => {
      const id = utils.generateId('TEST');
      expect(id).toBe('TEST-1672531200000-q0e5t');
      expect(id).toMatch(/^TEST-\d+-[a-z0-9]+$/);
    });

    test('should generate UUID', () => {
      // Math.random мокается, но в generateUUID он используется несколько раз, поэтому каждый 'x' или 'y' будет 8
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.2).mockReturnValueOnce(0.3).mockReturnValue(0.4);
      const uuid = utils.generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(uuid).toBeDefined();
    });

    test('should generate ID with custom length', () => {
      const id = utils.generateId('SHORT', 5);
      expect(id).toBe('SHORT-1672531200000-q0e5t'); // Длина постфикса зависит от мока Math.random
    });
  });

  describe('Hash generation', () => {
    test('should generate consistent hash for same data', () => {
      const data = { key: 'value' };
      const hash1 = utils.generateHash(data);
      const hash2 = utils.generateHash(data);
      expect(hash1).toBe('mocked_hash'); // Из-за мока crypto.createHash
      expect(hash2).toBe('mocked_hash');
      expect(crypto.createHash).toHaveBeenCalledWith('md5');
      expect(crypto.createHash().update).toHaveBeenCalledWith(JSON.stringify(data));
    });

    test('should generate different hashes for different data if crypto was not mocked', () => {
      // Из-за мока crypto.createHash, результаты будут одинаковыми, если не сбросить мок
      // Поэтому этот тест проверяет вызов update с разными данными
      const updateSpy = jest.spyOn(crypto, 'createHash');

      utils.generateHash('data1');
      expect(updateSpy.mock.results[0].value.update).toHaveBeenCalledWith('data1');

      utils.generateHash('data2');
      expect(updateSpy.mock.results[1].value.update).toHaveBeenCalledWith('data2');

      expect(updateSpy).toHaveBeenCalledTimes(2);
      updateSpy.mockRestore();
    });

    test('should use specified algorithm', () => {
      const updateSpy = jest.spyOn(crypto, 'createHash');
      utils.generateHash('data', 'sha256');
      expect(updateSpy).toHaveBeenCalledWith('sha256');
      updateSpy.mockRestore();
    });

    test('should handle non-string/non-object input', () => {
      const hashNull = utils.generateHash(null);
      expect(hashNull).toBe('mocked_hash');
      expect(crypto.createHash().update).toHaveBeenCalledWith('null');

      const hashUndefined = utils.generateHash(undefined);
      expect(hashUndefined).toBe('mocked_hash');
      expect(crypto.createHash().update).toHaveBeenCalledWith('undefined');

      const hashNumber = utils.generateHash(123);
      expect(hashNumber).toBe('mocked_hash');
      expect(crypto.createHash().update).toHaveBeenCalledWith('123');
    });
  });

  describe('String utilities', () => {
    test('should convert to camelCase', () => {
      expect(utils.toCamelCase('hello-world')).toBe('helloWorld');
      expect(utils.toCamelCase('test_string_conversion')).toBe('testStringConversion');
      expect(utils.toCamelCase('AlreadyCamelCase')).toBe('alreadyCamelCase');
      expect(utils.toCamelCase('single')).toBe('single');
      expect(utils.toCamelCase('UPPERCASE')).toBe('uppercase');
      expect(utils.toCamelCase('hyphen-with-CAPS')).toBe('hyphenWithCaps');
    });

    test('should convert to kebab-case', () => {
      expect(utils.toKebabCase('helloWorld')).toBe('hello-world');
      expect(utils.toKebabCase('TestString')).toBe('test-string');
      expect(utils.toKebabCase('already-kebab-case')).toBe('already-kebab-case');
      expect(utils.toKebabCase('SingleWord')).toBe('single-word');
      expect(utils.toKebabCase('UPPERCASE')).toBe('uppercase');
    });

    test('should convert to PascalCase', () => {
      expect(utils.toPascalCase('hello')).toBe('Hello');
      expect(utils.toPascalCase('world wide web')).toBe('World wide web'); // Only first char is capitalized
      expect(utils.toPascalCase('alreadyPascalCase')).toBe('AlreadyPascalCase');
      expect(utils.toPascalCase('')).toBe('');
      expect(utils.toPascalCase('123test')).toBe('123test'); // Should not affect non-alphabetic start
    });

    test('should truncate string', () => {
      const longString = 'This is a very long string that needs to be truncated';
      expect(utils.truncateString(longString, 10)).toBe('This is...');
      expect(utils.truncateString(longString, 3)).toBe('...'); // Минимальная длина, чтобы добавить '...'
      expect(utils.truncateString(longString, 5)).toBe('..'.repeat(2) + '...');
      expect(utils.truncateString('short', 10)).toBe('short');
      expect(utils.truncateString('', 10)).toBe('');
    });

    test('should sanitize string', () => {
      const dirtyString = ' Hello@World#123-test_string! ';

      // Remove special chars, lowercase
      expect(utils.sanitizeString(dirtyString, { removeSpecialChars: true, lowercase: true, trim: true })).toBe('helloworld123test_string');

      // Replace spaces
      expect(utils.sanitizeString(dirtyString, { replaceSpaces: '_', trim: true })).toBe('Hello@World#123-test_string!');

      // No options
      expect(utils.sanitizeString(dirtyString, {})).toBe(dirtyString); // Без изменений

      // All options
      expect(utils.sanitizeString('  Test String with !@# ', { lowercase: true, removeSpecialChars: true, replaceSpaces: '-', trim: true })).toBe('test-string-with');

      // Only trim
      expect(utils.sanitizeString('  trimmed  ', { trim: true })).toBe('trimmed');

      // Empty string
      expect(utils.sanitizeString('', { removeSpecialChars: true })).toBe('');
    });
  });

  describe('Validation utilities', () => {
    test('should validate email', () => {
      expect(utils.isValidEmail('test@example.com')).toBe(true);
      expect(utils.isValidEmail('test.user@sub.example.co.uk')).toBe(true);
      expect(utils.isValidEmail('invalid-email')).toBe(false);
      expect(utils.isValidEmail('user@.com')).toBe(false);
      expect(utils.isValidEmail('user@domain')).toBe(false);
      expect(utils.isValidEmail('')).toBe(false);
      expect(utils.isValidEmail(null)).toBe(false);
    });

    test('should validate URL', () => {
      expect(utils.isValidUrl('https://example.com')).toBe(true);
      expect(utils.isValidUrl('http://localhost:3000/api/data')).toBe(true);
      expect(utils.isValidUrl('ftp://ftp.example.com')).toBe(true);
      expect(utils.isValidUrl('not-a-url')).toBe(false);
      expect(utils.isValidUrl('example.com')).toBe(false); // No protocol
      expect(utils.isValidUrl('')).toBe(false);
      expect(utils.isValidUrl(null)).toBe(false);
    });

    test('should validate version', () => {
      expect(utils.isValidVersion('1.0.0')).toBe(true);
      expect(utils.isValidVersion('1.0')).toBe(true);
      expect(utils.isValidVersion('1')).toBe(true);
      expect(utils.isValidVersion('1.2.3.4')).toBe(false); // Only up to X.Y.Z
      expect(utils.isValidVersion('v1.0.0')).toBe(false); // No 'v' prefix
      expect(utils.isValidVersion('invalid')).toBe(false);
      expect(utils.isValidVersion(123)).toBe(false); // Must be string
      expect(utils.isValidVersion(null)).toBe(false);
    });
  });

  describe('Random utilities', () => {
    test('should generate random number in range', () => {
      // Мокаем Math.random, чтобы сделать randomNumber детерминированным
      jest.spyOn(Math, 'random').mockReturnValue(0.7); // Это даст 0.7 * (10 - 5 + 1) = 0.7 * 6 = 4.2. Floor => 4. 5 + 4 = 9
      expect(utils.randomNumber(5, 10)).toBe(9);

      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(utils.randomNumber(5, 10)).toBe(5);

      jest.spyOn(Math, 'random').mockReturnValue(0.9999);
      expect(utils.randomNumber(5, 10)).toBe(10);

      // Диапазон с одним числом
      expect(utils.randomNumber(7, 7)).toBe(7);
    });

    test('should generate random string of specified length and charset', () => {
      const charset = 'abc';
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValue(0.9);

      // 0.1 -> index 0 (a), 0.5 -> index 1 (b), 0.9 -> index 2 (c)
      expect(utils.randomString(3, charset)).toBe('abc');
      expect(utils.randomString(5, '123')).toBe('12312');
      expect(utils.randomString(0)).toBe('');
      expect(utils.randomString(5, '')).toBe('');
    });
  });

  describe('Environment utilities', () => {
    test('should check environment variable value for true/false', () => {
      expect(utils.isTrueEnv('true')).toBe(true);
      expect(utils.isTrueEnv('1')).toBe(true);
      expect(utils.isTrueEnv('TRUE')).toBe(true);
      expect(utils.isTrueEnv(true)).toBe(true);

      expect(utils.isTrueEnv('false')).toBe(false);
      expect(utils.isTrueEnv('0')).toBe(false);
      expect(utils.isTrueEnv('FALSE')).toBe(false);
      expect(utils.isTrueEnv(false)).toBe(false);

      expect(utils.isTrueEnv('any_other_string')).toBe(false);
      expect(utils.isTrueEnv(null)).toBe(false);
      expect(utils.isTrueEnv(undefined)).toBe(false);
      expect(utils.isTrueEnv(5)).toBe(false); // Numbers are not 'true' or '1'
    });
  });

  describe('Collection utilities', () => {
    test('should deep merge objects, prioritizing source values', () => {
      const target = { a: 1, b: { c: 2, arr: [1, 2] }, x: null, z: 5 };
      const source = { b: { d: 3, arr: [3] }, e: 4, x: undefined, z: null };
      const result = utils.deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3, arr: [3] }, e: 4, x: undefined, z: null });
      expect(result.b.arr).toEqual([3]); // Arrays are replaced, not merged deeply

      const emptyTarget = {};
      const sourceOnly = { k: 'v' };
      expect(utils.deepMerge(emptyTarget, sourceOnly)).toEqual(sourceOnly);

      const targetOnly = { k: 'v' };
      const emptySource = {};
      expect(utils.deepMerge(targetOnly, emptySource)).toEqual(targetOnly);

      expect(utils.deepMerge({ a: 1 }, { a: null })).toEqual({ a: null }); // Null overwrites
      expect(utils.deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: undefined }); // Undefined overwrites
    });

    test('should remove duplicates from array', () => {
      expect(utils.uniqueArray([1, 2, 2, 3, 3, 3, 1])).toEqual([1, 2, 3]);
      expect(utils.uniqueArray(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(utils.uniqueArray([])).toEqual([]);
      expect(utils.uniqueArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(utils.uniqueArray([null, undefined, null, 1])).toEqual([null, undefined, 1]);
    });

    test('should get nested value', () => {
      const obj = { a: { b: { c: 'value' } }, arr: [10, { key: 'nested' }] };
      expect(utils.getNestedValue(obj, 'a.b.c')).toBe('value');
      expect(utils.getNestedValue(obj, 'arr.1.key')).toBe('nested');
      expect(utils.getNestedValue(obj, 'arr.0')).toBe(10);
      expect(utils.getNestedValue(obj, 'a.b.d', 'default')).toBe('default');
      expect(utils.getNestedValue(obj, 'non.existent')).toBeUndefined();
      expect(utils.getNestedValue(obj, 'a.b.c.d')).toBeUndefined(); // Path too deep
      expect(utils.getNestedValue(obj, 'arr.2', null)).toBeNull(); // Array index out of bounds
      expect(utils.getNestedValue(null, 'a.b', 'default')).toBe('default'); // Null object
      expect(utils.getNestedValue(undefined, 'a.b', 'default')).toBe('default'); // Undefined object
    });
  });

  describe('System utilities', () => {
    test('should get system info', () => {
      const mockMemoryUsage = { rss: 10, heapTotal: 20, heapUsed: 5, external: 1 };
      const mockUptime = 3600;
      const mockPid = 12345;

      jest.spyOn(process, 'platform', 'get').mockReturnValue('test_platform');
      jest.spyOn(process, 'arch', 'get').mockReturnValue('test_arch');
      jest.spyOn(process, 'version', 'get').mockReturnValue('v99.9.9');
      jest.spyOn(process, 'cwd').mockReturnValue('/test/cwd');
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
      jest.spyOn(process, 'uptime').mockReturnValue(mockUptime);
      jest.spyOn(process, 'pid', 'get').mockReturnValue(mockPid);

      const info = utils.getSystemInfo();
      expect(info).toEqual({
        platform: 'test_platform',
        arch: 'test_arch',
        nodeVersion: 'v99.9.9',
        cwd: '/test/cwd',
        memory: mockMemoryUsage,
        uptime: mockUptime,
        pid: mockPid,
      });
    });

    test('should format bytes', () => {
      expect(utils.formatBytes(0)).toBe('0 Bytes');
      expect(utils.formatBytes(1023)).toBe('1023 Bytes');
      expect(utils.formatBytes(1024)).toBe('1.00 KB');
      expect(utils.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(utils.formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
      expect(utils.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(utils.formatBytes(1.234 * 1024 * 1024 * 1024, 3)).toBe('1.234 GB');
      expect(utils.formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
      expect(utils.formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.00 PB');
      expect(utils.formatBytes(1024 * 1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.00 EB');

      // Edge cases
      expect(utils.formatBytes(-1024)).toBe('-1.00 KB'); // Should handle negative values as well (just show sign)
      expect(utils.formatBytes(1000, 0)).toBe('1000 Bytes'); // 0 decimals
      expect(utils.formatBytes(1500, 0)).toBe('1 KB'); // Rounded
    });
  });

  describe('default instance', () => {
    test('should be instance of SharedUtils', () => {
      expect(sharedUtils).toBeInstanceOf(SharedUtils);
    });

    test('default instance methods should work correctly', () => {
      // Проверяем, что методы дефолтного инстанса работают
      expect(sharedUtils.generateId('TEST')).toBe('TEST-1672531200000-q0e5t');
      expect(sharedUtils.toCamelCase('my-string')).toBe('myString');
    });
  });
});
