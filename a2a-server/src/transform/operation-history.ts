/**
 * Operation History - Lightweight History Alternative
 * 
 * Provides structured tracking of operations (llm_call, transform, interrupt, etc.)
 * for debug/audit purposes. This is a lightweight alternative to context.history[]
 * that focuses on key operations rather than full conversation.
 * 
 * Usage:
 * - Import types from './types.ts'
 * - Use createOperation() to create new operations
 * - Use addOperationToContext() to add to context
 * - Use updateOperationStatus() to update status
 */

import { 
  type OperationHistoryEntry, 
  type OperationType, 
  type OperationStatus,
  type OperationError 
} from './types.js';

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create a new operation history entry
 */
export function createOperation(
  operationType: OperationType,
  description?: string,
  input?: Record<string, unknown>,
  options?: {
    status?: OperationStatus;
    parentId?: string;
  }
): OperationHistoryEntry {
  const now = new Date().toISOString();
  
  return {
    id: generateOperationId(),
    timestamp: now,
    operationType,
    description,
    status: options?.status ?? 'pending',
    input,
    ...(options?.parentId && { parentId: options.parentId }),
  };
}

/**
 * Get operation history from context
 */
export function getOperationHistory(context: Record<string, unknown>): OperationHistoryEntry[] {
  const opHistory = context.operationHistory;
  if (!Array.isArray(opHistory)) return [];
  return opHistory as OperationHistoryEntry[];
}

/**
 * Set operation history to context
 */
export function setOperationHistory(
  context: Record<string, unknown>,
  operationHistory: OperationHistoryEntry[]
): void {
  context.operationHistory = operationHistory;
}

/**
 * Add an operation to context
 */
export function addOperationToContext(
  context: Record<string, unknown>,
  operation: OperationHistoryEntry
): void {
  const history = getOperationHistory(context);
  history.push(operation);
  setOperationHistory(context, history);
}

/**
 * Update operation status by ID
 */
export function updateOperationStatus(
  context: Record<string, unknown>,
  operationId: string,
  status: OperationStatus,
  output?: Record<string, unknown>,
  error?: OperationError
): boolean {
  const history = getOperationHistory(context);
  const op = history.find((o) => o.id === operationId);
  
  if (!op) return false;
  
  op.status = status;
  
  if (output) {
    op.output = output;
  }
  
  if (error) {
    op.error = error;
  }
  
  // Calculate duration if completed/failed
  if (status === 'completed' || status === 'failed') {
    const start = new Date(op.timestamp).getTime();
    const end = Date.now();
    op.duration = end - start;
  }
  
  setOperationHistory(context, history);
  return true;
}

/**
 * Find operation by ID
 */
export function findOperation(
  context: Record<string, unknown>,
  operationId: string
): OperationHistoryEntry | undefined {
  const history = getOperationHistory(context);
  return history.find((o) => o.id === operationId);
}

/**
 * Get operations by type
 */
export function getOperationsByType(
  context: Record<string, unknown>,
  operationType: OperationType
): OperationHistoryEntry[] {
  const history = getOperationHistory(context);
  return history.filter((o) => o.operationType === operationType);
}

/**
 * Get operations by status
 */
export function getOperationsByStatus(
  context: Record<string, unknown>,
  status: OperationStatus
): OperationHistoryEntry[] {
  const history = getOperationHistory(context);
  return history.filter((o) => o.status === status);
}

/**
 * Clear all operations (for fresh start)
 */
export function clearOperationHistory(context: Record<string, unknown>): void {
  setOperationHistory(context, []);
}

/**
 * Common operation factories
 */
export const Operations = {
  /**
   * Create an LLM call operation
   */
  llmCall: (input?: Record<string, unknown>, description?: string) => 
    createOperation('llm_call', description ?? 'LLM call', input),
  
  /**
   * Create a transform operation
   */
  transform: (transformType: string, input?: Record<string, unknown>) =>
    createOperation('transform', `Transform: ${transformType}`, input),
  
  /**
   * Create an interrupt/gray room operation
   */
  interrupt: (description?: string, input?: Record<string, unknown>) =>
    createOperation('interrupt', description ?? 'Server interrupt', input),
  
  /**
   * Create a compress history operation
   */
  compressHistory: (input?: Record<string, unknown>) =>
    createOperation('compress_history', 'Compress history', input),
  
  /**
   * Create an auto RAG page operation
   */
  autoRagPage: (query: string, input?: Record<string, unknown>) =>
    createOperation('auto_rag_page', `RAG: ${query}`, input),
  
  /**
   * Create an auto read file operation
   */
  autoReadFile: (path: string, input?: Record<string, unknown>) =>
    createOperation('auto_read_file', `Read: ${path}`, input),
  
  /**
   * Create a thinking operation
   */
  thinking: (description?: string, input?: Record<string, unknown>) =>
    createOperation('thinking', description ?? 'Thinking', input),
  
  /**
   * Create a clarify operation
   */
  clarify: (question: string, input?: Record<string, unknown>) =>
    createOperation('clarify', `Clarify: ${question}`, input),
  
  /**
   * Create a request build operation
   */
  requestBuild: (input?: Record<string, unknown>) =>
    createOperation('request_build', 'Build request', input),
  
  /**
   * Create a response build operation
   */
  responseBuild: (input?: Record<string, unknown>) =>
    createOperation('response_build', 'Build response', input),
  
  /**
   * Create a tool execution operation
   */
  toolExecution: (toolName: string, input?: Record<string, unknown>) =>
    createOperation('tool_execution', `Execute: ${toolName}`, input),
  
  /**
   * Create a file operation
   */
  fileOperation: (operation: string, path: string, input?: Record<string, unknown>) =>
    createOperation('file_operation', `${operation}: ${path}`, input),
  
  /**
   * Create a RAG search operation
   */
  ragSearch: (query: string, input?: Record<string, unknown>) =>
    createOperation('rag_search', `Search: ${query}`, input),
  
  /**
   * Create a gray room operation
   */
  grayRoomOperation: (description?: string, input?: Record<string, unknown>) =>
    createOperation('gray_room_operation', description ?? 'Gray room operation', input),
} as const;