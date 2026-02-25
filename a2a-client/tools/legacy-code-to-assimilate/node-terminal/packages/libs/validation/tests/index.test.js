const { ValidationUtils } = require('../index.js');

describe('Validation Index', () => {
  let validationUtils;

  beforeEach(() => {
    validationUtils = new ValidationUtils();
  });

  describe('ValidationUtils constructor', () => {
    test('должен создавать экземпляр с дефолтными опциями', () => {
      expect(validationUtils).toBeInstanceOf(ValidationUtils);
      expect(validationUtils.getSchema).toBeDefined();
      expect(typeof validationUtils.getSchema).toBe('function');
    });

    test('должен принимать кастомные опции', () => {
      const customGetSchema = jest.fn();
      const customUtils = new ValidationUtils({ getSchema: customGetSchema });
      
      expect(customUtils.getSchema).toBe(customGetSchema);
    });
  });

  describe('validate method', () => {
    test('должен валидировать корректные данные', () => {
      const data = { name: 'John', age: 25, email: 'john@example.com' };
      const schema = {
        name: { type: 'string', min: 2, max: 50 },
        age: { type: 'number', min: 18, max: 100 },
        email: { type: 'string', format: 'email' }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('должен обнаруживать ошибки типа', () => {
      const data = { name: 123, age: '25' };
      const schema = {
        name: { type: 'string' },
        age: { type: 'number' }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('Type mismatch: expected string, got number');
      expect(result.errors.age).toContain('Type mismatch: expected number, got string');
    });

    test('должен валидировать минимальные значения', () => {
      const data = { name: 'A', age: 15 };
      const schema = {
        name: { type: 'string', min: 2 },
        age: { type: 'number', min: 18 }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('name must be at least 2 characters');
      expect(result.errors.age).toContain('age must be at least 18');
    });

    test('должен валидировать максимальные значения', () => {
      const data = { name: 'VeryLongNameThatExceedsLimit', age: 150 };
      const schema = {
        name: { type: 'string', max: 20 },
        age: { type: 'number', max: 100 }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('name must be at most 20 characters');
      expect(result.errors.age).toContain('age must be at most 100');
    });

    test('должен валидировать email формат', () => {
      const data = { email: 'invalid-email' };
      const schema = { email: { type: 'string', format: 'email' } };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('email must be a valid email format');
    });

    test('должен валидировать обязательные поля', () => {
      const data = { name: 'John' };
      const schema = {
        name: { type: 'string', presence: { allowEmpty: false } },
        email: { type: 'string', presence: { allowEmpty: false } }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('email is required');
    });

    test('должен поддерживать кастомную валидацию', () => {
      const data = { code: 'ABC123' };
      const schema = {
        code: {
          type: 'string',
          custom: (value) => {
            if (!/^[A-Z]{3}\d{3}$/.test(value)) {
              return 'Code must be 3 uppercase letters followed by 3 digits';
            }
            return null;
          }
        }
      };

      const result = validationUtils.validate(data, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('checkRequiredFields method', () => {
    test('должен возвращать отсутствующие обязательные поля', () => {
      const obj = { name: 'John', age: 25 };
      const requiredFields = ['name', 'age', 'email', 'phone'];

      const missingFields = validationUtils.checkRequiredFields(obj, requiredFields);
      
      expect(missingFields).toEqual(['email', 'phone']);
    });

    test('должен возвращать пустой массив для всех присутствующих полей', () => {
      const obj = { name: 'John', age: 25, email: 'john@example.com' };
      const requiredFields = ['name', 'age', 'email'];

      const missingFields = validationUtils.checkRequiredFields(obj, requiredFields);
      
      expect(missingFields).toEqual([]);
    });
  });

  describe('isInRange method', () => {
    test('должен возвращать true для значений в диапазоне', () => {
      expect(validationUtils.isInRange(5, 1, 10)).toBe(true);
      expect(validationUtils.isInRange(1, 1, 10)).toBe(true);
      expect(validationUtils.isInRange(10, 1, 10)).toBe(true);
    });

    test('должен возвращать false для значений вне диапазона', () => {
      expect(validationUtils.isInRange(0, 1, 10)).toBe(false);
      expect(validationUtils.isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('isNonEmptyArray method', () => {
    test('должен возвращать true для непустых массивов', () => {
      expect(validationUtils.isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(validationUtils.isNonEmptyArray(['a', 'b'])).toBe(true);
    });

    test('должен возвращать false для пустых массивов', () => {
      expect(validationUtils.isNonEmptyArray([])).toBe(false);
    });

    test('должен возвращать false для не-массивов', () => {
      expect(validationUtils.isNonEmptyArray(null)).toBe(false);
      expect(validationUtils.isNonEmptyArray('array')).toBe(false);
      expect(validationUtils.isNonEmptyArray(123)).toBe(false);
    });
  });

  describe('validateBaseline method', () => {
    test('должен валидировать базовые данные', () => {
      const data = { id: 1, name: 'Test', active: true };
      
      const result = validationUtils.validateBaseline(data);
      
      expect(typeof result).toBe('object');
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('должен обрабатывать некорректные данные', () => {
      const data = null;
      
      const result = validationUtils.validateBaseline(data);
      
      expect(typeof result).toBe('object');
      expect(result.isValid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Данные отсутствуют');
    });

    test('должен обрабатывать не-объекты', () => {
      const data = 'not an object';
      
      const result = validationUtils.validateBaseline(data);
      
      expect(typeof result).toBe('object');
      expect(result.isValid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toContain('Данные должны быть объектом');
    });
  });
});
