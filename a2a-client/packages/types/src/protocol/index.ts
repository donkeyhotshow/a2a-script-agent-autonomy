/**
 * Protocol Types
 * 
 * Types related to the A2A protocol (new-request-flow)
 * @see docs/new-request-flow/PROTOCOL.md
 */

// Re-export action types
export * from '../action-types.js';

/**
 * Session status for new protocol
 * @see docs/new-request-flow/PROTOCOL.md
 */
export type SessionStatus = 
  | 'PENDING'    // Ожидает выбора действия
  | 'READY'      // Действие выбрано
  | 'IN_PROGRESS' // Выполняется
  | 'WAITING_CONFIRMATION' // Ожидает подтверждения
  | 'COMPLETED'  // Завершено
  | 'ERROR'      // Ошибка
  | 'CANCELLED'; // Отменено

/**
 * Execution context for tracking current action state
 * @see docs/new-request-flow/PROTOCOL.md#contextfields
 */
export interface ExecutionContext {
  action: string;    // ID действия
  step: string;      // ID текущего шага
  status?: 'completed';
  progress?: number;
}

/**
 * History entry for tracking action execution
 */
export interface HistoryEntry {
  action: string;
  step: string;
  result?: import('../action-types.js').ActionResult;
  timestamp: string;
}

/**
 * Extended context block with new protocol fields
 * @see docs/new-request-flow/PROTOCOL.md
 */
export interface ProtocolContextBlock {
  version: '2.0';
  execution?: ExecutionContext;
  history?: HistoryEntry[];
  workbench?: unknown;
  // Legacy fields (for backwards compatibility)
  new_task?: string[];
  architectural_features?: string[];
  continue?: boolean;
  tasks?: import('../state/types.js').Task[];
  request_files?: string[];
  confirm?: boolean;
  errors?: ProtocolError[];
}

/**
 * Protocol error
 */
export interface ProtocolError {
  code: string;
  message: string;
  file?: string;
  line?: number;
}

/**
 * Form choice for first server response
 * @see docs/new-request-flow/PROTOCOL.md#form-choices
 */
export interface FormWithChoices {
  title?: string;
  choices: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  input?: Array<{
    name: string;
    type: string;
    required?: boolean;
    label?: string;
  }>;
}

/**
 * Form with input fields (no choices)
 * @see docs/new-request-flow/PROTOCOL.md#form-input
 */
export interface FormWithInput {
  title?: string;
  input: Array<{
    name: string;
    type: string;
    required?: boolean;
    label?: string;
    options?: Array<{ value: unknown; label: string }>;
  }>;
}

/**
 * Form choices response - first server response with available choices
 * @see docs/new-request-flow/PROTOCOL.md#form-choices-response
 */
export interface FormChoicesResponse {
  context: ProtocolContextBlock;
  execute: {
    form: FormWithChoices;
  };
}

/**
 * Execute response - server requesting client to execute an action
 * @see docs/new-request-flow/PROTOCOL.md#execute-response
 */
export interface ExecuteResponse {
  context: ProtocolContextBlock;
  execute: import('../action-types.js').ExecutePayload;
}

/**
 * Completed response - server signaling completion
 * @see docs/new-request-flow/PROTOCOL.md#completed-response
 */
export interface CompletedResponse {
  context: ProtocolContextBlock;
  execute: {
    completed: boolean;
  };
  /** Completion payload (e.g. `{ completed: true }` or action-key result). */
  result?: Record<string, unknown>;
}

/**
 * Error response - server signaling an error
 * @see docs/new-request-flow/PROTOCOL.md#error-response
 */
export interface ErrorResponse {
  context: ProtocolContextBlock;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all server responses
 * @see docs/new-request-flow/PROTOCOL.md#server-response
 */
export type ServerResponse =
  | FormChoicesResponse
  | ExecuteResponse
  | CompletedResponse
  | ErrorResponse;

/**
 * Form choice request - client selecting a choice
 * @see docs/new-request-flow/PROTOCOL.md#form-choice-request
 */
export interface FormChoiceRequest {
  context: ProtocolContextBlock;
  result: {
    form: {
      choice: string;
      input?: Record<string, unknown>;
    };
  };
}

/**
 * Action result request - client sending action result
 * @see docs/new-request-flow/PROTOCOL.md#action-result-request
 */
export interface ActionResultRequest {
  context: ProtocolContextBlock;
  result: import('../action-types.js').ActionResult;
}

/**
 * Client request union type
 * @see docs/new-request-flow/PROTOCOL.md#client-request
 */
export type ClientRequest =
  | FormChoiceRequest
  | ActionResultRequest;
