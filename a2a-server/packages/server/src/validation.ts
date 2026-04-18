/**
 * validation — request/response shape validators for the A2A server.
 *
 * Uses Zod for schema validation.  Each export validates one request shape
 * and returns a {valid, errors} result so callers can route errors cleanly
 * without catching exceptions.
 */

import { z, ZodType, ZodError } from 'zod';
import { logger } from '@a2a/server-utils/logger';

// ── Generic helper ────────────────────────────────────────────────────────────

export interface ValidationResult<T = unknown> {
    valid: boolean;
    data?: T;
    errors: string[];
}

export function validateWith<T>(schema: ZodType<T>, data: unknown): ValidationResult<T> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { valid: true, data: result.data, errors: [] };
    }
    const errors = (result.error as ZodError).issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
    );
    logger.debug('[validation] Schema validation failed', { errors });
    return { valid: false, errors };
}

// ── A2A task request ──────────────────────────────────────────────────────────

const TaskRequestSchema = z.object({
    id: z.string().optional(),
    sessionId: z.string().optional(),
    message: z.string().min(1, 'message must not be empty'),
    schema: z.string().optional(),
    context: z.record(z.unknown()).optional(),
    stream: z.boolean().optional(),
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;

export function validateTaskRequest(data: unknown): ValidationResult<TaskRequest> {
    return validateWith(TaskRequestSchema, data);
}

// ── Generic "any object" catch-all ────────────────────────────────────────────

export function validateRequest(data: unknown): ValidationResult {
    if (data === null || data === undefined) {
        return { valid: false, errors: ['Request body must not be null or undefined'] };
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
        return { valid: false, errors: ['Request body must be a plain object'] };
    }
    return { valid: true, data, errors: [] };
}
