/**
 * @a2a/json - Unified JSON Parser
 * Parses server JSON responses into typed UnifiedResponse objects
 */

import type {
    UnifiedResponse,
    ResponseType,
    ParsedResponse,
    ActionProposalResponse,
    ActionExecutingResponse,
    ActionProgressResponse,
    ActionCompletedResponse,
    ActionErrorResponse
} from './types.js';
import {validateResponse, getResponseType} from './validator.js';

/**
 * Parse options
 */
export interface ParseOptions {
    /** If true, throws on validation error */
    throwOnError?: boolean;
    /** If true, returns partial result on error */
    returnPartial?: boolean;
}

/**
 * Default parse options
 */
const defaultOptions: ParseOptions = {
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
export function parseResponse(json: unknown, options: ParseOptions = {}): ParsedResponse {
    const opts = {...defaultOptions, ...options};

    // Handle null/undefined
    if (json === null || json === undefined) {
        const error: ParsedResponse = {
            type: 'action_error' as ResponseType,
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
    const validation = validateResponse(json);

    if (!validation.valid) {
        const error: ParsedResponse = {
            type: 'action_error' as ResponseType,
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

    const response = validation.data as UnifiedResponse;

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
export function parseResponseString(jsonString: string, options?: ParseOptions): ParsedResponse {
    try {
        const json = JSON.parse(jsonString);
        return parseResponse(json, options);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse JSON';
        return {
            type: 'action_error' as ResponseType,
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
export function detectResponseType(json: unknown): ResponseType | undefined {
    if (!json || typeof json !== 'object') {
        return undefined;
    }

    const obj = json as Record<string, unknown>;
    const type = obj.type;

    if (typeof type !== 'string') {
        return undefined;
    }

    const validTypes: ResponseType[] = [
        'action_proposal',
        'action_executing',
        'action_progress',
        'action_completed',
        'action_error',
    ];

    return validTypes.includes(type as ResponseType) ? type as ResponseType : undefined;
}

/**
 * Check if response is a specific type
 * @param response - UnifiedResponse
 * @param type - Type to check
 * @returns True if response matches type
 */
export function isResponseType(response: UnifiedResponse, type: ResponseType): boolean {
    return response.type === type;
}

/**
 * Type guards for each response type
 */
export function isActionProposalResponse(response: UnifiedResponse): response is ActionProposalResponse {
    return response.type === 'action_proposal';
}

export function isActionExecutingResponse(response: UnifiedResponse): response is ActionExecutingResponse {
    return response.type === 'action_executing';
}

export function isActionProgressResponse(response: UnifiedResponse): response is ActionProgressResponse {
    return response.type === 'action_progress';
}

export function isActionCompletedResponse(response: UnifiedResponse): response is ActionCompletedResponse {
    return response.type === 'action_completed';
}

export function isActionErrorResponse(response: UnifiedResponse): response is ActionErrorResponse {
    return response.type === 'action_error';
}

/**
 * Extract action ID from response
 * @param response - UnifiedResponse
 * @returns Action ID if present
 */
export function extractActionId(response: UnifiedResponse): string | undefined {
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
export function extractSummary(response: UnifiedResponse): string {
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
function createErrorResponse(code: string, message: string): ActionErrorResponse {
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
