/**
 * @a2a/json - Validation schemas using Zod
 */

import { z, ZodError } from 'zod';
import type { UnifiedResponse, ValidationResult, ResponseType } from './types.js';

// ============================================
// Base Schemas
// ============================================

/**
 * Base response schema
 */
export const baseResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
});

/**
 * Task schema
 */
export const taskSchema = z.object({
  id: z.string(),
  type: z.enum(['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  target: z.string().optional(),
  progress: z.number().optional(),
});

/**
 * Protocol error schema
 */
export const protocolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
});

/**
 * Context block schema
 */
export const contextBlockSchema = z.object({
  version: z.literal('1.0'),
  session_id: z.string(),
  new_task: z.array(z.string()).optional(),
  architectural_features: z.array(z.string()).optional(),
  continue: z.boolean().optional(),
  tasks: z.array(taskSchema).optional(),
  request_files: z.array(z.string()).optional(),
  confirm: z.boolean().optional(),
  errors: z.array(protocolErrorSchema).optional(),
});

// ============================================
// Action Proposal Schemas
// ============================================

/**
 * Action schema
 */
export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priority: z.number().optional(),
  dsl: z.record(z.unknown()).optional(),
  dslScript: z.string().optional(),
});

/**
 * Fallback action schema
 */
export const fallbackActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  reason: z.string().optional(),
});

/**
 * Action proposal result schema
 */
export const actionProposalResultSchema = z.object({
  context: contextBlockSchema,
  proposedActions: z.array(actionSchema),
  fallbackActions: z.array(fallbackActionSchema).optional(),
});

/**
 * Action proposal response schema
 */
export const actionProposalResponseSchema = baseResponseSchema.extend({
  type: z.literal('action_proposal'),
  result: actionProposalResultSchema,
});

// ============================================
// Action Executing Schemas
// ============================================

/**
 * Next step schema
 */
export const nextStepSchema = z.object({
  actionId: z.string(),
  title: z.string(),
});

/**
 * Action executing result schema
 */
export const actionExecutingResultSchema = z.object({
  executingAction: actionSchema,
  nextSteps: z.array(actionSchema),
});

/**
 * Action executing response schema
 */
export const actionExecutingResponseSchema = baseResponseSchema.extend({
  type: z.literal('action_executing'),
  result: actionExecutingResultSchema,
});

// ============================================
// Action Progress Schemas
// ============================================

/**
 * Current step schema
 */
export const currentStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string().optional(),
  progress: z.number(),
});

/**
 * Action progress result schema
 */
export const actionProgressResultSchema = z.object({
  actionId: z.string(),
  currentStep: currentStepSchema,
  completedSteps: z.array(z.string()),
  remainingSteps: z.array(z.string()),
  message: z.string().optional(),
});

/**
 * Action progress response schema
 */
export const actionProgressResponseSchema = baseResponseSchema.extend({
  type: z.literal('action_progress'),
  result: actionProgressResultSchema,
});

// ============================================
// Action Completed Schemas
// ============================================

/**
 * Action completed result schema
 */
export const actionCompletedResultSchema = z.object({
  actionId: z.string(),
  summary: z.string(),
  output: z.unknown().optional(),
  filesModified: z.array(z.string()).optional(),
  executionTimeMs: z.number().optional(),
});

/**
 * Action completed response schema
 */
export const actionCompletedResponseSchema = baseResponseSchema.extend({
  type: z.literal('action_completed'),
  result: actionCompletedResultSchema,
});

// ============================================
// Action Error Schemas
// ============================================

/**
 * Action error schema
 */
export const actionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
});

/**
 * Action error result schema
 */
export const actionErrorResultSchema = z.object({
  actionId: z.string(),
  error: actionErrorSchema,
  failedStep: z.string().optional(),
  canRetry: z.boolean(),
});

/**
 * Action error response schema
 */
export const actionErrorResponseSchema = baseResponseSchema.extend({
  type: z.literal('action_error'),
  result: actionErrorResultSchema,
});

// ============================================
// Unified Response Schema
// ============================================

/**
 * Unified response schema - union of all response types
 */
export const unifiedResponseSchema = z.union([
  actionProposalResponseSchema,
  actionExecutingResponseSchema,
  actionProgressResponseSchema,
  actionCompletedResponseSchema,
  actionErrorResponseSchema,
]);

// ============================================
// Validation Functions
// ============================================

/**
 * Validate raw JSON data against unified response schema
 * @param data - Raw JSON data to validate
 * @returns ValidationResult with validation status and parsed data
 */
export function validateResponse(data: unknown): ValidationResult {
  const result = unifiedResponseSchema.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data as UnifiedResponse,
    };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return {
    valid: false,
    errors,
  };
}

/**
 * Validate and extract response type from data
 * @param data - Raw JSON data
 * @returns Response type if valid, undefined otherwise
 */
export function getResponseType(data: unknown): ResponseType | undefined {
  const result = validateResponse(data);
  return result.valid ? result.data?.type : undefined;
}

/**
 * Check if data is a valid unified response
 * @param data - Data to check
 * @returns True if valid unified response
 */
export function isUnifiedResponse(data: unknown): boolean {
  return validateResponse(data).valid;
}

/**
 * Validate specific response type
 * @param data - Data to validate
 * @param type - Expected response type
 * @returns ValidationResult
 */
export function validateResponseType(data: unknown, type: ResponseType): ValidationResult {
  const result = validateResponse(data);
  
  if (!result.valid) {
    return result;
  }

  if (result.data?.type !== type) {
    return {
      valid: false,
      errors: [`Expected response type '${type}', got '${result.data?.type}'`],
    };
  }

  return result;
}
