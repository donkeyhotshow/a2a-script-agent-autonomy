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
 * Parse JSON response from server
 * @param json - Raw JSON data from server
 * @param options - Parse options
 * @returns ParsedResponse with type information and data
 * @throws Error if throwOnError is true and validation fails
 */
export declare function parseResponse(json: unknown, options?: ParseOptions): ParsedResponse;

/**
 * Parse JSON string to UnifiedResponse
 * @param jsonString - JSON string from server
 * @param options - Parse options
 * @returns ParsedResponse
 */
export declare function parseResponseString(jsonString: string, options?: ParseOptions): ParsedResponse;

/**
 * Detect response type from raw JSON without full validation
 * @param json - Raw JSON data
 * @returns Detected response type or undefined
 */
export declare function detectResponseType(json: unknown): ResponseType | undefined;

/**
 * Check if response is a specific type
 * @param response - UnifiedResponse
 * @param type - Type to check
 * @returns True if response matches type
 */
export declare function isResponseType(response: UnifiedResponse, type: ResponseType): boolean;

/**
 * Type guards for each response type
 */
export declare function isActionProposalResponse(response: UnifiedResponse): response is ActionProposalResponse;

export declare function isActionExecutingResponse(response: UnifiedResponse): response is ActionExecutingResponse;

export declare function isActionProgressResponse(response: UnifiedResponse): response is ActionProgressResponse;

export declare function isActionCompletedResponse(response: UnifiedResponse): response is ActionCompletedResponse;

export declare function isActionErrorResponse(response: UnifiedResponse): response is ActionErrorResponse;

/**
 * Extract action ID from response
 * @param response - UnifiedResponse
 * @returns Action ID if present
 */
export declare function extractActionId(response: UnifiedResponse): string | undefined;

/**
 * Extract summary/message from response
 * @param response - UnifiedResponse
 * @returns Summary or message string
 */
export declare function extractSummary(response: UnifiedResponse): string;

//# sourceMappingURL=parser.d.ts.map