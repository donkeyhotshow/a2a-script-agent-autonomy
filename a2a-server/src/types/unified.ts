// Unified JSON Response Types for A2A Protocol
// Based on Plan 3: TypeScript типы для Unified JSON

import type {ContextBlock} from './index.js';

// ============================================
// Response Type Union
// ============================================

/**
 * All possible unified response types
 */
export type ResponseType =
    | 'action_proposal'
    | 'action_executing'
    | 'action_progress'
    | 'action_completed'
    | 'action_error';

// ============================================
// Base Response Interface
// ============================================

/**
 * Base interface for all unified responses
 * Contains common fields for all response types
 */
export interface BaseResponse {
    success: boolean;
    timestamp: string;
}

// ============================================
// Action Proposal Response
// ============================================

/**
 * Proposed action with metadata
 */
export interface Action {
    id: string;
    name: string;
    description?: string;
    priority?: number;
    dsl?: Record<string, unknown>;
}

/**
 * Fallback action - alternative action when primary cannot be executed
 */
export interface FallbackAction {
    id: string;
    name: string;
    description?: string;
    reason?: string;
}

/** Result block for action_proposal response (unified JSON / tooling schemas) */
export interface ActionProposalResult {
    context: ContextBlock;
    fallbackActions?: FallbackAction[];
}

/**
 * Response sent when server proposes actions to client
 */
export interface ActionProposalResponse extends BaseResponse {
    type: 'action_proposal';
    result: ActionProposalResult;
}

// ============================================
// Action Executing Response
// ============================================

/**
 * Executing action with current state (unified JSON / tooling schemas)
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */
export interface ExecutingAction {
    actionId: string;
    title: string;
    description?: string;
    priority?: number;
    dsl?: Record<string, unknown>;
}

/**
 * Next step in the action execution
 */
export interface NextStep {
    actionId: string;
    title: string;
}

/** Result block for action_executing response (unified JSON / tooling schemas) */
export interface ActionExecutingResult {
    executingAction: Action;
    nextSteps: Action[];
}

/**
 * Response sent when server is executing an action
 */
export interface ActionExecutingResponse extends BaseResponse {
    type: 'action_executing';
    result: ActionExecutingResult;
}

// ============================================
// Action Progress Response
// ============================================

/**
 * Progress update for ongoing action
 */
export interface ActionProgressResult {
    actionId: string;
    currentStep: {
        id: string;
        title: string;
        code?: string;
        progress: number;
    };
    completedSteps: string[];
    remainingSteps: string[];
    message?: string;
}

/**
 * Response sent during action execution to report progress
 */
export interface ActionProgressResponse extends BaseResponse {
    type: 'action_progress';
    result: ActionProgressResult;
}

// ============================================
// Action Completed Response
// ============================================

/**
 * Completed action result
 */
export interface ActionCompletedResult {
    actionId: string;
    summary: string;
    output?: unknown;
    filesModified?: string[];
    executionTimeMs?: number;
}

/**
 * Response sent when action execution is completed
 */
export interface ActionCompletedResponse extends BaseResponse {
    type: 'action_completed';
    result: ActionCompletedResult;
}

// ============================================
// Action Error Response
// ============================================

/**
 * Error details
 */
export interface ActionError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
}

/**
 * Result block for action_error response
 */
export interface ActionErrorResult {
    actionId: string;
    error: ActionError;
    failedStep?: string;
    canRetry: boolean;
}

/**
 * Response sent when action execution fails
 */
export interface ActionErrorResponse extends BaseResponse {
    type: 'action_error';
    result: ActionErrorResult;
}

// ============================================
// Unified Response Union
// ============================================

/**
 * All possible unified responses
 */
export type UnifiedResponse =
    | ActionProposalResponse
    | ActionExecutingResponse
    | ActionProgressResponse
    | ActionCompletedResponse
    | ActionErrorResponse;

// ============================================
// Helper Functions
// ============================================

/**
 * Create a base response with timestamp
 */
export function createBaseResponse(success: boolean): BaseResponse {
    return {
        success,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Type guard for ActionProposalResponse
 */
export function isActionProposalResponse(response: UnifiedResponse): response is ActionProposalResponse {
    return response.type === 'action_proposal';
}

/**
 * Type guard for ActionExecutingResponse
 */
export function isActionExecutingResponse(response: UnifiedResponse): response is ActionExecutingResponse {
    return response.type === 'action_executing';
}

/**
 * Type guard for ActionProgressResponse
 */
export function isActionProgressResponse(response: UnifiedResponse): response is ActionProgressResponse {
    return response.type === 'action_progress';
}

/**
 * Type guard for ActionCompletedResponse
 */
export function isActionCompletedResponse(response: UnifiedResponse): response is ActionCompletedResponse {
    return response.type === 'action_completed';
}

/**
 * Type guard for ActionErrorResponse
 */
export function isActionErrorResponse(response: UnifiedResponse): response is ActionErrorResponse {
    return response.type === 'action_error';
}
