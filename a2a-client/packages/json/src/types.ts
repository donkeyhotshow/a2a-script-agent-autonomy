/**
 * @a2a/json - TypeScript types for Unified JSON Parser
 * Adapted from a2a-server/src/types/unified.ts
 */

// ============================================
// Task Types (from @a2a/types)
// ============================================

export type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface ProtocolError {
  code: string;
  message: string;
  file?: string;
  line?: number;
}

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  target?: string;
  progress?: number;
}

// ============================================
// Context Block Types
// ============================================

export interface ContextBlock {
  version: '1.0';
  session_id: string;
  new_task?: string[];
  architectural_features?: string[];
  continue?: boolean;
  tasks?: Task[];
  request_files?: string[];
  confirm?: boolean;
  errors?: ProtocolError[];
}

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
  dslScript?: string;
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

/**
 * Result block for action_proposal response
 */
export interface ActionProposalResult {
  context: ContextBlock;
  proposedActions: Action[];
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
 * Executing action with current state
 */
export interface ExecutingAction {
  actionId: string;
  title: string;
  description?: string;
  priority?: number;
  dsl?: Record<string, unknown>;
  dslScript?: string;
}

/**
 * Next step in the action execution
 */
export interface NextStep {
  actionId: string;
  title: string;
}

/**
 * Result block for action_executing response
 */
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
// Client-Specific Types (VueFlow)
// ============================================

/**
 * VueFlow node representation
 */
export interface VueFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    status?: string;
    progress?: number;
    actionId?: string;
    [key: string]: unknown;
  };
}

/**
 * VueFlow edge representation
 */
export interface VueFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: Record<string, unknown>;
}

/**
 * Parsed response with metadata
 */
export interface ParsedResponse {
  type: ResponseType;
  success: boolean;
  timestamp: string;
  data: UnifiedResponse;
  errors?: string[];
}

// ============================================
// Validation Result Types
// ============================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  data?: UnifiedResponse;
}
