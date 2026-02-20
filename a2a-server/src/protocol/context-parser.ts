/**
 * Context Parser
 * Parses and validates Context Blocks according to A2A protocol
 * Production-ready: validation, error handling, type guards
 */

import {
  ContextBlock,
  Task,
  TaskType,
  TaskStatus,
  ProtocolError,
} from '../types/index.js';

const PROTOCOL_VERSION = '1.0';
const VALID_TASK_TYPES: TaskType[] = ['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete'];
const VALID_TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];

// ============================================
// Type Guards
// ============================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isValidTaskType(value: unknown): value is TaskType {
  return isString(value) && VALID_TASK_TYPES.includes(value as TaskType);
}

function isValidTaskStatus(value: unknown): value is TaskStatus {
  return isString(value) && VALID_TASK_STATUSES.includes(value as TaskStatus);
}

function isTask(value: unknown): value is Task {
  if (!isObject(value)) return false;
  const task = value as Record<string, unknown>;
  return (
    isString(task['id']) &&
    task['id'].length > 0 &&
    isValidTaskType(task['type']) &&
    isValidTaskStatus(task['status']) &&
    (task['target'] === undefined || isString(task['target'])) &&
    (task['progress'] === undefined || typeof task['progress'] === 'number')
  );
}

function isTaskArray(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(isTask);
}

function isProtocolError(value: unknown): value is ProtocolError {
  if (!isObject(value)) return false;
  const err = value as Record<string, unknown>;
  return (
    isString(err['code']) &&
    err['code'].length > 0 &&
    isString(err['message']) &&
    (err['file'] === undefined || isString(err['file'])) &&
    (err['line'] === undefined || typeof err['line'] === 'number')
  );
}

function isProtocolErrorArray(value: unknown): value is ProtocolError[] {
  return Array.isArray(value) && value.every(isProtocolError);
}

// ============================================
// Validation
// ============================================

/**
 * Validate context block structure
 */
