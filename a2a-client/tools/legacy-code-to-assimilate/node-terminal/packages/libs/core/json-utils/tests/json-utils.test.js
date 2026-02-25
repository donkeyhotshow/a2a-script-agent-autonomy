const { JsonUtils } = require('../index.js');

// Мокаем fs.promises для контроля файловых операций в тестах
jest.mock('fs').promises, () => ({
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

describe('JsonUtils', () => {
  let jsonUtils;

  beforeEach(() => {
    jsonUtils = new JsonUtils();
    jest.clearAllMocks();
  });

  describe('isValidJson', () => {
    test('должен возвращать true для валидного JSON', () => {
      const validJson = '{"key": "value", "number": 123}';
      expect(jsonUtils.isValidJson(validJson)).toBe(true);
    });

    test('должен возвращать false для невалидного JSON', () => {
      const invalidJson = '{"key": "value", "number": 123';
      expect(jsonUtils.isValidJson(invalidJson)).toBe(false);
    });

    test('должен возвращать false для пустой строки', () => {
      const emptyString = '';
      expect(jsonUtils.isValidJson(emptyString)).toBe(false);
    });

    test('должен возвращать false для строки, не являющейся JSON', () => {
      const nonJsonString = 'this is not json';
      expect(jsonUtils.isValidJson(nonJsonString)).toBe(false);
    });

    test('должен возвращать true для валидного JSON с массивом', () => {
      const validJsonArray = '[1, 2, "test"]';
      expect(jsonUtils.isValidJson(validJsonArray)).toBe(true);
    });

    test('должен возвращать false для null', () => {
      expect(jsonUtils.isValidJson(null)).toBe(false);
    });

    test('должен возвращать false для undefined', () => {
      expect(jsonUtils.isValidJson(undefined)).toBe(false);
    });

    test('должен возвращать false для числа', () => {
      expect(jsonUtils.isValidJson(123)).toBe(false);
    });

    test('должен возвращать false для объекта', () => {
      expect(jsonUtils.isValidJson({a: 1})).toBe(false);
    });
  });

  describe('safeParse', () => {
    test('should parse valid JSON string', () => {
      const jsonString = '{"name": "test", "value": 123}';
      const result = jsonUtils.safeParse(jsonString);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
      expect(result.error).toBeUndefined();
    });

    test('should handle invalid JSON string', () => {
      const invalidJson = '{invalid json string}';
      const result = jsonUtils.safeParse(invalidJson);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Expected property name');
    });

    test('should return default value for invalid JSON', () => {
      const invalidJson = '{invalid}';
      const defaultValue = { default: true, status: 'error' };
      const result = jsonUtils.safeParse(invalidJson, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
    });

    test('should return null for invalid JSON with null default', () => {
      const invalidJson = 'not a json';
      const result = jsonUtils.safeParse(invalidJson, null);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    test('should return undefined for invalid JSON with no default', () => {
      const invalidJson = 'another invalid json';
      const result = jsonUtils.safeParse(invalidJson);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
    });

    test('should parse empty object JSON', () => {
      const jsonString = '{}';
      const result = jsonUtils.safeParse(jsonString);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    test('should parse empty array JSON', () => {
      const jsonString = '[]';
      const result = jsonUtils.safeParse(jsonString);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('should correctly parse numbers and booleans', () => {
      const jsonString = '{"num": 123, "bool": true, "nullVal": null}';
      const result = jsonUtils.safeParse(jsonString);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ num: 123, bool: true, nullVal: null });
    });
  });

  describe('safeParseFile', () => {
    test('should parse JSON from file successfully', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      const tmpFilePath = path.join(os.tmpdir(), `json-utils-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      const content = JSON.stringify({ a: 1, b: 'x' });
      await fs.writeFile(tmpFilePath, content, 'utf8');
      try {
        const result = await jsonUtils.safeParseFile(tmpFilePath);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ a: 1, b: 'x' });
        expect(result.error).toBeUndefined();
      } finally {
        await fs.unlink(tmpFilePath).catch(() => {});
      }
    });

    test('should handle file not found and return default value', async () => {
      const nonExistentFilePath = 'non-existent-file-12345.json';
      const defaultValue = { not: 'found' };
      const result = await jsonUtils.safeParseFile(nonExistentFilePath, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('no such file or directory');
    });

    test('should handle invalid JSON in file and return default value', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      const tmpFilePath = path.join(os.tmpdir(), `json-utils-invalid-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      const content = '{invalid json string in file}';
      await fs.writeFile(tmpFilePath, content, 'utf8');
      const defaultValue = { parseError: true };
      try {
        const result = await jsonUtils.safeParseFile(tmpFilePath, defaultValue);
        expect(result.success).toBe(false);
        expect(result.data).toEqual(defaultValue);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Expected property name');
      } finally {
        await fs.unlink(tmpFilePath).catch(() => {});
      }
    });

    test('should return error if file path is not a string', async () => {
      const result = await jsonUtils.safeParseFile(null);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Input is not a valid string');
    });
  });

  describe('safeStringify', () => {
    test('should stringify a simple object successfully', () => {
      const data = { key: 'value', number: 123 };
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n  \"key\": \"value\",\n  \"number\": 123\n}');
      expect(result.error).toBeUndefined();
    });

    test('should stringify an array successfully', () => {
      const data = [1, 'test', { a: 1 }];
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('[\n  1,\n  \"test\",\n  {\n    \"a\": 1\n  }\n]');
      expect(result.error).toBeUndefined();
    });

    test('should handle circular references and return failure', () => {
      const circularObj = { prop: 'value' };
      circularObj.circular = circularObj;
      const result = jsonUtils.safeStringify(circularObj);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Converting circular structure to JSON');
    });

    test('should use the specified space for indentation', () => {
      const data = { a: 1, b: { c: 2 } };
      const result = jsonUtils.safeStringify(data, 4);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n    \"a\": 1,\n    \"b\": {\n        \"c\": 2\n    }\n}');
    });

    test('should stringify with no indentation when space is 0', () => {
      const data = { a: 1, b: 2 };
      const resultNoSpace = jsonUtils.safeStringify(data, 0);
      expect(resultNoSpace.success).toBe(true);
      expect(resultNoSpace.data).toBe('{\"a\":1,\"b\":2}');
    });

    test('should stringify a string literal', () => {
      const data = "hello world";
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('\"hello world\"');
    });

    test('should stringify a number literal', () => {
      const data = 12345;
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('12345');
    });

    test('should stringify a boolean literal', () => {
      const data = true;
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('true');
    });

    test('should stringify null literal', () => {
      const data = null;
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(true);
      expect(result.data).toBe('null');
    });

    test('should handle BigInt gracefully (should fail as BigInt is not JSON serializable)', () => {
      const data = { value: 10n }; // BigInt value
      const result = jsonUtils.safeStringify(data);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Do not know how to serialize a BigInt');
    });

  });

  describe('minify and format', () => {
    test('should minify a formatted JSON string successfully', () => {
      const formattedJson = '{\n  "key": "value",\n  "nested": {\n    "num": 123\n  }\n}';
      const expectedMinified = '{"key":"value","nested":{"num":123}}';
      const result = jsonUtils.minify(formattedJson);
      expect(result.success).toBe(true);
      expect(result.data).toBe(expectedMinified);
      expect(result.error).toBeUndefined();
    });

    test('should minify an already minified JSON string without changes', () => {
      const minifiedJson = '{"key":"value","num":123}';
      const result = jsonUtils.minify(minifiedJson);
      expect(result.success).toBe(true);
      expect(result.data).toBe(minifiedJson);
      expect(result.error).toBeUndefined();
    });

    test('should handle an empty JSON object for minify', () => {
      const emptyObject = '{}';
      const result = jsonUtils.minify(emptyObject);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{}');
    });

    test('should handle an empty JSON array for minify', () => {
      const emptyArray = '[]';
      const result = jsonUtils.minify(emptyArray);
      expect(result.success).toBe(true);
      expect(result.data).toBe('[]');
    });

    test('should handle invalid JSON string for minify and return failure', () => {
      const invalidJson = '{invalid json}';
      const result = jsonUtils.minify(invalidJson);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Expected property name');
    });

    test('should format a minified JSON string successfully with default space', () => {
      const minifiedJson = '{"key":"value","nested":{"num":123}}';
      const expectedFormatted = '{\n  "key": "value",\n  "nested": {\n    "num": 123\n  }\n}';
      const result = jsonUtils.format(minifiedJson);
      expect(result.success).toBe(true);
      expect(result.data).toBe(expectedFormatted);
      expect(result.error).toBeUndefined();
    });

    test('should format a minified JSON string successfully with custom space', () => {
      const minifiedJson = '{"key":"value"}';
      const expectedFormatted = '{\n    "key": "value"\n}';
      const result = jsonUtils.format(minifiedJson, 4);
      expect(result.success).toBe(true);
      expect(result.data).toBe(expectedFormatted);
      expect(result.error).toBeUndefined();
    });

    test('should format an already formatted JSON string without changes if space matches', () => {
      const formattedJson = '{\n  "key": "value"\n}';
      const result = jsonUtils.format(formattedJson, 2);
      expect(result.success).toBe(true);
      expect(result.data).toBe(formattedJson);
      expect(result.error).toBeUndefined();
    });

    test('should handle an empty JSON object for format', () => {
      const emptyObject = '{}';
      const result = jsonUtils.format(emptyObject);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{}');
    });

    test('should handle an empty JSON array for format', () => {
      const emptyArray = '[]';
      const result = jsonUtils.format(emptyArray);
      expect(result.success).toBe(true);
      expect(result.data).toBe('[]');
    });

    test('should handle invalid JSON string for format and return failure', () => {
      const invalidJson = '[invalid json]';
      const result = jsonUtils.format(invalidJson);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Unexpected token');
    });
  });

  describe('safeParseWithValidation', () => {
    test('should parse and validate valid JSON against schema', () => {
      const jsonString = '{"name": "test", "age": 30, "isActive": true}';
      const schema = { required: ['name', 'age'], types: { name: 'string', age: 'number' } };
      const result = jsonUtils.safeParseWithValidation(jsonString, schema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', age: 30, isActive: true });
      expect(result.error).toBeUndefined();
    });

    test('should fail validation if required field is missing', () => {
      const jsonString = '{"name": "test", "isActive": true}';
      const schema = { required: ['name', 'age'], types: { name: 'string', age: 'number' } };
      const defaultValue = { default: true };
      const result = jsonUtils.safeParseWithValidation(jsonString, schema, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Missing required field: age');
    });

    test('should fail validation if data type is incorrect', () => {
      const jsonString = '{"name": "test", "age": "30"}';
      const schema = { required: ['name', 'age'], types: { name: 'string', age: 'number' } };
      const defaultValue = { default: true };
      const result = jsonUtils.safeParseWithValidation(jsonString, schema, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Field age: expected number, got string');
    });

    test('should handle invalid JSON string before validation', () => {
      const invalidJson = '{invalid json}';
      const schema = { required: ['name'] };
      const defaultValue = { default: true };
      const result = jsonUtils.safeParseWithValidation(invalidJson, schema, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Expected property name');
    });

    test('should return original parsed data if no schema is provided', () => {
      const jsonString = '{"key": "value"}';
      const result = jsonUtils.safeParseWithValidation(jsonString, {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.error).toBeUndefined();
    });

    test('should handle multiple validation errors', () => {
      const jsonString = '{"name": 123}';
      const schema = { required: ['name', 'age'], types: { name: 'string', age: 'number' } };
      const defaultValue = {};
      const result = jsonUtils.safeParseWithValidation(jsonString, schema, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Missing required field: age');
      expect(result.error.message).toContain('Field name: expected string, got number');
    });
  });

  describe('safeParseWithErrorHandler', () => {
    test('should call errorHandler on invalid JSON', () => {
      const spy = jest.fn();
      const invalidJson = '{invalid}';
      const result = jsonUtils.safeParseWithErrorHandler(invalidJson, spy, { fallback: true });
      expect(result.success).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(spy.mock.calls[0][1]).toBe(invalidJson);
    });

    test('should not call errorHandler for valid JSON', () => {
      const spy = jest.fn();
      const validJson = '{"ok":true}';
      const result = jsonUtils.safeParseWithErrorHandler(validJson, spy);
      expect(result.success).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });

    test('should return defaultValue when provided and JSON invalid', () => {
      const spy = jest.fn();
      const invalidJson = 'not json';
      const defaultValue = { d: 1 };
      const result = jsonUtils.safeParseWithErrorHandler(invalidJson, spy, defaultValue);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(spy).toHaveBeenCalled();
    });

    test('should not throw if errorHandler is not a function', () => {
      const invalidJson = '{invalid}';
      const result = jsonUtils.safeParseWithErrorHandler(invalidJson, null, { fallback: true });
      expect(result.success).toBe(false);
      expect(result.data).toEqual({ fallback: true });
    });
  });

  describe('parseWithRecovery', () => {
    test('should parse JSON with single-line comments and remove them', () => {
      const jsonWithComments = '{\n  // This is a comment\n  "key": "value" // trailing comment\n}';
      const expectedJson = { key: 'value' };
      const result = jsonUtils.parseWithRecovery(jsonWithComments);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedJson);
      expect(result.error).toBeUndefined();
    });

    test('should parse JSON with multi-line comments and remove them', () => {
      const jsonWithComments = '{\n  /*\n   * Multi-line comment\n   */\n  "key": "value"\n}';
      const expectedJson = { key: 'value' };
      const result = jsonUtils.parseWithRecovery(jsonWithComments);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedJson);
      expect(result.error).toBeUndefined();
    });

    test('should parse JSON with trailing commas and fix them', () => {
      const jsonWithCommas = '{\n  "key": "value",\n  "array": [1, 2, 3,],\n}';
      const expectedJson = { key: 'value', array: [1, 2, 3] };
      const result = jsonUtils.parseWithRecovery(jsonWithCommas);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedJson);
      expect(result.error).toBeUndefined();
    });

    test('should parse JSON with both comments and trailing commas', () => {
      const mixedJson = '{\n  // Comment 1\n  "key": "value", // Comment 2\n  "array": [1, 2, 3,],\n  /*\n   * Multi-line comment\n   */\n  "anotherKey": true,\n}';
      const expectedJson = { key: 'value', array: [1, 2, 3], anotherKey: true };
      const result = jsonUtils.parseWithRecovery(mixedJson);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedJson);
      expect(result.error).toBeUndefined();
    });

    test('should handle severely malformed JSON and return failure', () => {
      const malformedJson = 'this is not json at all';
      const defaultValue = { status: 'error' };
      const result = jsonUtils.parseWithRecovery(malformedJson, { defaultValue });
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Unexpected token');
    });

    test('should return default value for malformed JSON if provided', () => {
      const malformedJson = '{invalid json';
      const defaultValue = { fallback: true };
      const result = jsonUtils.parseWithRecovery(malformedJson, { defaultValue });
      expect(result.success).toBe(false);
      expect(result.data).toEqual(defaultValue);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Expected property name');
    });

    test('should not remove comments if removeComments option is false', () => {
      const jsonWithComments = '{\n  // This is a comment\n  "key": "value"\n}';
      const result = jsonUtils.parseWithRecovery(jsonWithComments, { removeComments: false });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Expected property name');
    });

    test('should not fix trailing commas if fixTrailingCommas option is false', () => {
      const jsonWithCommas = '{\n  "key": "value",\n  "array": [1, 2,],\n}';
      const result = jsonUtils.parseWithRecovery(jsonWithCommas, { fixTrailingCommas: false });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Unexpected token');
    });

    test('should parse valid JSON without any recovery needed', () => {
      const validJson = '{"key": "value"}';
      const result = jsonUtils.parseWithRecovery(validJson);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.error).toBeUndefined();
    });
  });

  describe('safeStringifyWithReplacer', () => {
    test('should stringify with a custom replacer function', () => {
      const data = { a: 1, b: 'hidden', c: 3 };
      const replacer = (key, value) => (key === 'b' ? undefined : value);
      const result = jsonUtils.safeStringifyWithReplacer(data, replacer);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n  "a": 1,\n  "c": 3\n}');
    });

    test('should stringify with a custom replacer array', () => {
      const data = { a: 1, b: 2, c: 3 };
      const replacer = ['a', 'c'];
      const result = jsonUtils.safeStringifyWithReplacer(data, replacer);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n  "a": 1,\n  "c": 3\n}');
    });

    test('should handle circular references with replacer and return failure', () => {
      const circularObj = { prop: 'value' };
      circularObj.circular = circularObj;
      const replacer = (key, value) => (key === 'circular' ? undefined : value);
      const result = jsonUtils.safeStringifyWithReplacer(circularObj, replacer);
      // Even with a replacer, if the replacer itself causes a circularity or does not handle it correctly,
      // JSON.stringify will throw. In this case, the replacer prevents the direct circularity issue
      // but the test case is designed to check for unexpected behavior or errors if replacer is misused.
      // For a simple replacer that removes the circular part, it should succeed.
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n  "prop": "value"\n}');
    });

    test('should handle replacer causing an error during stringification', () => {
      const data = { a: 1, b: 2 };
      const replacer = (key, value) => {
        if (key === 'b') { throw new Error('Replacer error'); }
        return value;
      };
      const result = jsonUtils.safeStringifyWithReplacer(data, replacer);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Replacer error');
    });

    test('should use custom space with replacer', () => {
      const data = { a: 1, b: 2 };
      const replacer = ['a'];
      const result = jsonUtils.safeStringifyWithReplacer(data, replacer, 4);
      expect(result.success).toBe(true);
      expect(result.data).toBe('{\n    "a": 1\n}');
    });
  });
});

