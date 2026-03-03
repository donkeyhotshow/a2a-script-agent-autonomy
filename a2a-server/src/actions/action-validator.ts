/**
 * Action Validator
 * 
 * Runtime validation for action definitions and execute payloads.
 * Uses Zod schemas generated from YAML definitions.
 */

import { z } from 'zod';
import {
  ExecutePayloadSchema,
  ActionResultSchema,
  FormActionSchema,
  ScriptActionSchema,
  RagSearchActionSchema,
  ReadFileActionSchema,
  WriteFileActionSchema,
  ExecuteCommandActionSchema,
  MessageActionSchema
} from './generated-types.js';

// Re-export generated validation functions
export {
  validateExecutePayload,
  validateActionResult
} from './generated-types.js';

// Validation result type
export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

/**
 * Validate action definition structure
 */
export function validateActionDefinition(definition: unknown): ValidationResult {
  const schema = z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, {
      message: 'ID must be kebab-case starting with a letter'
    }),
    version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, {
      message: 'Version must be semantic (e.g., 1.0.0)'
    }),
    title: z.string().min(1),
    description: z.string().min(1),
    abstract: z.boolean().optional(),
    base: z.string().optional(),
    triggers: z.array(z.string()).optional(),
    priority: z.number().optional(),
    context: z.record(z.unknown()).optional(),
    mixins: z.array(z.string()).optional(),
    steps: z.array(z.object({
      id: z.string().regex(/^[a-z][a-z0-9-]*$/),
      description: z.string(),
      title: z.string().optional(),
      priority: z.number().optional(),
      $mixin: z.string().optional(),
      if: z.string().optional(),
      action: z.enum(['script', 'form', 'message', 'rag-search', 'read-file', 'write-file', 'execute-command']).optional(),
      input: z.union([z.record(z.unknown()), z.string()]).optional(),
      output: z.string().optional(),
      script: z.string().optional(),
      code: z.string().optional()
    })).optional()
  });

  const result = schema.safeParse(definition);
  
  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

/**
 * Validate specific action type
 */
export function validateFormAction(action: unknown): ValidationResult {
  const result = FormActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateScriptAction(action: unknown): ValidationResult {
  const result = ScriptActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateRagSearchAction(action: unknown): ValidationResult {
  const result = RagSearchActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateReadFileAction(action: unknown): ValidationResult {
  const result = ReadFileActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateWriteFileAction(action: unknown): ValidationResult {
  const result = WriteFileActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateExecuteCommandAction(action: unknown): ValidationResult {
  const result = ExecuteCommandActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateMessageAction(action: unknown): ValidationResult {
  const result = MessageActionSchema.safeParse(action);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

/**
 * Validate execute payload with detailed error reporting
 */
export function validateExecutePayloadDetailed(payload: unknown): ValidationResult {
  const result = ExecutePayloadSchema.safeParse(payload);
  
  if (result.success) {
    // Additional validation: ensure at least one action key is present
    const keys = Object.keys(payload as object);
    const validKeys = ['form', 'script', 'rag-search', 'read-file', 'write-file', 'execute-command', 'message'];
    const hasValidKey = keys.some(k => validKeys.includes(k));
    
    if (!hasValidKey) {
      return {
        success: false,
        errors: [`Execute payload must contain at least one action key: ${validKeys.join(', ')}`]
      };
    }
    
    return { success: true };
  }

  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

/**
 * Validate action-key shape compliance
 * Ensures result and execute use proper action-key format
 */
export function validateActionKeyShape(obj: unknown, context: 'execute' | 'result'): ValidationResult {
  if (typeof obj !== 'object' || obj === null) {
    return { success: false, errors: ['Must be an object'] };
  }

  const validExecuteKeys = ['form', 'script', 'rag-search', 'read-file', 'write-file', 'execute-command', 'message'];
  const validResultKeys = [...validExecuteKeys, 'choice', 'completed'];
  const validKeys = context === 'execute' ? validExecuteKeys : validResultKeys;
  
  const keys = Object.keys(obj);
  const objRecord = obj as Record<string, unknown>;
  
  // Check for flat structure (incorrect)
  if (keys.includes('action') && typeof objRecord['action'] === 'string') {
    return {
      success: false,
      errors: [`Invalid ${context} structure: use action-key shape (e.g., { "${validKeys[0]}": {...} }), not { "action": "..." }`]
    };
  }
  
  // Check for generic content field (incorrect for result)
  if (context === 'result' && keys.includes('content') && keys.length === 1) {
    return {
      success: false,
      errors: ['Invalid result structure: use action-key shape (e.g., { "read-file": { "path": "...", "content": "..." } }), not { "content": "..." }']
    };
  }
  
  // Check that at least one valid key is present
  const hasValidKey = keys.some(k => validKeys.includes(k));
  if (!hasValidKey && keys.length > 0) {
    return {
      success: false,
      errors: [`No valid action key found. Valid keys: ${validKeys.join(', ')}`]
    };
  }
  
  return { success: true };
}

/**
 * Comprehensive validation for action response
 */
export function validateActionResponse(response: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (typeof response !== 'object' || response === null) {
    return { success: false, errors: ['Response must be an object'] };
  }
  
  const resp = response as Record<string, unknown>;
  
  // Validate context if present
  if (resp['context']) {
    if (typeof resp['context'] !== 'object') {
      errors.push('context must be an object');
    }
  }
  
  // Validate execute if present
  if (resp['execute']) {
    const executeValidation = validateExecutePayloadDetailed(resp['execute']);
    if (!executeValidation.success) {
      errors.push(...(executeValidation.errors || []));
    }
    
    const shapeValidation = validateActionKeyShape(resp['execute'], 'execute');
    if (!shapeValidation.success) {
      errors.push(...(shapeValidation.errors || []));
    }
  }
  
  // Validate result if present
  if (resp['result']) {
    const resultValidation = ActionResultSchema.safeParse(resp['result']);
    if (!resultValidation.success) {
      errors.push(...resultValidation.error.errors.map(e => `result.${e.path.join('.')}: ${e.message}`));
    }
    
    const shapeValidation = validateActionKeyShape(resp['result'], 'result');
    if (!shapeValidation.success) {
      errors.push(...(shapeValidation.errors || []));
    }
  }
  
  // Validate message if present
  if (resp['message'] && typeof resp['message'] !== 'string') {
    errors.push('message must be a string');
  }
  
  return errors.length === 0 ? { success: true } : { success: false, errors };
}

/**
 * Create a validator for specific action type
 */
export function createActionValidator<T>(schema: z.ZodType<T>) {
  return (data: unknown): { success: boolean; data?: T; errors?: string[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    };
  };
}

// Convenience validators for common patterns
export const validateRagSearchResult = createActionValidator(
  z.object({
    results: z.array(z.unknown()),
    files: z.array(z.string()),
    query: z.string().optional()
  })
);

export const validateReadFileResult = createActionValidator(
  z.object({
    path: z.string(),
    content: z.string().optional(),
    error: z.string().optional()
  })
);

export const validateWriteFileResult = createActionValidator(
  z.object({
    path: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  })
);

export const validateExecuteCommandResult = createActionValidator(
  z.object({
    command: z.string(),
    exitCode: z.number(),
    stdout: z.string(),
    stderr: z.string()
  })
);