export function validateContextBlock(context: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isObject(context)) {
    return { valid: false, errors: ['Context must be an object'] };
  }

  const ctx = context as Record<string, unknown>;

  // Check version field
  if (!isString(ctx['version'])) {
    errors.push('version is required and must be a string');
  } else if (ctx['version'] !== PROTOCOL_VERSION) {
    errors.push(`version must be "${PROTOCOL_VERSION}"`);
  }

  // Check session_id
  if (!isString(ctx['session_id'])) {
    errors.push('session_id is required and must be a string');
  } else if (ctx['session_id'].length === 0) {
    errors.push('session_id cannot be empty');
  }

  // Validate optional fields
  if (ctx['new_task'] !== undefined && !isStringArray(ctx['new_task'])) {
    errors.push('new_task must be an array of strings');
  }

  if (ctx['architectural_features'] !== undefined && !isStringArray(ctx['architectural_features'])) {
    errors.push('architectural_features must be an array of strings');
  }

  if (ctx['continue'] !== undefined && !isBoolean(ctx['continue'])) {
    errors.push('continue must be a boolean');
  }

  if (ctx['confirm'] !== undefined && !isBoolean(ctx['confirm'])) {
    errors.push('confirm must be a boolean');
  }

  if (ctx['tasks'] !== undefined && !isTaskArray(ctx['tasks'])) {
    errors.push('tasks must be an array of valid Task objects');
  }

  if (ctx['request_files'] !== undefined && !isStringArray(ctx['request_files'])) {
    errors.push('request_files must be an array of strings');
  }

  if (ctx['errors'] !== undefined && !isProtocolErrorArray(ctx['errors'])) {
    errors.push('errors must be an array of valid ProtocolError objects');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Parsing
// ============================================

/**
 * Parse context block from client message
 * @throws Error if validation fails
 */
export function parseContextBlock(data: unknown): ContextBlock {
  const { valid, errors } = validateContextBlock(data);
  
  if (!valid) {
    throw new Error(`Invalid context block: ${errors.join(', ')}`);
  }

  const ctx = data as Record<string, unknown>;
  
  const result: ContextBlock = {
    version: ctx['version'] as '1.0',
    session_id: ctx['session_id'] as string,
  };

  if (ctx['new_task'] !== undefined) {
    result.new_task = ctx['new_task'] as string[];
  }
  if (ctx['architectural_features'] !== undefined) {
    result.architectural_features = ctx['architectural_features'] as string[];
  }
  if (ctx['continue'] !== undefined) {
    result.continue = ctx['continue'] as boolean;
  }
  if (ctx['tasks'] !== undefined) {
    result.tasks = ctx['tasks'] as Task[];
  }
  if (ctx['request_files'] !== undefined) {
    result.request_files = ctx['request_files'] as string[];
  }
  if (ctx['confirm'] !== undefined) {
    result.confirm = ctx['confirm'] as boolean;
  }
  if (ctx['errors'] !== undefined) {
    result.errors = ctx['errors'] as ProtocolError[];
  }

  return result;
}

/**
 * Parse context block safely (returns null on error instead of throwing)
 */
export function parseContextBlockSafe(data: unknown): ContextBlock | null {
  try {
    return parseContextBlock(data);
  } catch {
    return null;
  }
}

// ============================================
// Extraction Functions
// ============================================

/**
 * Extract new_task from context
 */
export function extractNewTask(context: ContextBlock): string[] | null {
  if (!context.new_task || context.new_task.length === 0) {
    return null;
  }
  return context.new_task;
}

/**
 * Extract requested files
 */
export function extractRequestedFiles(context: ContextBlock): string[] | null {
  if (!context.request_files || context.request_files.length === 0) {
    return null;
  }
  return context.request_files;
}

/**
 * Extract architectural features
 */
export function extractArchitecturalFeatures(context: ContextBlock): string[] | null {
  if (!context.architectural_features || context.architectural_features.length === 0) {
    return null;
  }
  return context.architectural_features;
}

/**
 * Parse tasks from context
 */
export function parseTasks(context: ContextBlock): Task[] {
  return context.tasks ?? [];
}

/**
 * Check if context has continue flag
 */
export function hasContinueFlag(context: ContextBlock): boolean {
  return context.continue === true;
}

/**
 * Check if context has confirm flag
 */
export function hasConfirmFlag(context: ContextBlock): boolean {
  return context.confirm === true;
}

// ============================================
// Context Creation & Modification
// ============================================

/**
 * Generate unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create initial context for new session
 */
export function createInitialContext(sessionId: string): ContextBlock {
  return {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
  };
}

/**
 * Create context with new tasks
 */
export function createNewTaskContext(
  sessionId: string,
  tasks: string[],
  architecturalFeatures?: string[]
): ContextBlock {
  const context: ContextBlock = {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    new_task: tasks,
  };

  if (architecturalFeatures && architecturalFeatures.length > 0) {
    context.architectural_features = architecturalFeatures;
  }

  return context;
}

/**
 * Create context with file requests
 */
export function createFileRequestContext(
  sessionId: string,
  paths: string[]
): ContextBlock {
  return {
    version: PROTOCOL_VERSION,
    session_id: sessionId,
    request_files: paths,
  };
}

/**
 * Update context with task progress
 */
export function updateTaskProgress(
  context: ContextBlock,
  taskId: string,
  progress: number,
  status: TaskStatus
): ContextBlock {
  const tasks = context.tasks ?? [];
  const updatedTasks = tasks.map((task) =>
    task.id === taskId
      ? { ...task, progress: Math.max(0, Math.min(100, progress)), status }
      : task
  );

  return {
    ...context,
    tasks: updatedTasks,
  };
}

/**
 * Add task to context
 */
export function addTaskToContext(
  context: ContextBlock,
  type: TaskType,
  target?: string
): ContextBlock {
  const tasks = context.tasks ?? [];
  const newTask: Task = {
    id: generateTaskId(),
    type,
    status: 'pending',
    progress: 0,
    ...(target && { target }),
  };

  return {
    ...context,
    tasks: [...tasks, newTask],
  };
}

/**
 * Remove task from context
 */
export function removeTaskFromContext(
  context: ContextBlock,
  taskId: string
): ContextBlock {
  const tasks = context.tasks ?? [];
  return {
    ...context,
    tasks: tasks.filter((task) => task.id !== taskId),
  };
}

/**
 * Add error to context
 */
export function addErrorToContext(
  context: ContextBlock,
  error: ProtocolError
): ContextBlock {
  const errors = context.errors ?? [];
  return {
    ...context,
    errors: [...errors, error],
  };
}

/**
 * Clear errors from context
 */
export function clearErrorsFromContext(context: ContextBlock): ContextBlock {
  const { errors: _, ...rest } = context;
  return rest as ContextBlock;
}

// ============================================
// Serialization
// ============================================

/**
 * Serialize context for transmission
 */
export function serializeContext(context: ContextBlock): string {
  return JSON.stringify(context);
}

/**
 * Deserialize context from string
 */
export function deserializeContext(data: string): ContextBlock {
  try {
    const parsed = JSON.parse(data);
    return parseContextBlock(parsed);
  } catch (error) {
    throw new Error(`Failed to deserialize context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deserialize context safely (returns null on error)
 */
export function deserializeContextSafe(data: string): ContextBlock | null {
  try {
    return deserializeContext(data);
  } catch {
    return null;
  }
}

// ============================================
// Context Utilities
// ============================================

/**
 * Merge two contexts (second overrides first)
 */
export function mergeContexts(
  base: ContextBlock,
  override: Partial<ContextBlock>
): ContextBlock {
  return {
    ...base,
    ...override,
    version: PROTOCOL_VERSION, // Always keep version
    session_id: override.session_id ?? base.session_id, // Keep session_id
  };
}

/**
 * Clone context deeply
 */
export function cloneContext(context: ContextBlock): ContextBlock {
  return JSON.parse(JSON.stringify(context));
}

/**
 * Check if context has any active tasks
 */
export function hasActiveTasks(context: ContextBlock): boolean {
  const tasks = context.tasks ?? [];
  return tasks.some(
    (task) => task.status === 'pending' || task.status === 'in_progress'
  );
}

/**
 * Get task by ID from context
 */
export function getTaskById(context: ContextBlock, taskId: string): Task | null {
  const tasks = context.tasks ?? [];
  return tasks.find((task) => task.id === taskId) ?? null;
}

/**
 * Get all tasks by status
 */
export function getTasksByStatus(context: ContextBlock, status: TaskStatus): Task[] {
  const tasks = context.tasks ?? [];
  return tasks.filter((task) => task.status === status);
}

/**
 * Calculate overall progress of all tasks
 */
export function calculateOverallProgress(context: ContextBlock): number {
  const tasks = context.tasks ?? [];
  if (tasks.length === 0) return 0;
  
  const totalProgress = tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0);
  return Math.round(totalProgress / tasks.length);
}
