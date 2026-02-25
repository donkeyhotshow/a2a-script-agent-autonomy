/**
 * Message Builder
 *
 * Реализация на основе плана: plans/message-builder-improvements.md
 *
 * Builds messages according to A2A protocol format
 * Production-ready: validation, serialization, type safety
 */

import {
  ContextBlock,
  FileBlock,
  ClientMessage,
  ServerMessage,
  TaskStatus,
  RequestContextBlock,
  RequestApiResult,
  Task,
} from '../types/index.js';
import {
  createInitialContext,
  createNewTaskContext,
  createFileRequestContext,
  validateContextBlock,
} from './context-parser.js';

const PROTOCOL_VERSION = '1.0';

// ============================================
// Message Validation
// ============================================

function isValidMessage(message: unknown): message is ClientMessage | ServerMessage {
  if (typeof message !== 'object' || message === null) return false;
  const msg = message as Record<string, unknown>;
  
  // Must have context
  if (!msg['context']) return false;
  
  const { valid } = validateContextBlock(msg['context']);
  if (!valid) return false;
  
  // Files must be array if present
  if (msg['files'] !== undefined && !Array.isArray(msg['files'])) return false;
  
  return true;
}

// ============================================
// Client Message Builders
// ============================================

/**
 * Build client message
 */
export function buildClientMessage(
  context: ContextBlock,
  files?: FileBlock[]
): ClientMessage {
  const message: ClientMessage = { context };
  
  if (files && files.length > 0) {
    message.files = files;
  }
  
  return message;
}

/**
 * Build new_task message
 */
export function buildNewTaskMessage(
  sessionId: string,
  tasks: string[],
  architecturalFeatures?: string[]
): ClientMessage {
  const context = createNewTaskContext(sessionId, tasks, architecturalFeatures);
  return buildClientMessage(context);
}

/**
 * Build continue message
 */
export function buildContinueMessage(sessionId: string): ClientMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    continue: true,
  };
  return buildClientMessage(context);
}

/**
 * Build confirm message
 */
export function buildConfirmMessage(sessionId: string): ClientMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    confirm: true,
  };
  return buildClientMessage(context);
}

/**
 * Build file response message
 */
export function buildFileResponseMessage(
  sessionId: string,
  files: FileBlock[],
  context: ContextBlock
): ClientMessage {
  return buildClientMessage(context, files);
}

// ============================================
// Server Message Builders
// ============================================

/**
 * Build server message
 */
export function buildServerMessage(
  context: ContextBlock,
  options?: {
    files?: FileBlock[];
    message?: string;
  }
): ServerMessage {
  const result: ServerMessage = { context };
  
  if (options?.files && options.files.length > 0) {
    result.files = options.files;
  }
  
  if (options?.message) {
    result.message = options.message;
  }
  
  return result;
}

/**
 * Build file request message
 */
export function buildFileRequestMessage(
  sessionId: string,
  paths: string[]
): ServerMessage {
  const context = createFileRequestContext(sessionId, paths);
  return buildServerMessage(context);
}

/**
 * Build task progress message
 */
export function buildTaskProgressMessage(
  sessionId: string,
  taskId: string,
  progress: number,
  status: TaskStatus | string
): ServerMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    tasks: [
      {
        id: taskId,
        type: 'analyze', // Default type for progress updates
        status: status as TaskStatus,
        progress: Math.max(0, Math.min(100, progress)),
      },
    ],
  };
  return buildServerMessage(context);
}

/**
 * Build error message
 */
export function buildErrorMessage(
  sessionId: string,
  code: string,
  message: string,
  file?: string,
  line?: number
): ServerMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    errors: [
      {
        code,
        message,
        ...(file && { file }),
        ...(line !== undefined && { line }),
      },
    ],
  };
  return buildServerMessage(context);
}

/**
 * Build session complete message
 */
export function buildSessionCompleteMessage(
  sessionId: string,
  summary: string
): ServerMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    tasks: [
      {
        id: 'session',
        type: 'analyze',
        status: 'completed',
        progress: 100,
      },
    ],
  };
  return buildServerMessage(context, { message: summary });
}

/**
 * Build acknowledgment message
 */
export function buildAckMessage(
  sessionId: string,
  message?: string
): ServerMessage {
  const context = createInitialContext(sessionId);
  return buildServerMessage(context, { message: message ?? 'Acknowledged' });
}

/**
 * Build neuron activation message
 */
export function buildNeuronActivationMessage(
  sessionId: string,
  activatedNeurons: string[],
  injectedContent?: string
): ServerMessage {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    architectural_features: activatedNeurons,
  };
  
  if (injectedContent) {
    return buildServerMessage(context, { message: injectedContent });
  }
  return buildServerMessage(context);
}

// ============================================
// Serialization
// ============================================

/**
 * Serialize message for transmission
 */
