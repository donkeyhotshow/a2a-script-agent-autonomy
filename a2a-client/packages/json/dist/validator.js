"use strict";
/**
 * @a2a/json - Validation schemas using Zod
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedResponseSchema = exports.actionErrorResponseSchema = exports.actionErrorResultSchema = exports.actionErrorSchema = exports.actionCompletedResponseSchema = exports.actionCompletedResultSchema = exports.actionProgressResponseSchema = exports.actionProgressResultSchema = exports.currentStepSchema = exports.actionExecutingResponseSchema = exports.actionExecutingResultSchema = exports.nextStepSchema = exports.actionProposalResponseSchema = exports.actionProposalResultSchema = exports.fallbackActionSchema = exports.actionSchema = exports.contextBlockSchema = exports.protocolErrorSchema = exports.taskSchema = exports.baseResponseSchema = void 0;
exports.validateResponse = validateResponse;
exports.getResponseType = getResponseType;
exports.isUnifiedResponse = isUnifiedResponse;
exports.validateResponseType = validateResponseType;
const zod_1 = require("zod");
// ============================================
// Base Schemas
// ============================================
/**
 * Base response schema
 */
exports.baseResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    timestamp: zod_1.z.string(),
});
/**
 * Task schema
 */
exports.taskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete']),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
    target: zod_1.z.string().optional(),
    progress: zod_1.z.number().optional(),
});
/**
 * Protocol error schema
 */
exports.protocolErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    file: zod_1.z.string().optional(),
    line: zod_1.z.number().optional(),
});
/**
 * Context block schema
 */
exports.contextBlockSchema = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    session_id: zod_1.z.string(),
    new_task: zod_1.z.array(zod_1.z.string()).optional(),
    architectural_features: zod_1.z.array(zod_1.z.string()).optional(),
    continue: zod_1.z.boolean().optional(),
    tasks: zod_1.z.array(exports.taskSchema).optional(),
    request_files: zod_1.z.array(zod_1.z.string()).optional(),
    confirm: zod_1.z.boolean().optional(),
    errors: zod_1.z.array(exports.protocolErrorSchema).optional(),
});
// ============================================
// Action Proposal Schemas
// ============================================
/**
 * Action schema
 */
exports.actionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.number().optional(),
    dsl: zod_1.z.record(zod_1.z.unknown()).optional(),
    dslScript: zod_1.z.string().optional(),
});
/**
 * Fallback action schema
 */
exports.fallbackActionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
});
/**
 * Action proposal result schema
 */
exports.actionProposalResultSchema = zod_1.z.object({
    context: exports.contextBlockSchema,
    proposedActions: zod_1.z.array(exports.actionSchema),
    fallbackActions: zod_1.z.array(exports.fallbackActionSchema).optional(),
});
/**
 * Action proposal response schema
 */
exports.actionProposalResponseSchema = exports.baseResponseSchema.extend({
    type: zod_1.z.literal('action_proposal'),
    result: exports.actionProposalResultSchema,
});
// ============================================
// Action Executing Schemas
// ============================================
/**
 * Next step schema
 */
exports.nextStepSchema = zod_1.z.object({
    actionId: zod_1.z.string(),
    title: zod_1.z.string(),
});
/**
 * Action executing result schema
 */
exports.actionExecutingResultSchema = zod_1.z.object({
    executingAction: exports.actionSchema,
    nextSteps: zod_1.z.array(exports.actionSchema),
});
/**
 * Action executing response schema
 */
exports.actionExecutingResponseSchema = exports.baseResponseSchema.extend({
    type: zod_1.z.literal('action_executing'),
    result: exports.actionExecutingResultSchema,
});
// ============================================
// Action Progress Schemas
// ============================================
/**
 * Current step schema
 */
exports.currentStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    code: zod_1.z.string().optional(),
    progress: zod_1.z.number(),
});
/**
 * Action progress result schema
 */
exports.actionProgressResultSchema = zod_1.z.object({
    actionId: zod_1.z.string(),
    currentStep: exports.currentStepSchema,
    completedSteps: zod_1.z.array(zod_1.z.string()),
    remainingSteps: zod_1.z.array(zod_1.z.string()),
    message: zod_1.z.string().optional(),
});
/**
 * Action progress response schema
 */
exports.actionProgressResponseSchema = exports.baseResponseSchema.extend({
    type: zod_1.z.literal('action_progress'),
    result: exports.actionProgressResultSchema,
});
// ============================================
// Action Completed Schemas
// ============================================
/**
 * Action completed result schema
 */
exports.actionCompletedResultSchema = zod_1.z.object({
    actionId: zod_1.z.string(),
    summary: zod_1.z.string(),
    output: zod_1.z.unknown().optional(),
    filesModified: zod_1.z.array(zod_1.z.string()).optional(),
    executionTimeMs: zod_1.z.number().optional(),
});
/**
 * Action completed response schema
 */
exports.actionCompletedResponseSchema = exports.baseResponseSchema.extend({
    type: zod_1.z.literal('action_completed'),
    result: exports.actionCompletedResultSchema,
});
// ============================================
// Action Error Schemas
// ============================================
/**
 * Action error schema
 */
exports.actionErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
    stack: zod_1.z.string().optional(),
});
/**
 * Action error result schema
 */
exports.actionErrorResultSchema = zod_1.z.object({
    actionId: zod_1.z.string(),
    error: exports.actionErrorSchema,
    failedStep: zod_1.z.string().optional(),
    canRetry: zod_1.z.boolean(),
});
/**
 * Action error response schema
 */
exports.actionErrorResponseSchema = exports.baseResponseSchema.extend({
    type: zod_1.z.literal('action_error'),
    result: exports.actionErrorResultSchema,
});
// ============================================
// Unified Response Schema
// ============================================
/**
 * Unified response schema - union of all response types
 */
exports.unifiedResponseSchema = zod_1.z.union([
    exports.actionProposalResponseSchema,
    exports.actionExecutingResponseSchema,
    exports.actionProgressResponseSchema,
    exports.actionCompletedResponseSchema,
    exports.actionErrorResponseSchema,
]);
// ============================================
// Validation Functions
// ============================================
/**
 * Validate raw JSON data against unified response schema
 * @param data - Raw JSON data to validate
 * @returns ValidationResult with validation status and parsed data
 */
function validateResponse(data) {
    const result = exports.unifiedResponseSchema.safeParse(data);
    if (result.success) {
        return {
            valid: true,
            data: result.data,
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
function getResponseType(data) {
    const result = validateResponse(data);
    return result.valid ? result.data?.type : undefined;
}
/**
 * Check if data is a valid unified response
 * @param data - Data to check
 * @returns True if valid unified response
 */
function isUnifiedResponse(data) {
    return validateResponse(data).valid;
}
/**
 * Validate specific response type
 * @param data - Data to validate
 * @param type - Expected response type
 * @returns ValidationResult
 */
function validateResponseType(data, type) {
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
