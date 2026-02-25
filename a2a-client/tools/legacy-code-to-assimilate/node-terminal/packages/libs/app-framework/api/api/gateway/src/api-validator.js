/**
 * API Validator
 * Полноценная реализация валидатора с поддержкой JSON Schema
 */

class ApiValidator {
  constructor() {
    this.schemas = new Map();
  }

  /**
   * Add schema
   */
  addSchema(name, schema) {
    if (!name || typeof name !== 'string') {
      throw new Error('Schema name must be a non-empty string');
    }
    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema must be a valid object');
    }
    this.schemas.set(name, schema);
  }

  /**
   * Validate request against schema
   */
  validateRequest(req, schemaName) {
    if (!schemaName) {
      return { valid: false, error: 'Schema name is required' };
    }

    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return { valid: false, error: 'Schema not found' };
    }

    try {
      const data = req?.body || req;
      const validationResult = this.validateData(data, schema);
      
      if (validationResult.valid) {
        return { valid: true };
      } else {
        return {
          valid: false,
          error: validationResult.error,
          details: validationResult.details
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        details: { exception: error.message }
      };
    }
  }

  /**
   * Validate data against schema
   */
  validateData(data, schema) {
    if (schema.type === 'object') {
      return this.validateObject(data, schema);
    } else if (schema.type === 'array') {
      return this.validateArray(data, schema);
    } else {
      return this.validatePrimitive(data, schema);
    }
  }

  /**
   * Validate object data
   */
  validateObject(data, schema) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { valid: false, error: 'Expected object', details: { fieldErrors: ['Expected object'], received: typeof data } };
    }

    const properties = schema.properties || {};
    const required = schema.required || [];
    let errors = [];

    // Check required fields
    for (const field of required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate properties
    for (const [field, value] of Object.entries(data)) {
      if (properties[field]) {
        const fieldSchema = properties[field];
        const fieldResult = this.validateData(value, fieldSchema);
        
        if (!fieldResult.valid) {
          errors.push(`Field '${field}': ${fieldResult.error}`);
          if (fieldResult.details && Array.isArray(fieldResult.details.fieldErrors) && fieldResult.details.fieldErrors.length > 0) {
            errors.push(...fieldResult.details.fieldErrors.map(e => `  - ${e}`));
          } else if (fieldResult.details && Array.isArray(fieldResult.details.itemErrors) && fieldResult.details.itemErrors.length > 0) {
            errors.push(...fieldResult.details.itemErrors.map(e => `  - ${e}`));
          }
        }
      } else if (schema.additionalProperties === false) {
        errors.push(`Unexpected field: ${field}`);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
        details: { fieldErrors: errors }
      };
    }

    return { valid: true, details: { fieldErrors: [] } };
  }

  /**
   * Validate array data
   */
  validateArray(data, schema) {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Expected array', details: { itemErrors: ['Expected array'], received: typeof data } };
    }

    const items = schema.items;
    if (!items) {
      return { valid: true, details: { itemErrors: [] } };
    }

    const errors = [];
    for (let i = 0; i < data.length; i++) {
      const itemResult = this.validateData(data[i], items);
      if (!itemResult.valid) {
        errors.push(`Item ${i}: ${itemResult.error}`);
        if (itemResult.details && Array.isArray(itemResult.details.fieldErrors) && itemResult.details.fieldErrors.length > 0) {
          errors.push(...itemResult.details.fieldErrors.map(e => `  - ${e}`));
        } else if (itemResult.details && Array.isArray(itemResult.details.itemErrors) && itemResult.details.itemErrors.length > 0) {
          errors.push(...itemResult.details.itemErrors.map(e => `  - ${e}`));
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
        details: { itemErrors: errors }
      };
    }

    return { valid: true, details: { itemErrors: [] } };
  }

  /**
   * Validate primitive data
   */
  validatePrimitive(data, schema) {
    const { type, pattern, required } = schema;

    // Check if required field is present
    if (required && (data === undefined || data === null || data === '')) {
      return { valid: false, error: 'Field is required', details: { fieldErrors: ['Field is required'], required: true, received: data } };
    }

    // Type validation
    if (type === 'string') {
      if (typeof data !== 'string') {
        return { valid: false, error: 'Expected string', details: { fieldErrors: ['Expected string'], expected: 'string', received: typeof data } };
      }
      
      // Pattern validation
      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(data)) {
          return { valid: false, error: `String does not match pattern: ${pattern}`, details: { fieldErrors: [`String does not match pattern: ${pattern}`], pattern, received: data } };
        }
      }
    } else if (type === 'number') {
      if (typeof data !== 'number' || isNaN(data)) {
        return { valid: false, error: 'Expected number', details: { fieldErrors: ['Expected number'], expected: 'number', received: typeof data } };
      }
    } else if (type === 'boolean') {
      if (typeof data !== 'boolean') {
        return { valid: false, error: 'Expected boolean', details: { fieldErrors: ['Expected boolean'], expected: 'boolean', received: typeof data } };
      }
    }

    return { valid: true, details: { fieldErrors: [] } };
  }

  /**
   * Get all schema names
   */
  getSchemaNames() {
    return Array.from(this.schemas.keys());
  }

  /**
   * Check if schema exists
   */
  hasSchema(name) {
    return this.schemas.has(name);
  }

  /**
   * Remove schema
   */
  removeSchema(name) {
    return this.schemas.delete(name);
  }

  /**
   * Clear all schemas
   */
  clearSchemas() {
    this.schemas.clear();
  }
}

export { ApiValidator };
