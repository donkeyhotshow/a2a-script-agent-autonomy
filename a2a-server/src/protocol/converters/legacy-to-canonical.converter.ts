/**
 * Legacy to Canonical Converter
 *
 * Converts legacy AI-Action format to canonical action-key shape format.
 * Used when legacy format is detected in incoming requests.
 *
 * Legacy format:
 * - actions[]
 * - executingAction
 * - dslScript
 * - result.content (flat)
 * - execute.action (generic)
 *
 * Canonical format:
 * - execute.form.choices
 * - execute.message
 * - execute.script
 * - execute."action-type"
 * - result."action-type"
 * - context.execution.step
 * - context.history[]
 *
 * Removed legacy fields:
 * - proposedActions (use execute.form.choices)
 * - subActions (use context.execution.step)
 */

import { FormatType, isAIActionFormat } from '../versioning/backwards-compat.js';
import { CURRENT_PROTOCOL_VERSION } from '../versioning/protocol-versions.js';

/**
 * Legacy execute structure (generic action)
 */
interface LegacyExecute {
  action?: string;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Legacy result structure (flat content)
 */
interface LegacyResult {
  content?: string;
  data?: unknown;
  action?: string;
  [key: string]: unknown;
}

/**
 * Legacy context structure
 */
interface LegacyContext {
  actions?: unknown[];
  executingAction?: string;
  dslScript?: string;
  history?: unknown[];
  execution?: {
    step?: string;
    action?: string;
    progress?: number;
  };
  [key: string]: unknown;
}

/**
 * Canonical execute types
 */
type CanonicalExecute =
  | { form: { choices?: Array<{ id: string; label: string }>; input?: Record<string, unknown> } }
  | { message: { content: string } }
  | { script: { code: string; input?: Record<string, unknown>; output?: string } }
  | { 'read-file': { path: string } }
  | { 'write-file': { path: string; content: string } }
  | { 'rag-search': { query: string } }
  | { 'execute-command': { command: string } }
  | { choice: { id: string } };

/**
 * Convert legacy execute to canonical action-key shape
 */
function convertLegacyExecute(execute: LegacyExecute): CanonicalExecute {
  const action = execute.action as string | undefined;
  const data = execute.data as Record<string, unknown> | undefined;

  if (!action) {
    // Default to message if no action specified
    return { message: { content: String(data?.content || '') } };
  }

  switch (action) {
    case 'form':
    case 'FORM':
      return {
        form: {
          choices: data?.choices as Array<{ id: string; label: string }> | undefined,
          input: data?.input as Record<string, unknown> | undefined
        }
      };

    case 'script':
    case 'SCRIPT':
      return {
        script: {
          code: String(data?.code || ''),
          input: data?.input as Record<string, unknown> | undefined,
          output: data?.output as string | undefined
        }
      };

    case 'read-file':
    case 'READ_FILE':
    case 'readFile':
      return {
        'read-file': {
          path: String(data?.path || data?.file || '')
        }
      };

    case 'write-file':
    case 'WRITE_FILE':
    case 'writeFile':
      return {
        'write-file': {
          path: String(data?.path || data?.file || ''),
          content: String(data?.content || '')
        }
      };

    case 'rag-search':
    case 'RAG_SEARCH':
    case 'ragSearch':
      return {
        'rag-search': {
          query: String(data?.query || data?.search || '')
        }
      };

    case 'execute-command':
    case 'EXECUTE_COMMAND':
    case 'executeCommand':
    case 'run':
      return {
        'execute-command': {
          command: String(data?.command || data?.cmd || '')
        }
      };

    case 'message':
    case 'MESSAGE':
      return {
        message: {
          content: String(data?.content || data?.message || '')
        }
      };

    case 'choice':
    case 'CHOICE':
      return {
        choice: {
          id: String(data?.id || data?.choiceId || data?.choice_id || '')
        }
      };

    default:
      // Generic action - wrap in action-type key
      return {
        [action]: data || {}
      } as CanonicalExecute;
  }
}

/**
 * Convert legacy result to canonical action-key shape
 */
function convertLegacyResult(result: LegacyResult): Record<string, unknown> {
  // If already has action-type key, return as-is
  const canonicalKeys = ['message', 'form', 'script', 'read-file', 'write-file', 'rag-search', 'execute-command', 'choice'];
  for (const key of canonicalKeys) {
    if ((result as Record<string, unknown>)[key] !== undefined) {
      return result;
    }
  }

  // Legacy: flat content structure
  if (result.content !== undefined) {
    // Determine action type from content or context
    return {
      message: {
        content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
      }
    };
  }

  // Legacy: generic data
  if (result.data !== undefined) {
    return {
      message: {
        content: typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
      }
    };
  }

  // Empty result
  return { message: { content: '' } };
}

/**
 * Convert legacy context to canonical context
 */
function convertLegacyContext(context: LegacyContext): LegacyContext {
  const converted: LegacyContext = { ...context };

  // Move legacy action fields to context.history
  if (context.actions !== undefined) {
    // Add to history as first entry
    converted.history = [
      { type: 'actions', data: context.actions, timestamp: Date.now() },
      ...(context.history || [])
    ];
    delete converted.actions;
  }

  // Note: proposedActions and subActions removed - use canonical format
  // - proposedActions -> execute.form.choices
  // - subActions -> context.execution.step

  if (context.executingAction !== undefined) {
    // Convert to execution.step
    converted.execution = {
      ...converted.execution,
      step: context.executingAction as string,
      action: context.executingAction as string
    };
    delete converted.executingAction;
  }

  if (context.dslScript !== undefined) {
    // Store dslScript in execution metadata
    converted.execution = {
      ...converted.execution,
      progress: 0,
      action: 'dsl'
    };
    // Keep dslScript in context for reference
    converted.dslScript = context.dslScript;
  }

  return converted;
}

/**
 * Convert a complete legacy request to canonical format
 */
export function convertLegacyRequestToCanonical(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const ctx = data as Record<string, unknown>;

  // Check if already canonical
  if (isAIActionFormat(data) === FormatType.CANONICAL) {
    return data;
  }

  const result: Record<string, unknown> = {
    version: CURRENT_PROTOCOL_VERSION
  };

  // Copy basic fields
  const basicFields = ['session_id', 'task_id', 'request_id', 'promise_id', 'message', 'kind'];
  for (const field of basicFields) {
    if (ctx[field] !== undefined) {
      result[field] = ctx[field];
    }
  }

  // Also check camelCase versions
  const camelFields = ['sessionId', 'taskId', 'requestId', 'promiseId'];
  for (const field of camelFields) {
    if (ctx[field] !== undefined && result[field.replace('Id', '_id')] === undefined) {
      result[field.replace('Id', '_id')] = ctx[field];
    }
  }

  // Convert context
  if (ctx.context !== undefined && typeof ctx.context === 'object') {
    result.context = convertLegacyContext(ctx.context as LegacyContext);
  } else {
    result.context = {};
  }

  // Convert execute
  if (ctx.execute !== undefined && typeof ctx.execute === 'object') {
    result.execute = convertLegacyExecute(ctx.execute as LegacyExecute);
  }

  // Convert result (for responses)
  if (ctx.result !== undefined && typeof ctx.result === 'object') {
    result.result = convertLegacyResult(ctx.result as LegacyResult);
  }

  // Add metadata
  result.metadata = {
    ...(ctx.metadata as Record<string, unknown> || {}),
    convertedFrom: 'legacy',
    convertedAt: new Date().toISOString()
  };

  return result;
}

/**
 * Convert legacy response to canonical format
 */
export function convertLegacyResponseToCanonical(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const ctx = data as Record<string, unknown>;

  // Check if already canonical
  if (isAIActionFormat(data) === FormatType.CANONICAL) {
    return data;
  }

  const result: Record<string, unknown> = {
    version: CURRENT_PROTOCOL_VERSION
  };

  // Copy basic fields
  for (const [key, value] of Object.entries(ctx)) {
    if (key !== 'result' && key !== 'execute' && key !== 'context') {
      result[key] = value;
    }
  }

  // Convert result if present
  if (ctx.result !== undefined) {
    result.result = convertLegacyResult(ctx.result as LegacyResult);
  }

  // Convert execute if present
  if (ctx.execute !== undefined) {
    result.execute = convertLegacyExecute(ctx.execute as LegacyExecute);
  }

  // Convert context if present
  if (ctx.context !== undefined && typeof ctx.context === 'object') {
    result.context = convertLegacyContext(ctx.context as LegacyContext);
  }

  return result;
}

/**
 * Main converter function - detects format and converts appropriately
 */
export function convertToCanonicalFormat(data: unknown): unknown {
  const format = isAIActionFormat(data);

  if (format === FormatType.CANONICAL) {
    return data; // Already canonical
  }

  if (format === FormatType.LEGACY) {
    // Determine if it's a request or response
    const ctx = data as Record<string, unknown>;
    const isRequest = ctx.actions !== undefined ||
                      ctx.execute !== undefined;

    if (isRequest) {
      return convertLegacyRequestToCanonical(data);
    } else {
      return convertLegacyResponseToCanonical(data);
    }
  }

  // Unknown format - return as-is
  return data;
}

/**
 * Check if conversion is needed
 */
export function needsConversion(data: unknown): boolean {
  return isAIActionFormat(data) === FormatType.LEGACY;
}