export function serializeMessage(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

/**
 * Parse received message
 */
export function parseMessage(data: string): ClientMessage | ServerMessage {
  try {
    const parsed = JSON.parse(data);
    
    if (!isValidMessage(parsed)) {
      throw new Error('Invalid message structure');
    }
    
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse message safely (returns null on error)
 */
export function parseMessageSafe(data: string): ClientMessage | ServerMessage | null {
  try {
    return parseMessage(data);
  } catch {
    return null;
  }
}

/**
 * Validate message structure
 */
export function validateMessage(message: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof message !== 'object' || message === null) {
    return { valid: false, errors: ['Message must be an object'] };
  }

  const msg = message as Record<string, unknown>;

  // Check context
  if (!msg['context']) {
    errors.push('context is required');
  } else {
    const { valid: contextValid, errors: contextErrors } = validateContextBlock(msg['context']);
    if (!contextValid) {
      errors.push(...contextErrors.map((e) => `context: ${e}`));
    }
  }

  // Check files if present
  if (msg['files'] !== undefined) {
    if (!Array.isArray(msg['files'])) {
      errors.push('files must be an array');
    } else {
      for (let i = 0; i < msg['files'].length; i++) {
        const file = msg['files'][i];
        if (typeof file !== 'object' || file === null) {
          errors.push(`files[${i}] must be an object`);
        } else {
          const f = file as Record<string, unknown>;
          if (typeof f['path'] !== 'string' || f['path'].length === 0) {
            errors.push(`files[${i}].path is required and must be a non-empty string`);
          }
          if (typeof f['content'] !== 'string') {
            errors.push(`files[${i}].content is required and must be a string`);
          }
        }
      }
    }
  }

  // Check message field (server messages only)
  if (msg['message'] !== undefined && typeof msg['message'] !== 'string') {
    errors.push('message must be a string');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Message Utilities
// ============================================

/**
 * Check if message is a client message
 */
export function isClientMessage(message: ClientMessage | ServerMessage): message is ClientMessage {
  return !('message' in message && typeof message['message'] === 'string');
}

/**
 * Check if message is a server message
 */
export function isServerMessage(message: ClientMessage | ServerMessage): message is ServerMessage {
  return 'message' in message || !('files' in message);
}

/**
 * Get session ID from message
 */
export function getSessionId(message: ClientMessage | ServerMessage): string {
  return message.context.session_id;
}

/**
 * Clone message deeply
 */
export function cloneMessage<T extends ClientMessage | ServerMessage>(message: T): T {
  return JSON.parse(JSON.stringify(message));
}

/**
 * Create message with updated context
 */
export function updateMessageContext<T extends ClientMessage | ServerMessage>(
  message: T,
  updates: Partial<ContextBlock>
): T {
  return {
    ...message,
    context: {
      ...message.context,
      ...updates,
      version: PROTOCOL_VERSION,
    },
  };
}

// ============================================
// Request API Context Block Builders
// ============================================

/**
 * Build context block for Request API response
 * Contains all data needed by client for next iteration
 */
export function buildRequestContextBlock(options: {
  tasks?: Task[];
  requestFiles?: string[];
  architecturalFeatures?: string[];
  graph?: { entities: unknown[]; relations: unknown[] };
  frameworks?: Record<string, unknown>;
  newTask?: string[];
}): RequestContextBlock {
  const context: RequestContextBlock = {};

  if (options.tasks && options.tasks.length > 0) {
    context.tasks = options.tasks;
  }

  if (options.requestFiles && options.requestFiles.length > 0) {
    context.request_files = options.requestFiles;
  }

  if (options.architecturalFeatures && options.architecturalFeatures.length > 0) {
    context.architectural_features = options.architecturalFeatures;
  }

  if (options.graph) {
    context.graph = options.graph;
  }

  if (options.frameworks) {
    context.frameworks = options.frameworks;
  }

  if (options.newTask && options.newTask.length > 0) {
    context.new_task = options.newTask;
  }

  return context;
}

/**
 * Build complete Request API result
 */
export function buildRequestApiResult(options: {
  outcome: 'completed' | 'graph_incomplete' | 'failed';
  message?: string;
  context?: RequestContextBlock;
  questions?: string[];
  missing?: string[];
  graphStats?: { entityCount: number; relationCount: number; entityTypes: Record<string, number> };
  activatedNeuronIds?: string[];
  injectedContent?: string[];
  error?: { code: string; message: string };
}): RequestApiResult {
  const result: RequestApiResult = {
    outcome: options.outcome,
  };

  if (options.message) {
    result.message = options.message;
  }

  if (options.context) {
    result.context = options.context;
  }

  if (options.questions && options.questions.length > 0) {
    result.questions = options.questions;
  }

  if (options.missing && options.missing.length > 0) {
    result.missing = options.missing;
  }

  if (options.graphStats) {
    result.graph_stats = options.graphStats;
  }

  if (options.activatedNeuronIds && options.activatedNeuronIds.length > 0) {
    result.activated_neuron_ids = options.activatedNeuronIds;
  }

  if (options.injectedContent && options.injectedContent.length > 0) {
    result.injected_content = options.injectedContent;
  }

  if (options.error) {
    result.error = options.error;
  }

  return result;
}
