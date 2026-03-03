/**
 * A2A Protocol Runtime Validator
 * 
 * Validates request and response messages against JSON Schema definitions.
 */

import Ajv, { ValidateFunction, ErrorSchema } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import schemas
import messageSchema from '../../../../schemas/protocol/message.schema.json';
import contextSchema from '../../../../schemas/protocol/context.schema.json';
import actionSchema from '../../../../schemas/protocol/action.schema.json';
import requestSchema from '../../../../schemas/protocol/request.schema.json';
import responseSchema from '../../../../schemas/protocol/response.schema.json';

// Initialize AJV with options
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  coerceTypes: true,
  useDefaults: true
});

// Add format validation
addFormats(ajv);

// Compile schemas
const validators: Map<string, ValidateFunction> = new Map();

function compileSchemas() {
  try {
    validators.set('message', ajv.compile(messageSchema));
    validators.set('context', ajv.compile(contextSchema));
    validators.set('action', ajv.compile(actionSchema));
    validators.set('request', ajv.compile(requestSchema));
    validators.set('response', ajv.compile(responseSchema));
  } catch (error) {
    console.error('Failed to compile schemas:', error);
    throw error;
  }
}

compileSchemas();

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
  params: Record<string, unknown>;
}

/**
 * Validate data against a specific schema
 */
export function validate(schemaName: string, data: unknown): ValidationResult {
  const validator = validators.get(schemaName);
  
  if (!validator) {
    return {
      valid: false,
      errors: [{
        instancePath: '',
        schemaPath: '',
        keyword: 'schema',
        message: `Unknown schema: ${schemaName}`,
        params: {}
      }]
    };
  }

  const valid = validator(data);
  
  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validator.errors || []).map(err => ({
    instancePath: err.instancePath || '',
    schemaPath: err.schemaPath || '',
    keyword: err.keyword,
    message: err.message,
    params: err.params as Record<string, unknown>
  }));

  return { valid: false, errors };
}

/**
 * Validate A2A Request
 */
export function validateRequest(data: unknown): ValidationResult {
  return validate('request', data);
}

/**
 * Validate A2A Response
 */
export function validateResponse(data: unknown): ValidationResult {
  return validate('response', data);
}

/**
 * Validate Context object
 */
export function validateContext(data: unknown): ValidationResult {
  return validate('context', data);
}

/**
 * Validate Message object
 */
export function validateMessage(data: unknown): ValidationResult {
  return validate('message', data);
}

/**
 * Validate Execute action (action-key shape)
 */
export function validateExecute(data: unknown): ValidationResult {
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: [{
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        message: 'Execute must be an object',
        params: { type: 'object' }
      }]
    };
  }

  const execute = data as Record<string, unknown>;
  const validActionKeys = [
    'form',
    'script',
    'read-file',
    'write-file',
    'rag-search',
    'execute-command',
    'message'
  ];

  const keys = Object.keys(execute);
  
  if (keys.length === 0) {
    return {
      valid: false,
      errors: [{
        instancePath: '',
        schemaPath: '',
        keyword: 'minProperties',
        message: 'Execute must have at least one action key',
        params: { minProperties: 1 }
      }]
    };
  }

  for (const key of keys) {
    if (!validActionKeys.includes(key)) {
      return {
        valid: false,
        errors: [{
          instancePath: `/${key}`,
          schemaPath: '',
          keyword: 'enum',
          message: `Invalid action key: ${key}. Must be one of: ${validActionKeys.join(', ')}`,
          params: { allowedValues: validActionKeys }
        }]
      };
    }
  }

  return { valid: true, errors: [] };
}

/**
 * Validate Result object (action-key shape)
 */
export function validateResult(data: unknown): ValidationResult {
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: [{
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        message: 'Result must be an object',
        params: { type: 'object' }
      }]
    };
  }

  const result = data as Record<string, unknown>;
  const validResultKeys = [
    'form',
    'script',
    'read-file',
    'write-file',
    'rag-search',
    'execute-command',
    'choice',
    'message'
  ];

  // Check if it's a simple choice result
  if (typeof result.choice === 'string') {
    return { valid: true, errors: [] };
  }

  const keys = Object.keys(result);
  
  for (const key of keys) {
    if (!validResultKeys.includes(key)) {
      return {
        valid: false,
        errors: [{
          instancePath: `/${key}`,
          schemaPath: '',
          keyword: 'enum',
          message: `Invalid result key: ${key}. Must be one of: ${validResultKeys.join(', ')}`,
          params: { allowedValues: validResultKeys }
        }]
      };
    }
  }

  return { valid: true, errors: [] };
}

/**
 * Validation middleware for Express
 */
export function requestValidator(req: unknown, res: unknown, next: () => void) {
  const result = validateRequest(req);
  
  if (!result.valid) {
    const error = new Error(`Invalid request: ${result.errors.map(e => e.message).join(', ')}`);
    (error as any).statusCode = 400;
    (error as any).validationErrors = result.errors;
    return next(error);
  }
  
  next();
}

/**
 * Response validator middleware
 */
export function responseValidator(req: unknown, res: unknown, next: () => void) {
  const result = validateResponse(res);
  
  if (!result.valid) {
    const error = new Error(`Invalid response: ${result.errors.map(e => e.message).join(', ')}`);
    (error as any).statusCode = 500;
    (error as any).validationErrors = result.errors;
    return next(error);
  }
  
  next();
}

/**
 * Get schema by name
 */
export function getSchema(schemaName: string): unknown {
  const schemas: Record<string, unknown> = {
    message: messageSchema,
    context: contextSchema,
    action: actionSchema,
    request: requestSchema,
    response: responseSchema
  };
  
  return schemas[schemaName];
}

/**
 * Get all available schemas
 */
export function getAllSchemas(): Record<string, unknown> {
  return {
    message: messageSchema,
    context: contextSchema,
    action: actionSchema,
    request: requestSchema,
    response: responseSchema
  };
}

export default {
  validate,
  validateRequest,
  validateResponse,
  validateContext,
  validateMessage,
  validateExecute,
  validateResult,
  requestValidator,
  responseValidator,
  getSchema,
  getAllSchemas
};
