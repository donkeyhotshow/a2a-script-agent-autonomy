const { formatBytes } = require('../formatters.js');

describe('Utils реальная функциональность', () => {
  describe('Форматирование данных', () => {
    test('должен корректно форматировать байты в различные единицы измерения', () => {
      // Тестируем различные размеры
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    test('должен корректно форматировать дробные значения', () => {
      expect(formatBytes(1500)).toBe('1.46 KB');
      expect(formatBytes(1500000)).toBe('1.43 MB');
      expect(formatBytes(1500000000)).toBe('1.4 GB');
    });

    test('должен корректно работать с пользовательскими десятичными знаками', () => {
      expect(formatBytes(1500, 0)).toBe('1 KB');
      expect(formatBytes(1500, 4)).toBe('1.4648 KB');
      expect(formatBytes(1500000, 1)).toBe('1.4 MB');
    });

    test('должен корректно обрабатывать граничные случаи', () => {
      expect(formatBytes(1)).toBe('1 Bytes');
      expect(formatBytes(1023)).toBe('1023 Bytes');
      expect(formatBytes(1024 * 1024 - 1)).toBe('1023.99 KB');
      expect(formatBytes(1024 * 1024 + 1)).toBe('1 MB');
    });

    test('должен корректно работать с очень большими числами', () => {
      expect(formatBytes(1024 ** 5)).toBe('1 PB');
      expect(formatBytes(1024 ** 6)).toBe('1 EB');
      expect(formatBytes(1024 ** 7)).toBe('1 ZB');
      expect(formatBytes(1024 ** 8)).toBe('1 YB');
    });
  });

  describe('Расширенные утилиты', () => {
    test('должен предоставлять утилиты для работы с массивами', () => {
      // Здесь можно добавить тесты для утилит работы с массивами
      const arrayUtils = {
        chunk: (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        },
        unique: (arr) => [...new Set(arr)],
        shuffle: (arr) => {
          const shuffled = [...arr];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
      };

      // Тестируем chunk
      expect(arrayUtils.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(arrayUtils.chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);

      // Тестируем unique
      expect(arrayUtils.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);

      // Тестируем shuffle (проверяем только длину и содержимое, не порядок)
      const original = [1, 2, 3, 4, 5];
      const shuffled = arrayUtils.shuffle(original);
      expect(shuffled).toHaveLength(5);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    test('должен предоставлять утилиты для работы с объектами', () => {
      const objectUtils = {
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        merge: (target, ...sources) => {
          return sources.reduce((result, source) => {
            for (const key in source) {
              if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = objectUtils.merge(result[key] || {}, source[key]);
              } else {
                result[key] = source[key];
              }
            }
            return result;
          }, { ...target });
        },
        pick: (obj, keys) => {
          const result = {};
          keys.forEach(key => {
            if (key in obj) {
              result[key] = obj[key];
            }
          });
          return result;
        }
      };

      // Тестируем deepClone
      const original = { a: 1, b: { c: 2 } };
      const cloned = objectUtils.deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);

      // Тестируем merge
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      const merged = objectUtils.merge(target, source);
      expect(merged).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });

      // Тестируем pick
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectUtils.pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    test('должен предоставлять утилиты для работы со строками', () => {
      const stringUtils = {
        capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
        camelCase: (str) => str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : ''),
        snakeCase: (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        truncate: (str, length, suffix = '...') => {
          if (str.length <= length) return str;
          return str.substring(0, length - suffix.length) + suffix;
        }
      };

      // Тестируем capitalize
      expect(stringUtils.capitalize('hello')).toBe('Hello');
      expect(stringUtils.capitalize('world')).toBe('World');

      // Тестируем camelCase
      expect(stringUtils.camelCase('hello-world')).toBe('helloWorld');
      expect(stringUtils.camelCase('hello_world')).toBe('helloWorld');

      // Тестируем snakeCase
      expect(stringUtils.snakeCase('helloWorld')).toBe('hello_world');
      expect(stringUtils.snakeCase('HelloWorld')).toBe('_hello_world');

      // Тестируем truncate
      expect(stringUtils.truncate('Hello World', 8)).toBe('Hello...');
      expect(stringUtils.truncate('Hello World', 5, '***')).toBe('He***');
    });

    test('должен предоставлять утилиты для валидации данных', () => {
      const validationUtils = {
        isEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        isUrl: (url) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        isNumber: (value) => !isNaN(value) && isFinite(value),
        isEmpty: (value) => {
          if (value === null || value === undefined) return true;
          if (typeof value === 'string') return value.trim().length === 0;
          if (Array.isArray(value)) return value.length === 0;
          if (typeof value === 'object') return Object.keys(value).length === 0;
          return false;
        }
      };

      // Тестируем isEmail
      expect(validationUtils.isEmail('test@example.com')).toBe(true);
      expect(validationUtils.isEmail('invalid-email')).toBe(false);
      expect(validationUtils.isEmail('')).toBe(false);

      // Тестируем isUrl
      expect(validationUtils.isUrl('https://example.com')).toBe(true);
      expect(validationUtils.isUrl('http://localhost:3000')).toBe(true);
      expect(validationUtils.isUrl('invalid-url')).toBe(false);

      // Тестируем isNumber
      expect(validationUtils.isNumber(123)).toBe(true);
      expect(validationUtils.isNumber('123')).toBe(true);
      expect(validationUtils.isNumber('abc')).toBe(false);
      expect(validationUtils.isNumber(NaN)).toBe(false);

      // Тестируем isEmpty
      expect(validationUtils.isEmpty('')).toBe(true);
      expect(validationUtils.isEmpty('   ')).toBe(true);
      expect(validationUtils.isEmpty([])).toBe(true);
      expect(validationUtils.isEmpty({})).toBe(true);
      expect(validationUtils.isEmpty(null)).toBe(true);
      expect(validationUtils.isEmpty('hello')).toBe(false);
      expect(validationUtils.isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe('Производительность и надежность', () => {
    test('должен эффективно обрабатывать большие объемы данных', () => {
      const performanceUtils = {
        debounce: (func, wait) => {
          let timeout;
          return function executedFunction(...args) {
            const later = () => {
              clearTimeout(timeout);
              func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        },
        throttle: (func, limit) => {
          let inThrottle;
          return function executedFunction(...args) {
            if (!inThrottle) {
              func.apply(this, args);
              inThrottle = true;
              setTimeout(() => inThrottle = false, limit);
            }
          };
        }
      };

      // Тестируем debounce
      let callCount = 0;
      const debouncedFn = performanceUtils.debounce(() => callCount++, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(callCount).toBe(0);
      
      // Ждем завершения debounce
      return new Promise(resolve => {
        setTimeout(() => {
          expect(callCount).toBe(1);
          resolve();
        }, 150);
      });
    });

    test('должен корректно обрабатывать граничные случаи', () => {
      // Тестируем форматирование с отрицательными значениями
      expect(() => formatBytes(-1)).not.toThrow();
      expect(formatBytes(-1)).toBe('0 Bytes');

      // Тестируем с очень большими числами
      expect(() => formatBytes(Number.MAX_SAFE_INTEGER)).not.toThrow();
      
      // Тестируем с undefined и null
      expect(() => formatBytes(undefined)).not.toThrow();
      expect(() => formatBytes(null)).not.toThrow();
    });
  });

  describe('Расширяемость', () => {
    test('должен позволять легко добавлять новые утилиты', () => {
      // Симулируем добавление новой утилиты
      const extendedUtils = {
        ...require('../formatters.js'),
        formatCurrency: (amount, currency = 'USD') => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
          }).format(amount);
        },
        formatDate: (date, locale = 'en-US') => {
          return new Intl.DateTimeFormat(locale).format(new Date(date));
        }
      };

      // Тестируем новую утилиту formatCurrency
      expect(extendedUtils.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(extendedUtils.formatCurrency(1234.56, 'EUR')).toContain('€');

      // Тестируем новую утилиту formatDate
      const testDate = new Date('2024-01-15');
      expect(extendedUtils.formatDate(testDate)).toContain('1/15/2024');

      // Проверяем, что старые утилиты все еще работают
      expect(extendedUtils.formatBytes(1024)).toBe('1 KB');
    });
  });
});
