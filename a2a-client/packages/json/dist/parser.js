"use strict";
/**
 * @a2a/json - Unified JSON Parser
 * Parses server JSON responses into typed UnifiedResponse objects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResponse = parseResponse;
exports.parseResponseString = parseResponseString;
exports.detectResponseType = detectResponseType;
exports.isResponseType = isResponseType;
exports.isActionProposalResponse = isActionProposalResponse;
exports.isActionExecutingResponse = isActionExecutingResponse;
exports.isActionProgressResponse = isActionProgressResponse;
exports.isActionCompletedResponse = isActionCompletedResponse;
exports.isActionErrorResponse = isActionErrorResponse;
exports.extractActionId = extractActionId;
exports.extractSummary = extractSummary;
const validator_js_1 = require("./validator.js");
/**
 * Default parse options
 */
const defaultOptions = {
    throwOnError: false,
    returnPartial: true,
};
/**
 * Parse JSON response from server
 * @param json - Raw JSON data from server
 * @param options - Parse options
 * @returns ParsedResponse with type information and data
 * @throws Error if throwOnError is true and validation fails
 */
function parseResponse(json, options = {}) {
    const opts = { ...defaultOptions, ...options };
    // Handle null/undefined
    if (json === null || json === undefined) {
        const error = {
            type: 'action_error',
            success: false,
            timestamp: new Date().toISOString(),
            data: createErrorResponse('PARSE_ERROR', 'Response is null or undefined'),
            errors: ['Response is null or undefined'],
        };
        if (opts.throwOnError) {
            throw new Error('Response is null or undefined');
        }
        return error;
    }
    // Validate the response
    const validation = (0, validator_js_1.validateResponse)(json);
    if (!validation.valid) {
        const error = {
            type: 'action_error',
            success: false,
            timestamp: new Date().toISOString(),
            data: createErrorResponse('VALIDATION_ERROR', validation.errors?.join(', ') || 'Unknown validation error'),
            errors: validation.errors,
        };
        if (opts.throwOnError) {
            throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
        }
        return error;
    }
    const response = validation.data;
    return {
        type: response.type,
        success: response.success,
        timestamp: response.timestamp,
        data: response,
    };
}
/**
 * Parse JSON string to UnifiedResponse
 * @param jsonString - JSON string from server
 * @param options - Parse options
 * @returns ParsedResponse
 */
function parseResponseString(jsonString, options) {
    try {
        const json = JSON.parse(jsonString);
        return parseResponse(json, options);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse JSON';
        return {
            type: 'action_error',
            success: false,
            timestamp: new Date().toISOString(),
            data: createErrorResponse('JSON_PARSE_ERROR', errorMessage),
            errors: [errorMessage],
        };
    }
}
/**
 * Detect response type from raw JSON without full validation
 * @param json - Raw JSON data
 * @returns Detected response type or undefined
 */
function detectResponseType(json) {
    if (!json || typeof json !== 'object') {
        return undefined;
    }
    const obj = json;
    const type = obj.type;
    if (typeof type !== 'string') {
        return undefined;
    }
    const validTypes = [
        'action_proposal',
        'action_executing',
        'action_progress',
        'action_completed',
        'action_error',
    ];
    return validTypes.includes(type) ? type : undefined;
}
/**
 * Check if response is a specific type
 * @param response - UnifiedResponse
 * @param type - Type to check
 * @returns True if response matches type
 */
function isResponseType(response, type) {
    return response.type === type;
}
/**
 * Type guards for each response type
 */
function isActionProposalResponse(response) {
    return response.type === 'action_proposal';
}
function isActionExecutingResponse(response) {
    return response.type === 'action_executing';
}
function isActionProgressResponse(response) {
    return response.type === 'action_progress';
}
function isActionCompletedResponse(response) {
    return response.type === 'action_completed';
}
function isActionErrorResponse(response) {
    return response.type === 'action_error';
}
/**
 * Extract action ID from response
 * @param response - UnifiedResponse
 * @returns Action ID if present
 */
function extractActionId(response) {
    switch (response.type) {
        case 'action_proposal':
            return response.result.proposedActions[0]?.id;
        case 'action_executing':
            return response.result.executingAction.id;
        case 'action_progress':
            return response.result.actionId;
        case 'action_completed':
            return response.result.actionId;
        case 'action_error':
            return response.result.actionId;
        default:
            return undefined;
    }
}
/**
 * Extract summary/message from response
 * @param response - UnifiedResponse
 * @returns Summary or message string
 */
function extractSummary(response) {
    switch (response.type) {
        case 'action_proposal':
            return `${response.result.proposedActions.length} action(s) proposed`;
        case 'action_executing':
            return `Executing: ${response.result.executingAction.name}`;
        case 'action_progress':
            return response.result.message || `Step: ${response.result.currentStep.title}`;
        case 'action_completed':
            return response.result.summary;
        case 'action_error':
            return response.result.error.message;
        default:
            return 'Unknown response type';
    }
}
/**
 * Create error response helper
 */
function createErrorResponse(code, message) {
    return {
        success: false,
        timestamp: new Date().toISOString(),
        type: 'action_error',
        result: {
            actionId: 'system',
            error: {
                code,
                message,
            },
            canRetry: false,
        },
    };
}
