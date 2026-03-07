/**
 * Action Validator - Simulation Mode
 *
 * Runtime validation for action definitions.
 */

import { z } from 'zod';

// Validation result type
export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

// Local Zod schemas (replaced from deleted generated-types.js)
const FormActionSchema = z.object({
  form: z.object({
    choices: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
    title: z.string().optional()
  })
});

const ScriptActionSchema = z.object({
  script: z.object({
    input: z.record(z.unknown()),
    output: z.string(),
    code: z.string()
  })
});

const ReadFileActionSchema = z.object({
  'read-file': z.object({
    path: z.string(),
    content: z.string().optional()
  })
});

const WriteFileActionSchema = z.object({
  'write-file': z.object({
    path: z.string(),
    content: z.string()
  })
});

const ExecuteCommandActionSchema = z.object({
  'execute-command': z.object({
    command: z.string(),
    workingDir: z.string().optional()
  })
});

const MessageActionSchema = z.object({
  message: z.string()
});

const ExecutePayloadSchema = z.union([
  FormActionSchema,
  ScriptActionSchema,
  ReadFileActionSchema,
  WriteFileActionSchema,
  ExecuteCommandActionSchema,
  MessageActionSchema
]);

const ActionResultSchema = z.record(z.unknown());

/**
 * Validate action definition structure
 */
export function validateActionDefinition(definition: unknown): ValidationResult {
  const schema = z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
    title: z.string().min(1),
    description: z.string().min(1),
    triggers: z.array(z.string()).optional(),
    priority: z.number().optional(),
    context: z.record(z.unknown()).optional(),
    steps: z.array(z.object({
      id: z.string(),
      description: z.string(),
      action: z.enum(['script', 'form', 'message', 'read-file', 'write-file', 'execute-command']).optional(),
      input: z.record(z.unknown()).optional(),
      output: z.string().optional(),
      code: z.string().optional()
    })).optional()
  });

  const result = schema.safeParse(definition);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

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

export function validateExecutePayload(payload: unknown): ValidationResult {
  const result = ExecutePayloadSchema.safeParse(payload);
  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateExecutePayloadDetailed(payload: unknown): ValidationResult {
  const result = ExecutePayloadSchema.safeParse(payload);
  if (result.success) {
    const keys = Object.keys(payload as object);
    const validKeys = ['form', 'script', 'read-file', 'write-file', 'execute-command', 'message'];
    const hasValidKey = keys.some(k => validKeys.includes(k));
    if (!hasValidKey) {
      return { success: false, errors: [`Execute payload must contain at least one action key`] };
    }
    return { success: true };
  }
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateActionResult(result: unknown): ValidationResult {
  const r = ActionResultSchema.safeParse(result);
  if (r.success) return { success: true };
  return { success: false, errors: r.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

export function validateActionKeyShape(obj: unknown, context: 'execute' | 'result'): ValidationResult {
  if (typeof obj !== 'object' || obj === null) {
    return { success: false, errors: ['Must be an object'] };
  }

  const validExecuteKeys = ['form', 'script', 'read-file', 'write-file', 'execute-command', 'message'];
  const validResultKeys = [...validExecuteKeys, 'choice', 'completed'];
  const validKeys = context === 'execute' ? validExecuteKeys : validResultKeys;

  const keys = Object.keys(obj);
  const objRecord = obj as Record<string, unknown>;

  if (keys.includes('action') && typeof objRecord['action'] === 'string') {
    return { success: false, errors: [`Invalid ${context} structure: use action-key shape`] };
  }

  if (context === 'result' && keys.includes('content') && keys.length === 1) {
    return { success: false, errors: ['Invalid result structure: use action-key shape'] };
  }

  const hasValidKey = keys.some(k => validKeys.includes(k));
  if (!hasValidKey && keys.length > 0) {
    return { success: false, errors: [`No valid action key found`] };
  }

  return { success: true };
}

export function validateActionResponse(response: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof response !== 'object' || response === null) {
    return { success: false, errors: ['Response must be an object'] };
  }

  const resp = response as Record<string, unknown>;

  if (resp['context'] && typeof resp['context'] !== 'object') {
    errors.push('context must be an object');
  }

  if (resp['execute']) {
    const execValidation = validateExecutePayloadDetailed(resp['execute']);
    if (!execValidation.success) errors.push(...(execValidation.errors || []));

    const shapeValidation = validateActionKeyShape(resp['execute'], 'execute');
    if (!shapeValidation.success) errors.push(...(shapeValidation.errors || []));
  }

  if (resp['result']) {
    const r = ActionResultSchema.safeParse(resp['result']);
    if (!r.success) errors.push(...r.error.errors.map(e => `result.${e.path.join('.')}: ${e.message}`));

    const shapeValidation = validateActionKeyShape(resp['result'], 'result');
    if (!shapeValidation.success) errors.push(...(shapeValidation.errors || []));
  }

  if (resp['message'] && typeof resp['message'] !== 'string') {
    errors.push('message must be a string');
  }

  return errors.length === 0 ? { success: true } : { success: false, errors };
}

export function createActionValidator<T>(schema: z.ZodType<T>) {
  return (data: unknown): { success: boolean; data?: T; errors?: string[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
  };
}

export const validateReadFileResult = createActionValidator(
  z.object({ path: z.string(), content: z.string().optional(), error: z.string().optional() })
);

export const validateWriteFileResult = createActionValidator(
  z.object({ path: z.string(), success: z.boolean(), error: z.string().optional() })
);

export const validateExecuteCommandResult = createActionValidator(
  z.object({ command: z.string(), exitCode: z.number(), stdout: z.string(), stderr: z.string() })
);
