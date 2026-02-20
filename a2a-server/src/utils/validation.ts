import { z } from 'zod';

/**
 * Validation Utilities
 * Common validation schemas and helpers
 */

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Email validation schema
 */
export const emailSchema = z.string().email();

/**
 * Password validation schema (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Git URL validation schema
 */
export const gitUrlSchema = z.string().url().regex(
  /^(https?:\/\/|git@|ssh:\/\/).+\.git$/,
  'Must be a valid Git URL (https://, git@, or ssh://)'
);

/**
 * Branch name validation schema
 */
export const branchNameSchema = z.string()
  .min(1)
  .max(255)
  .regex(
    /^[a-zA-Z0-9._\-/]+$/,
    'Branch name can only contain letters, numbers, dots, underscores, hyphens, and slashes'
  );

/**
 * File path validation schema
 */
export const filePathSchema = z.string()
  .min(1)
  .max(4096)
  .regex(/^[a-zA-Z0-9._\-/]+$/, 'Invalid file path');

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Project ID params schema
 */
export const projectIdParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Session ID params schema
 */
export const sessionIdParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Register input schema
 */
export const registerInputSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Login input schema
 */
export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

/**
 * Create project input schema
 */
export const createProjectInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  gitUrl: gitUrlSchema,
  branch: branchNameSchema.default('main'),
  sshKey: z.string().optional(),
});

/**
 * Create session input schema
 */
export const createSessionInputSchema = z.object({
  projectId: uuidSchema,
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    file_types: z.array(z.string()).optional(),
    directories: z.array(z.string()).optional(),
    framework: z.string().optional(),
    exclude: z.array(z.string()).optional(),
  }).optional(),
  options: z.object({
    limit: z.number().int().min(1).max(100).optional(),
    min_score: z.number().min(0).max(1).optional(),
    include_context: z.boolean().optional(),
    highlight_matches: z.boolean().optional(),
  }).optional(),
});

/**
 * Validate and parse input
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  // TODO: Implement validation wrapper
  // 1. Parse with schema
  // 2. Return parsed data or throw error
  
  throw new Error('validateInput not implemented');
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(str: string): boolean {
  // TODO: Implement JSON validation
  
  throw new Error('isValidJson not implemented');
}

/**
 * Sanitize string (remove HTML tags, trim)
 */
export function sanitizeString(str: string): string {
  // TODO: Implement string sanitization
  
  throw new Error('sanitizeString not implemented');
}

/**
 * Validate file extension
 */
export function isValidFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  // TODO: Implement extension check
  
  throw new Error('isValidFileExtension not implemented');
}

/**
 * Validate MIME type
 */
export function isValidMimeType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  // TODO: Implement MIME type check
  
  throw new Error('isValidMimeType not implemented');
}
