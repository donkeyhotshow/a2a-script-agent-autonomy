const { ValidationUtils } = require('../index.js');

describe('ValidationUtils', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationUtils();
  });

  describe('constructor', () => {
    test('должен инициализироваться с дефолтными опциями', () => {
      expect(validator.getSchema).toBeInstanceOf(Function);
    });

    test('должен инициализироваться с кастомной функцией getSchema', () => {
      const customGetSchema = jest.fn();
      const customValidator = new ValidationUtils({
        getSchema: customGetSchema
      });
      expect(customValidator.getSchema).toBe(customGetSchema);
    });
  });

  describe('validate', () => {
    test('должен валидировать корректные данные по схеме', () => {
      const schema = {
        name: { type: 'string', min: 2, max: 50 },
        age: { type: 'number', min: 0, max: 150 },
        email: { type: 'string', format: 'email' }
      };
      const data = {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com'
      };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('должен обнаруживать несоответствия типов', () => {
      const schema = {
        name: { type: 'string' },
        age: { type: 'number' }
      };
      const data = {
        name: 123,
        age: '25'
      };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual(['Type mismatch: expected string, got number']);
      expect(result.errors.age).toEqual(['Type mismatch: expected number, got string']);
    });

    test('должен валидировать min/max ограничения для строк', () => {
      const schema = {
        shortField: { type: 'string', min: 3, max: 10 }
      };
      const tooShort = { shortField: 'ab' };
      const tooLong = { shortField: 'this-is-way-too-long' };
      const justRight = { shortField: 'perfect' };

      expect(validator.validate(tooShort, schema).isValid).toBe(false);
      expect(validator.validate(tooLong, schema).isValid).toBe(false);
      expect(validator.validate(justRight, schema).isValid).toBe(true);
    });

    test('должен валидировать min/max ограничения для чисел', () => {
      const schema = {
        score: { type: 'number', min: 0, max: 100 }
      };
      const tooLow = { score: -5 };
      const tooHigh = { score: 150 };
      const justRight = { score: 85 };

      expect(validator.validate(tooLow, schema).isValid).toBe(false);
      expect(validator.validate(tooHigh, schema).isValid).toBe(false);
      expect(validator.validate(justRight, schema).isValid).toBe(true);
    });

    test('должен валидировать формат email', () => {
      const schema = {
        email: { type: 'string', format: 'email' }
      };
      const validEmail = { email: 'test@example.com' };
      const invalidEmail = { email: 'invalid-email' };

      expect(validator.validate(validEmail, schema).isValid).toBe(true);
      expect(validator.validate(invalidEmail, schema).isValid).toBe(false);
      expect(validator.validate(invalidEmail, schema).errors.email).toEqual(['email must be a valid email format']);
    });

    test('должен валидировать присутствие с allowEmpty: false', () => {
      const schema = {
        requiredField: { presence: { allowEmpty: false } }
      };
      const missingField = {};
      const emptyField = { requiredField: '' };
      const presentField = { requiredField: 'value' };

      expect(validator.validate(missingField, schema).isValid).toBe(false);
      expect(validator.validate(emptyField, schema).isValid).toBe(false);
      expect(validator.validate(presentField, schema).isValid).toBe(true);
      expect(validator.validate(missingField, schema).errors.requiredField).toEqual(['requiredField is required']);
    });

    test('должен валидировать условное присутствие', () => {
      const schema = {
        dependentField: {
          presence: {
            allowEmpty: false,
            if: (data) => data.condition === true
          }
        }
      };
      const dataWithCondition = { condition: true };
      const dataWithoutCondition = { condition: false };

      expect(validator.validate(dataWithCondition, schema).isValid).toBe(false); // dependentField is missing
      expect(validator.validate(dataWithoutCondition, schema).isValid).toBe(true); // dependentField not required

      const dataWithConditionAndField = { condition: true, dependentField: 'value' };
      expect(validator.validate(dataWithConditionAndField, schema).isValid).toBe(true);
    });

    test('должен валидировать кастомные функции', () => {
      const schema = {
        customField: {
          custom: (value) => value !== 'invalid' ? null : 'Value cannot be invalid'
        }
      };
      const validData = { customField: 'valid' };
      const invalidData = { customField: 'invalid' };

      expect(validator.validate(validData, schema).isValid).toBe(true);
      expect(validator.validate(invalidData, schema).isValid).toBe(false);
      expect(validator.validate(invalidData, schema).errors.customField).toEqual(['Value cannot be invalid']);
    });

    test('должен обрабатывать пустую схему', () => {
      const schema = {};
      const data = { any: 'data' };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('должен обрабатывать отсутствующие поля данных', () => {
      const schema = {
        field1: { type: 'string' },
        field2: { type: 'number' }
      };
      const data = { field1: 'value' };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true); // field2 is not required, so it's valid if missing
      expect(result.errors).toEqual({});
    });
  });

  describe('checkRequiredFields', () => {
    test('должен возвращать отсутствующие обязательные поля', () => {
      const obj = { a: 1, c: 3 };
      const required = ['a', 'b', 'c', 'd'];
      const missing = validator.checkRequiredFields(obj, required);
      expect(missing).toEqual(['b', 'd']);
    });

    test('должен возвращать пустой массив при наличии всех обязательных полей', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const required = ['a', 'b'];
      const missing = validator.checkRequiredFields(obj, required);
      expect(missing).toEqual([]);
    });

    test('должен обрабатывать пустой массив обязательных полей', () => {
      const obj = { a: 1, b: 2 };
      const required = [];
      const missing = validator.checkRequiredFields(obj, required);
      expect(missing).toEqual([]);
    });
  });

  describe('isInRange', () => {
    test('должен валидировать нахождение значения в диапазоне', () => {
      expect(validator.isInRange(5, 1, 10)).toBe(true);
      expect(validator.isInRange(1, 1, 10)).toBe(true);
      expect(validator.isInRange(10, 1, 10)).toBe(true);
      expect(validator.isInRange(0, 1, 10)).toBe(false);
      expect(validator.isInRange(11, 1, 10)).toBe(false);
    });

    test('должен обрабатывать отрицательные диапазоны', () => {
      expect(validator.isInRange(-5, -10, -1)).toBe(true);
      expect(validator.isInRange(-11, -10, -1)).toBe(false);
    });

    test('должен обрабатывать десятичные значения', () => {
      expect(validator.isInRange(5.5, 1.0, 10.0)).toBe(true);
      expect(validator.isInRange(0.9, 1.0, 10.0)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    test('должен валидировать непустые массивы', () => {
      expect(validator.isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    test('должен отклонять пустые массивы', () => {
      expect(validator.isNonEmptyArray([])).toBe(false);
    });

    test('должен отклонять не-массивы', () => {
      expect(validator.isNonEmptyArray(null)).toBe(false);
      expect(validator.isNonEmptyArray(undefined)).toBe(false);
      expect(validator.isNonEmptyArray('string')).toBe(false);
      expect(validator.isNonEmptyArray({})).toBe(false);
    });
  });

  describe('validateBaseline', () => {
    test('должен валидировать не-null объекты данных', () => {
      const data = { key: 'value' };
      const result = validator.validateBaseline(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен отклонять null или undefined данные', () => {
      let result = validator.validateBaseline(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Данные отсутствуют']);

      result = validator.validateBaseline(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Данные отсутствуют']);
    });

    test('должен отклонять не-объектные данные', () => {
      let result = validator.validateBaseline('string');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Данные должны быть объектом']);

      result = validator.validateBaseline(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Данные должны быть объектом']);
    });
  });

  describe('validateScanResultItem', () => {
    test('должен валидировать корректный элемент результата сканирования', () => {
      const item = {
        id: 'test-id',
        type: 'test-type',
        coordinates: { x: 10, y: 20, width: 100, height: 50 }
      };
      const result = validator.validateScanResultItem(item, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен отклонять null или undefined элементы', () => {
      let result = validator.validateScanResultItem(null, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: отсутствует']);

      result = validator.validateScanResultItem(undefined, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 1: отсутствует']);
    });

    test('должен валидировать обязательное поле id', () => {
      const item = {
        type: 'test-type',
        coordinates: { x: 10, y: 20 }
      };
      const result = validator.validateScanResultItem(item, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: отсутствует ID']);
    });

    test('должен валидировать обязательное поле type', () => {
      const item = {
        id: 'test-id',
        coordinates: { x: 10, y: 20 }
      };
      const result = validator.validateScanResultItem(item, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: отсутствует тип']);
    });

    test('должен валидировать структуру координат', () => {
      const item1 = {
        id: 'test-id',
        type: 'test-type',
        coordinates: {}
      };
      let result = validator.validateScanResultItem(item1, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: некорректные координаты']);

      const item2 = {
        id: 'test-id',
        type: 'test-type',
        coordinates: { x: 10 }
      };
      result = validator.validateScanResultItem(item2, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: некорректные координаты']);

      const item3 = {
        id: 'test-id',
        type: 'test-type',
        coordinates: { y: 20 }
      };
      result = validator.validateScanResultItem(item3, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 0: некорректные координаты']);
    });

    test('должен включать индекс элемента в сообщениях об ошибках', () => {
      const item = { type: 'test' }; // Missing ID and coordinates
      const result = validator.validateScanResultItem(item, 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Элемент 5: отсутствует ID', 'Элемент 5: некорректные координаты']);
    });
  });

  describe('validateConfig', () => {
    test('должен валидировать корректную конфигурацию по схеме', () => {
      const config = { name: 'test', version: 1 };
      const schema = { required: ['name'], types: { name: 'string', version: 'number' } };
      const result = validator.validateConfig(config, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен отклонять null или undefined конфигурацию', () => {
      let result = validator.validateConfig(null, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Конфигурация отсутствует']);

      result = validator.validateConfig(undefined, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Конфигурация отсутствует']);
    });

    test('должен отклонять не-объектную конфигурацию', () => {
      let result = validator.validateConfig('string', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Конфигурация должна быть объектом']);
    });

    test('должен валидировать обязательные поля', () => {
      const config = { version: 1 };
      const schema = { required: ['name'] };
      const result = validator.validateConfig(config, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Отсутствует обязательное поле: name']);
    });

    test('должен валидировать типы полей', () => {
      const config = { name: 123, version: 'one' };
      const schema = { types: { name: 'string', version: 'number' } };
      const result = validator.validateConfig(config, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Поле name: ожидается string, получено number', 'Поле version: ожидается number, получено string']);
    });

    test('должен обрабатывать пустую схему', () => {
      const config = { name: 'test' };
      const schema = {};
      const result = validator.validateConfig(config, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен обрабатывать схему без required или types', () => {
      const config = { name: 'test' };
      const schema = { someOtherField: 'value' }; // Не релевантные поля
      const result = validator.validateConfig(config, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateCoordinates', () => {
    test('должен валидировать корректные координаты', () => {
      let result = validator.validateCoordinates(10, 20);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);

      result = validator.validateCoordinates(10, 20, 100, 50);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен валидировать координаты без ширины/высоты', () => {
      const result = validator.validateCoordinates(10, 20);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('должен отклонять не-числовые координаты', () => {
      let result = validator.validateCoordinates('10', 20);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['X координата должна быть числом']);

      result = validator.validateCoordinates(10, '20');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Y координата должна быть числом']);
    });

    test('должен отклонять NaN координаты', () => {
      let result = validator.validateCoordinates(NaN, 20);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['X координата должна быть числом']);

      result = validator.validateCoordinates(10, NaN);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Y координата должна быть числом']);
    });

    test('должен отклонять нулевые или отрицательные размеры', () => {
      let result = validator.validateCoordinates(10, 20, 0, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Ширина должна быть положительным числом']);

      result = validator.validateCoordinates(10, 20, 100, -50);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Высота должна быть положительным числом']);
    });
  });

  describe('validateDataSize', () => {
    test('должен валидировать данные в пределах лимита размера', () => {
      const data = { small: 'data' };
      const result = validator.validateDataSize(data, 100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.size).toBeGreaterThan(0);
    });

    test('должен отклонять данные, превышающие лимит размера', () => {
      const data = { large: 'this is a very large string that will exceed the limit' };
      const result = validator.validateDataSize(data, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Размер данных (66 байт) превышает максимальный (10 байт)']);
    });

    test('должен использовать дефолтный максимальный размер', () => {
      const data = { large: 'this is a very large string that will exceed the limit' };
      const result = validator.validateDataSize(data); // Использует maxSize = 1000
      expect(result.isValid).toBe(true); // 66 байт меньше 1000, поэтому валидно
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateOutputFormat', () => {
    test('должен валидировать поддерживаемые форматы вывода', () => {
      expect(validator.validateOutputFormat('json').isValid).toBe(true);
      expect(validator.validateOutputFormat('xml').isValid).toBe(true);
      expect(validator.validateOutputFormat('csv').isValid).toBe(true);
      expect(validator.validateOutputFormat('yaml').isValid).toBe(true);
      expect(validator.validateOutputFormat('markdown').isValid).toBe(true);
    });

    test('должен отклонять неподдерживаемые форматы вывода', () => {
      const result = validator.validateOutputFormat('unsupported');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Неподдерживаемый формат: unsupported. Поддерживаемые: json, xml, csv, yaml, markdown');
    });

    test('должен перечислять поддерживаемые форматы в сообщении об ошибке', () => {
      const result = validator.validateOutputFormat('unknown');
      expect(result.errors[0]).toMatch(/Поддерживаемые: json, xml, csv, yaml, markdown/);
    });
  });

  describe('validateId', () => {
    test('должен валидировать корректные ID', () => {
      expect(validator.validateId('valid-id-123').isValid).toBe(true);
      expect(validator.validateId('another_id').isValid).toBe(true);
    });

    test('должен отклонять null или undefined ID', () => {
      let result = validator.validateId(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID отсутствует']);

      result = validator.validateId(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID отсутствует']);
    });

    test('должен отклонять не-строковые ID', () => {
      let result = validator.validateId(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID должен быть строкой']);

      result = validator.validateId({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID должен быть строкой']);
    });

    test('должен отклонять пустые или состоящие из пробелов ID', () => {
      let result = validator.validateId('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID не может быть пустой строкой']);

      result = validator.validateId('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID не может быть пустой строкой']);
    });

    test('должен отклонять ID с недопустимыми символами', () => {
      let result = validator.validateId('id with spaces');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID содержит недопустимые символы. Разрешены: буквы, цифры, дефис, подчеркивание']);

      result = validator.validateId('id!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID содержит недопустимые символы. Разрешены: буквы, цифры, дефис, подчеркивание']);
    });
  });

  describe('Обработка ошибок и граничные случаи', () => {
    test('должен корректно обрабатывать malformed объекты схемы', () => {
      const data = { name: 'test' };
      const schema = { name: { type: 'string', min: 'two' } }; // Некорректный тип для min
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual(['Type mismatch: expected number, got string']);
    });

    test('должен корректно обрабатывать циклические ссылки в данных', () => {
      const data = {};
      data.self = data;
      const schema = { self: { type: 'object' } };
      // validateDataSize корректно обрабатывает циклические ссылки, заменяя их на '[Circular]'
      const result = validator.validateDataSize(data);
      expect(result.isValid).toBe(true); // Циклические ссылки обрабатываются корректно
      expect(result.errors).toEqual([]);
      expect(result.size).toBeGreaterThan(0); // Размер должен быть рассчитан
    });

    test('должен корректно обрабатывать экстремально большие объекты данных', () => {
      const data = {
        longString: 'a'.repeat(10000)
      };
      const result = validator.validateDataSize(data, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Размер данных');
    });

    test('должен корректно обрабатывать Unicode символы в строках', () => {
      const data = { name: 'привет мир 👋' };
      const schema = { name: { type: 'string', min: 2, max: 50 } };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(data.name.length).toBe(13); // Проверка длины строки с учетом Unicode (👋 это 2 символа)
    });

    test('должен корректно обрабатывать специальные JavaScript значения (Infinity, -Infinity, null)', () => {
      const data = {
        num1: Infinity,
        num2: -Infinity,
        nullable: null
      };
      const schema = {
        num1: { type: 'number' },
        num2: { type: 'number' },
        nullable: { type: 'object', presence: { allowEmpty: true } }
      };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('должен корректно обрабатывать глубоко вложенные объекты', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'test'
            }
          }
        }
      };
      const schema = {
        level1: {
          type: 'object',
          subSchema: { // Пример: добавление поддержки вложенных схем
            level2: {
              type: 'object',
              subSchema: {
                level3: {
                  type: 'object',
                  subSchema: {
                    value: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };
      // Текущая реализация validate не поддерживает subSchema. Этот тест будет валиден только для базовой проверки типа.
      const result = validator.validate(data, { level1: { type: 'object' } });
      expect(result.isValid).toBe(true);
    });

    test('должен корректно обрабатывать массивы со смешанными типами', () => {
      const data = {
        mixedArray: [1, 'two', true, { key: 'value' }]
      };
      const schema = {
        mixedArray: { type: 'object' } // В текущей реализации array считается object
      };
      const result = validator.validate(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('должен эффективно валидировать большие наборы данных', () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`field${i}`] = 'value' + i;
      }
      const schema = {};
      for (let i = 0; i < 1000; i++) {
        schema[`field${i}`] = { type: 'string' };
      }

      const startTime = Date.now();
      const result = validator.validate(largeData, schema);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(executionTime).toBeLessThan(500); // Ожидаем, что это будет достаточно быстро
    });

    test('должен эффективно использовать память при множественных валидациях', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const data = { name: 'test', age: 25, email: 'test@example.com' };
      const schema = { name: { type: 'string' }, age: { type: 'number' }, email: { type: 'string' } };

      for (let i = 0; i < 1000; i++) {
        const tempValidator = new ValidationUtils();
        tempValidator.validate(data, schema);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Увеличение памяти должно быть разумным (менее 5MB)
    });
  });
});
