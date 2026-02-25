const { ApiValidator } = require('../../src/api-validator.js');

describe('ApiValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ApiValidator();
  });

  describe('constructor', () => {
    test('should initialize with empty schemas map', () => {
      expect(validator.schemas).toBeInstanceOf(Map);
      expect(validator.schemas.size).toBe(0);
    });
  });

  describe('addSchema', () => {
    test('should add schema to the collection', () => {
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      validator.addSchema('testSchema', schema);

      expect(validator.schemas.has('testSchema')).toBe(true);
      expect(validator.schemas.get('testSchema')).toEqual(schema);
    });

    test('should overwrite existing schema with same name', () => {
      const schema1 = { type: 'string' };
      const schema2 = { type: 'number' };

      validator.addSchema('testSchema', schema1);
      validator.addSchema('testSchema', schema2);

      expect(validator.schemas.get('testSchema')).toEqual(schema2);
    });

    test('should throw error for invalid schema name', () => {
      const schema = { type: 'string' };
      
      expect(() => validator.addSchema('', schema)).toThrow('Schema name must be a non-empty string');
      expect(() => validator.addSchema(null, schema)).toThrow('Schema name must be a non-empty string');
      expect(() => validator.addSchema(undefined, schema)).toThrow('Schema name must be a non-empty string');
      expect(() => validator.addSchema(123, schema)).toThrow('Schema name must be a non-empty string');
    });

    test('should throw error for invalid schema object', () => {
      expect(() => validator.addSchema('test', null)).toThrow('Schema must be a valid object');
      expect(() => validator.addSchema('test', undefined)).toThrow('Schema must be a valid object');
      expect(() => validator.addSchema('test', 'invalid')).toThrow('Schema must be a valid object');
    });
  });

  describe('validateRequest', () => {
    test('should return error for non-existent schema', () => {
      const req = { body: { name: 'test' } };
      const result = validator.validateRequest(req, 'nonExistentSchema');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Schema not found');
    });

    test('should return error for missing schema name', () => {
      const req = { body: { name: 'test' } };
      
      expect(validator.validateRequest(req, null)).toEqual({
        valid: false,
        error: 'Schema name is required'
      });
      
      expect(validator.validateRequest(req, undefined)).toEqual({
        valid: false,
        error: 'Schema name is required'
      });
      
      expect(validator.validateRequest(req, '')).toEqual({
        valid: false,
        error: 'Schema name is required'
      });
    });

    test('should validate request against existing schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      validator.addSchema('userSchema', schema);

      const validReq = { body: { name: 'John', age: 30 } };
      const result = validator.validateRequest(validReq, 'userSchema');

      expect(result.valid).toBe(true);
    });

    test('should handle invalid request data types', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      validator.addSchema('userSchema', schema);

      const invalidReq = { body: { name: 123, age: 'thirty' } };
      const result = validator.validateRequest(invalidReq, 'userSchema');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected string');
      expect(result.error).toContain('Expected number');
    });

    test('should validate email pattern correctly', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { 
            type: 'string', 
            pattern: '^[^@]+@[^@]+\\.[^@]+$' 
          }
        }
      };

      validator.addSchema('emailSchema', schema);

      const validReq = { body: { email: 'test@example.com' } };
      const invalidReq = { body: { email: 'invalid-email' } };

      expect(validator.validateRequest(validReq, 'emailSchema').valid).toBe(true);
      expect(validator.validateRequest(invalidReq, 'emailSchema').valid).toBe(false);
    });

    test('should handle missing required fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        }
      };

      validator.addSchema('requiredFieldSchema', schema);

      const invalidReq = { body: { name: 'John' } }; // missing email
      const result = validator.validateRequest(invalidReq, 'requiredFieldSchema');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: email');
    });

    test('should handle empty request object', () => {
      const schema = { 
        type: 'object', 
        properties: {},
        additionalProperties: false
      };
      validator.addSchema('emptySchema', schema);

      const result = validator.validateRequest({}, 'emptySchema');
      expect(result.valid).toBe(true);
    });

    test('should handle complex nested schemas', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string', required: true },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string', required: true }
                }
              }
            }
          }
        }
      };

      validator.addSchema('complexSchema', complexSchema);

      const validReq = {
        body: {
          user: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'Anytown'
            }
          }
        }
      };

      const invalidReq = {
        body: {
          user: {
            name: 'John',
            address: {
              street: '123 Main St'
              // missing city
            }
          }
        }
      };

      expect(validator.validateRequest(validReq, 'complexSchema').valid).toBe(true);
      
      const result = validator.validateRequest(invalidReq, 'complexSchema');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: city');
    });

    test('should handle array validation', () => {
      const arraySchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          numbers: {
            type: 'array',
            items: { type: 'number' }
          }
        }
      };

      validator.addSchema('arraySchema', arraySchema);

      const validReq = { body: { tags: ['tag1', 'tag2'], numbers: [1, 2, 3] } };
      const invalidReq = { body: { tags: ['tag1', 123], numbers: ['one', 2] } };

      expect(validator.validateRequest(validReq, 'arraySchema').valid).toBe(true);
      
      const result = validator.validateRequest(invalidReq, 'arraySchema');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected string');
      expect(result.error).toContain('Expected number');
    });
  });

  describe('utility methods', () => {
    test('should get schema names', () => {
      validator.addSchema('schema1', { type: 'string' });
      validator.addSchema('schema2', { type: 'number' });

      const names = validator.getSchemaNames();
      expect(names).toContain('schema1');
      expect(names).toContain('schema2');
      expect(names.length).toBe(2);
    });

    test('should check if schema exists', () => {
      validator.addSchema('testSchema', { type: 'string' });

      expect(validator.hasSchema('testSchema')).toBe(true);
      expect(validator.hasSchema('nonExistent')).toBe(false);
    });

    test('should remove schema', () => {
      validator.addSchema('testSchema', { type: 'string' });
      expect(validator.hasSchema('testSchema')).toBe(true);

      const removed = validator.removeSchema('testSchema');
      expect(removed).toBe(true);
      expect(validator.hasSchema('testSchema')).toBe(false);
    });

    test('should clear all schemas', () => {
      validator.addSchema('schema1', { type: 'string' });
      validator.addSchema('schema2', { type: 'number' });
      expect(validator.schemas.size).toBe(2);

      validator.clearSchemas();
      expect(validator.schemas.size).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle null or undefined request body', () => {
      const schema = { type: 'object', properties: {} };
      validator.addSchema('testSchema', schema);

      expect(validator.validateRequest(null, 'testSchema').valid).toBe(false);
      expect(validator.validateRequest(undefined, 'testSchema').valid).toBe(false);
    });

    test('should handle request without body property', () => {
      const schema = { type: 'string' };
      validator.addSchema('stringSchema', schema);

      const req = 'test string';
      const result = validator.validateRequest(req, 'stringSchema');
      expect(result.valid).toBe(true);
    });

    test('should handle additional properties correctly', () => {
      const strictSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: false
      };

      const looseSchema = {
        type: 'object',
        properties: { name: { type: 'string' } }
        // additionalProperties defaults to true
      };

      validator.addSchema('strictSchema', strictSchema);
      validator.addSchema('looseSchema', looseSchema);

      const req = { body: { name: 'John', extra: 'field' } };

      expect(validator.validateRequest(req, 'strictSchema').valid).toBe(false);
      expect(validator.validateRequest(req, 'looseSchema').valid).toBe(true);
    });

    test('should handle malformed JSON schema gracefully', () => {
      const malformedSchema = {
        type: 'object',
        properties: {
          name: { type: 'invalidType' } // invalid type
        }
      };

      validator.addSchema('malformedSchema', malformedSchema);
      const req = { body: { name: 'test' } };

      // Should not crash, but may return unexpected results
      expect(() => validator.validateRequest(req, 'malformedSchema')).not.toThrow();
    });
  });
});
