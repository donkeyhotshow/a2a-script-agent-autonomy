const { ValidationUtils } = require('../validation-utils');

describe('ValidationUtils', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationUtils();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultValidator = new ValidationUtils();
      expect(defaultValidator).toBeInstanceOf(ValidationUtils);
      // Дополнительные проверки для дефолтных опций, если они есть в ValidationUtils
    });
  });

  describe('isString', () => {
    test('should return true for a string', () => {
      expect(validator.isString('hello')).toBe(true);
      expect(validator.isString('')).toBe(true);
    });

    test('should return false for a non-string', () => {
      expect(validator.isString(123)).toBe(false);
      expect(validator.isString(true)).toBe(false);
      expect(validator.isString(null)).toBe(false);
      expect(validator.isString(undefined)).toBe(false);
      expect(validator.isString({})).toBe(false);
      expect(validator.isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('should return true for a number', () => {
      expect(validator.isNumber(123)).toBe(true);
      expect(validator.isNumber(0)).toBe(true);
      expect(validator.isNumber(-10)).toBe(true);
      expect(validator.isNumber(1.5)).toBe(true);
    });

    test('should return false for a non-number', () => {
      expect(validator.isNumber('123')).toBe(false);
      expect(validator.isNumber(true)).toBe(false);
      expect(validator.isNumber(null)).toBe(false);
      expect(validator.isNumber(undefined)).toBe(false);
      expect(validator.isNumber({})).toBe(false);
      expect(validator.isNumber([])).toBe(false);
      expect(validator.isNumber(NaN)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    test('should return true for a boolean', () => {
      expect(validator.isBoolean(true)).toBe(true);
      expect(validator.isBoolean(false)).toBe(true);
    });

    test('should return false for a non-boolean', () => {
      expect(validator.isBoolean('true')).toBe(false);
      expect(validator.isBoolean(1)).toBe(false);
      expect(validator.isBoolean(null)).toBe(false);
      expect(validator.isBoolean(undefined)).toBe(false);
      expect(validator.isBoolean({})).toBe(false);
    });
  });

  describe('isObject', () => {
    test('should return true for an object', () => {
      expect(validator.isObject({})).toBe(true);
      expect(validator.isObject({ a: 1 })).toBe(true);
    });

    test('should return false for a non-object', () => {
      expect(validator.isObject('string')).toBe(false);
      expect(validator.isObject(123)).toBe(false);
      expect(validator.isObject(true)).toBe(false);
      expect(validator.isObject(null)).toBe(false); // null является Object, но обычно исключается
      expect(validator.isObject(undefined)).toBe(false);
      expect(validator.isObject([])).toBe(false);
      expect(validator.isFunction(() => {})).toBe(false);
    });
  });

  describe('isArray', () => {
    test('should return true for an array', () => {
      expect(validator.isArray([])).toBe(true);
      expect(validator.isArray([1, 2])).toBe(true);
    });

    test('should return false for a non-array', () => {
      expect(validator.isArray('string')).toBe(false);
      expect(validator.isArray(123)).toBe(false);
      expect(validator.isArray(true)).toBe(false);
      expect(validator.isArray(null)).toBe(false);
      expect(validator.isArray(undefined)).toBe(false);
      expect(validator.isArray({})).toBe(false);
    });
  });

  describe('isFunction', () => {
    test('should return true for a function', () => {
      expect(validator.isFunction(() => {})).toBe(true);
      expect(validator.isFunction(function() {})).toBe(true);
    });

    test('should return false for a non-function', () => {
      expect(validator.isFunction('string')).toBe(false);
      expect(validator.isFunction(123)).toBe(false);
      expect(validator.isFunction(true)).toBe(false);
      expect(validator.isFunction(null)).toBe(false);
      expect(validator.isFunction(undefined)).toBe(false);
      expect(validator.isFunction({})).toBe(false);
      expect(validator.isFunction([])).toBe(false);
    });
  });

  describe('isUndefined', () => {
    test('should return true for undefined', () => {
      let a;
      expect(validator.isUndefined(a)).toBe(true);
      expect(validator.isUndefined(undefined)).toBe(true);
    });

    test('should return false for a defined value', () => {
      expect(validator.isUndefined(null)).toBe(false);
      expect(validator.isUndefined('')).toBe(false);
      expect(validator.isUndefined(0)).toBe(false);
      expect(validator.isUndefined(false)).toBe(false);
      expect(validator.isUndefined({})).toBe(false);
    });
  });

  describe('isNull', () => {
    test('should return true for null', () => {
      expect(validator.isNull(null)).toBe(true);
    });

    test('should return false for a non-null value', () => {
      expect(validator.isNull(undefined)).toBe(false);
      expect(validator.isNull('')).toBe(false);
      expect(validator.isNull(0)).toBe(false);
      expect(validator.isNull(false)).toBe(false);
      expect(validator.isNull({})).toBe(false);
    });
  });

  describe('isDate', () => {
    test('should return true for a Date object', () => {
      expect(validator.isDate(new Date())).toBe(true);
    });

    test('should return false for a non-Date object', () => {
      expect(validator.isDate('2023-01-01')).toBe(false);
      expect(validator.isDate(12345)).toBe(false);
      expect(validator.isDate(null)).toBe(false);
      expect(validator.isDate({})).toBe(false);
    });
  });

  describe('isRegExp', () => {
    test('should return true for a RegExp object', () => {
      expect(validator.isRegExp(/abc/)).toBe(true);
      expect(validator.isRegExp(new RegExp('abc'))).toBe(true);
    });

    test('should return false for a non-RegExp object', () => {
      expect(validator.isRegExp('/abc/')).toBe(false);
      expect(validator.isRegExp({})).toBe(false);
      expect(validator.isRegExp(null)).toBe(false);
    });
  });

  describe('isError', () => {
    test('should return true for an Error object', () => {
      expect(validator.isError(new Error())).toBe(true);
      expect(validator.isError(new TypeError())).toBe(true);
    });

    test('should return false for a non-Error object', () => {
      expect(validator.isError('error')).toBe(false);
      expect(validator.isError({})).toBe(false);
      expect(validator.isError(null)).toBe(false);
    });
  });

  describe('isPromise', () => {
    test('should return true for a Promise object', () => {
      expect(validator.isPromise(Promise.resolve())).toBe(true);
      expect(validator.isPromise(new Promise(() => {}))).toBe(true);
    });

    test('should return false for a non-Promise object', () => {
      expect(validator.isPromise({})).toBe(false);
      expect(validator.isPromise(null)).toBe(false);
      expect(validator.isPromise(() => {})).toBe(false);
    });
  });

  describe('isBuffer', () => {
    test('should return true for a Buffer object', () => {
      expect(validator.isBuffer(Buffer.from('test'))).toBe(true);
    });

    test('should return false for a non-Buffer object', () => {
      expect(validator.isBuffer('test')).toBe(false);
      expect(validator.isBuffer({})).toBe(false);
      expect(validator.isBuffer(null)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('should return true for null, undefined, empty string, empty array, empty object', () => {
      expect(validator.isEmpty(null)).toBe(true);
      expect(validator.isEmpty(undefined)).toBe(true);
      expect(validator.isEmpty('')).toBe(true);
      expect(validator.isEmpty([])).toBe(true);
      expect(validator.isEmpty({})).toBe(true);
    });

    test('should return false for non-empty values', () => {
      expect(validator.isEmpty('hello')).toBe(false);
      expect(validator.isEmpty([1])).toBe(false);
      expect(validator.isEmpty({ a: 1 })).toBe(false);
      expect(validator.isEmpty(0)).toBe(false);
      expect(validator.isEmpty(false)).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    test('should return true for non-empty values', () => {
      expect(validator.isNotEmpty('hello')).toBe(true);
      expect(validator.isNotEmpty([1])).toBe(true);
      expect(validator.isNotEmpty({ a: 1 })).toBe(true);
      expect(validator.isNotEmpty(0)).toBe(true);
      expect(validator.isNotEmpty(false)).toBe(true);
    });

    test('should return false for empty values', () => {
      expect(validator.isNotEmpty(null)).toBe(false);
      expect(validator.isNotEmpty(undefined)).toBe(false);
      expect(validator.isNotEmpty('')).toBe(false);
      expect(validator.isNotEmpty([])).toBe(false);
      expect(validator.isNotEmpty({})).toBe(false);
    });
  });

  describe('isStringLength', () => {
    test('should return true if string length is within range', () => {
      expect(validator.isStringLength('hello', 3, 7)).toBe(true);
      expect(validator.isStringLength('hi', 2, 2)).toBe(true);
    });

    test('should return false if string length is outside range', () => {
      expect(validator.isStringLength('hi', 3, 7)).toBe(false);
      expect(validator.isStringLength('hello', 1, 3)).toBe(false);
    });

    test('should return false for non-string values', () => {
      expect(validator.isStringLength(123, 1, 5)).toBe(false);
      expect(validator.isStringLength(null, 1, 5)).toBe(false);
    });
  });

  describe('isArrayLength', () => {
    test('should return true if array length is within range', () => {
      expect(validator.isArrayLength([1, 2, 3], 2, 4)).toBe(true);
      expect(validator.isArrayLength([], 0, 0)).toBe(true);
    });

    test('should return false if array length is outside range', () => {
      expect(validator.isArrayLength([1], 2, 4)).toBe(false);
      expect(validator.isArrayLength([1, 2, 3, 4, 5], 1, 3)).toBe(false);
    });

    test('should return false for non-array values', () => {
      expect(validator.isArrayLength('abc', 1, 3)).toBe(false);
      expect(validator.isArrayLength(null, 1, 3)).toBe(false);
    });
  });

  describe('isNumberRange', () => {
    test('should return true if number is within range', () => {
      expect(validator.isNumberRange(5, 1, 10)).toBe(true);
      expect(validator.isNumberRange(1, 1, 10)).toBe(true);
      expect(validator.isNumberRange(10, 1, 10)).toBe(true);
    });

    test('should return false if number is outside range', () => {
      expect(validator.isNumberRange(0, 1, 10)).toBe(false);
      expect(validator.isNumberRange(11, 1, 10)).toBe(false);
    });

    test('should return false for non-number values', () => {
      expect(validator.isNumberRange('5', 1, 10)).toBe(false);
      expect(validator.isNumberRange(null, 1, 10)).toBe(false);
    });
  });

  describe('isInteger', () => {
    test('should return true for an integer', () => {
      expect(validator.isInteger(5)).toBe(true);
      expect(validator.isInteger(-10)).toBe(true);
      expect(validator.isInteger(0)).toBe(true);
    });

    test('should return false for a non-integer or non-number', () => {
      expect(validator.isInteger(5.5)).toBe(false);
      expect(validator.isInteger('5')).toBe(false);
      expect(validator.isInteger(null)).toBe(false);
    });
  });

  describe('isPositive', () => {
    test('should return true for a positive number', () => {
      expect(validator.isPositive(5)).toBe(true);
      expect(validator.isPositive(0.1)).toBe(true);
    });

    test('should return false for a zero or negative number', () => {
      expect(validator.isPositive(0)).toBe(false);
      expect(validator.isPositive(-5)).toBe(false);
    });

    test('should return false for a non-number', () => {
      expect(validator.isPositive('5')).toBe(false);
      expect(validator.isPositive(null)).toBe(false);
    });
  });

  describe('isNegative', () => {
    test('should return true for a negative number', () => {
      expect(validator.isNegative(-5)).toBe(true);
      expect(validator.isNegative(-0.1)).toBe(true);
    });

    test('should return false for a zero or positive number', () => {
      expect(validator.isNegative(0)).toBe(false);
      expect(validator.isNegative(5)).toBe(false);
    });

    test('should return false for a non-number', () => {
      expect(validator.isNegative('-5')).toBe(false);
      expect(validator.isNegative(null)).toBe(false);
    });
  });

  describe('isNonNegative', () => {
    test('should return true for a non-negative number (positive or zero)', () => {
      expect(validator.isNonNegative(5)).toBe(true);
      expect(validator.isNonNegative(0)).toBe(true);
    });

    test('should return false for a negative number', () => {
      expect(validator.isNonNegative(-5)).toBe(false);
    });

    test('should return false for a non-number', () => {
      expect(validator.isNonNegative('5')).toBe(false);
      expect(validator.isNonNegative(null)).toBe(false);
    });
  });

  describe('isNonPositive', () => {
    test('should return true for a non-positive number (negative or zero)', () => {
      expect(validator.isNonPositive(-5)).toBe(true);
      expect(validator.isNonPositive(0)).toBe(true);
    });

    test('should return false for a positive number', () => {
      expect(validator.isNonPositive(5)).toBe(false);
    });

    test('should return false for a non-number', () => {
      expect(validator.isNonPositive('-5')).toBe(false);
      expect(validator.isNonPositive(null)).toBe(false);
    });
  });

  describe('isEmail', () => {
    test('should return true for a valid email format', () => {
      expect(validator.isEmail('test@example.com')).toBe(true);
      expect(validator.isEmail('user.name@sub.domain.com')).toBe(true);
    });

    test('should return false for an invalid email format', () => {
      expect(validator.isEmail('invalid-email')).toBe(false);
      expect(validator.isEmail('test@.com')).toBe(false);
      expect(validator.isEmail('test@example')).toBe(false);
      expect(validator.isEmail(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isEmail(123)).toBe(false);
      expect(validator.isEmail({})).toBe(false);
    });
  });

  describe('isUrl', () => {
    test('should return true for a valid URL format', () => {
      expect(validator.isUrl('http://example.com')).toBe(true);
      expect(validator.isUrl('https://www.example.com/path?query=1')).toBe(true);
      expect(validator.isUrl('ftp://ftp.example.com')).toBe(true);
    });

    test('should return false for an invalid URL format', () => {
      expect(validator.isUrl('invalid-url')).toBe(false);
      expect(validator.isUrl('www.example.com')).toBe(false); // No protocol
      expect(validator.isUrl(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isUrl(123)).toBe(false);
      expect(validator.isUrl({})).toBe(false);
    });
  });

  describe('isIpAddress', () => {
    test('should return true for a valid IPv4 address', () => {
      expect(validator.isIpAddress('192.168.1.1')).toBe(true);
      expect(validator.isIpAddress('0.0.0.0')).toBe(true);
      expect(validator.isIpAddress('255.255.255.255')).toBe(true);
    });

    test('should return false for an invalid IP address', () => {
      expect(validator.isIpAddress('192.168.1')).toBe(false);
      expect(validator.isIpAddress('256.0.0.0')).toBe(false);
      expect(validator.isIpAddress('abc.def.ghi.jkl')).toBe(false);
      expect(validator.isIpAddress(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isIpAddress(123)).toBe(false);
      expect(validator.isIpAddress({})).toBe(false);
    });
  });

  describe('isUuid', () => {
    test('should return true for a valid UUID format', () => {
      expect(validator.isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      expect(validator.isUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    test('should return false for an invalid UUID format', () => {
      expect(validator.isUuid('invalid-uuid')).toBe(false);
      expect(validator.isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d47')).toBe(false); // Too short
      expect(validator.isUuid(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isUuid(123)).toBe(false);
      expect(validator.isUuid({})).toBe(false);
    });
  });

  describe('isDateString', () => {
    test('should return true for a valid date string', () => {
      expect(validator.isDateString('2023-01-01')).toBe(true);
      expect(validator.isDateString('2023/12/31')).toBe(true);
      expect(validator.isDateString('January 1, 2023')).toBe(true);
    });

    test('should return false for an invalid date string', () => {
      expect(validator.isDateString('not-a-date')).toBe(false);
      expect(validator.isDateString('2023-13-01')).toBe(false); // Invalid month
      expect(validator.isDateString(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isDateString(123)).toBe(false);
      expect(validator.isDateString({})).toBe(false);
    });
  });

  describe('isJson', () => {
    test('should return true for a valid JSON string', () => {
      expect(validator.isJson('{ "key": "value" }')).toBe(true);
      expect(validator.isJson('[]')).toBe(true);
      expect(validator.isJson('123')).toBe(true);
      expect(validator.isJson('"string"')).toBe(true);
    });

    test('should return false for an invalid JSON string', () => {
      expect(validator.isJson('{ key: "value" }')).toBe(false);
      expect(validator.isJson("{ \"key\": \"value\", }")).toBe(false);
      expect(validator.isJson(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isJson(123)).toBe(false);
      expect(validator.isJson({})).toBe(false);
    });
  });

  describe('isRegexString', () => {
    test('should return true for a valid regex string', () => {
      expect(validator.isRegexString('^a.*c$')).toBe(true);
      expect(validator.isRegexString('[0-9]+')).toBe(true);
      expect(validator.isRegexString('/' + 'abc/i')).toBe(true);
    });

    test('should return false for an invalid regex string', () => {
      expect(validator.isRegexString('[')).toBe(false);
      expect(validator.isRegexString('\\')).toBe(false);
      expect(validator.isRegexString(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isRegexString(123)).toBe(false);
      expect(validator.isRegexString({})).toBe(false);
    });
  });

  describe('isHexColor', () => {
    test('should return true for a valid hex color string', () => {
      expect(validator.isHexColor('#FFFFFF')).toBe(true);
      expect(validator.isHexColor('#000')).toBe(true);
      expect(validator.isHexColor('#ABCDEF')).toBe(true);
    });

    test('should return false for an invalid hex color string', () => {
      expect(validator.isHexColor('#FGH')).toBe(false);
      expect(validator.isHexColor('#FFFF')).toBe(false);
      expect(validator.isHexColor('FFFFFF')).toBe(false);
      expect(validator.isHexColor(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isHexColor(123)).toBe(false);
      expect(validator.isHexColor({})).toBe(false);
    });
  });

  describe('isPhoneNumber', () => {
    test('should return true for a valid phone number string', () => {
      expect(validator.isPhoneNumber('+1 (555) 123-4567')).toBe(true);
      expect(validator.isPhoneNumber('555-123-4567')).toBe(true);
      expect(validator.isPhoneNumber('(555)123-4567')).toBe(true);
      expect(validator.isPhoneNumber('1234567890')).toBe(true);
    });

    test('should return false for an invalid phone number string', () => {
      expect(validator.isPhoneNumber('123')).toBe(false);
      expect(validator.isPhoneNumber('abc-def-ghij')).toBe(false);
      expect(validator.isPhoneNumber(null)).toBe(false);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isPhoneNumber(123)).toBe(false);
      expect(validator.isPhoneNumber({})).toBe(false);
    });
  });

  describe('isPassword', () => {
    test('should return true for a valid password with default options', () => {
      expect(validator.isPassword('Password123!')).toBe(true);
    });

    test('should return false for a password too short', () => {
      expect(validator.isPassword('Pass1!')).toBe(false);
    });

    test('should return false for a password without uppercase if required', () => {
      expect(validator.isPassword('password123!', { requireUppercase: true })).toBe(false);
    });

    test('should return true for a valid password with custom options', () => {
      expect(validator.isPassword('abc', { minLength: 3, requireUppercase: false, requireLowercase: false, requireDigit: false, requireSpecialChar: false })).toBe(true);
    });

    test('should return false for a non-string value', () => {
      expect(validator.isPassword(123)).toBe(false);
    });
  });

  describe('validate', () => {
    test('should return valid: true if condition is true', () => {
      const result = validator.validate(true, 'Error message');
      expect(result).toEqual({ valid: true, error: null });
    });

    test('should return valid: false and error if condition is false (no throw)', () => {
      const result = validator.validate(false, 'Error message');
      expect(result).toEqual({ valid: false, error: 'Error message' });
    });

    test('should throw error if condition is false and throwOnError is true', () => {
      expect(() => validator.validate(false, 'Error message', true)).toThrow('Error message');
    });
  });

  describe('validateType', () => {
    test('should validate correct type', () => {
      const result = validator.validateType('test', 'string', 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate incorrect type', () => {
      const result = validator.validateType(123, 'string', 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateRequired', () => {
    test('should validate a non-empty value', () => {
      const result = validator.validateRequired('value', 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate an empty value', () => {
      const result = validator.validateRequired('', 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate null value', () => {
      const result = validator.validateRequired(null, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate undefined value', () => {
      const result = validator.validateRequired(undefined, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateStringLength', () => {
    test('should validate correct string length', () => {
      const result = validator.validateStringLength('abc', 1, 5, 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate incorrect string length', () => {
      const result = validator.validateStringLength('abc', 1, 2, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate non-string value', () => {
      const result = validator.validateStringLength(123, 1, 5, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateNumberRange', () => {
    test('should validate correct number range', () => {
      const result = validator.validateNumberRange(5, 1, 10, 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate incorrect number range', () => {
      const result = validator.validateNumberRange(0, 1, 10, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate non-number value', () => {
      const result = validator.validateNumberRange('5', 1, 10, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email format', () => {
      const result = validator.validateEmail('test@example.com', 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate incorrect email format', () => {
      const result = validator.validateEmail('invalid-email', 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate non-string value', () => {
      const result = validator.validateEmail(123, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateUrl', () => {
    test('should validate correct URL format', () => {
      const result = validator.validateUrl('http://example.com', 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate incorrect URL format', () => {
      const result = validator.validateUrl('invalid-url', 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should invalidate non-string value', () => {
      const result = validator.validateUrl(123, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('validateObject', () => {
    test('should validate object with valid schema', () => {
      const schema = { a: 'string', b: 'number' };
      const data = { a: 'hello', b: 123 };
      const result = validator.validateObject(data, schema, 'Error');
      expect(result.valid).toBe(true);
    });

    test('should invalidate object with invalid schema', () => {
      const schema = { a: 'string', b: 'number' };
      const data = { a: 'hello', b: 'world' };
      const result = validator.validateObject(data, schema, 'Error');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Error');
    });

    test('should throw error if validation fails and throwOnError is true', () => {
      const schema = { a: 'string', b: 'number' };
      const data = { a: 'hello', b: 'world' };
      expect(() => validator.validateObject(data, schema, 'Error', true)).toThrow('Error');
    });
  });

  describe('createRule', () => {
    test('should create a validation rule function', () => {
      const rule = validator.createRule((value) => value > 0, 'Value must be positive');
      expect(typeof rule).toBe('function');
    });

    test('created rule should return valid: true for valid input', () => {
      const rule = validator.createRule((value) => value > 0, 'Value must be positive');
      const result = rule(10);
      expect(result).toEqual({ valid: true, error: null });
    });

    test('created rule should return valid: false for invalid input', () => {
      const rule = validator.createRule((value) => value > 0, 'Value must be positive');
      const result = rule(-5);
      expect(result).toEqual({ valid: false, error: 'Value must be positive' });
    });
  });

  describe('combineRules', () => {
    test('should combine multiple rules and return valid: true if all pass', () => {
      const rule1 = validator.createRule((value) => value > 0, 'Positive');
      const rule2 = validator.createRule((value) => value < 10, 'Less than 10');
      const combinedRule = validator.combineRules([rule1, rule2]);
      const result = combinedRule(5);
      expect(result).toEqual({ valid: true, error: null });
    });

    test('should combine multiple rules and return valid: false if any rule fails', () => {
      const rule1 = validator.createRule((value) => value > 0, 'Positive');
      const rule2 = validator.createRule((value) => value < 10, 'Less than 10');
      const combinedRule = validator.combineRules([rule1, rule2]);

      const result1 = combinedRule(-5);
      expect(result1).toEqual({ valid: false, error: 'Positive' });

      const result2 = combinedRule(15);
      expect(result2).toEqual({ valid: false, error: 'Less than 10' });
    });
  });
});
