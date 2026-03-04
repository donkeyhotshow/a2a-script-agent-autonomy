/**
 * Backwards Compatibility Layer
 * 
 * Provides utilities for handling legacy protocol formats.
 */

import {
  ProtocolVersion,
  CURRENT_PROTOCOL_VERSION,
  isSupportedVersion
} from './protocol-versions.js';

/**
 * Legacy field mappings
 */
const LEGACY_FIELD_MAPPINGS: Record<string, string> = {
  'sessionId': 'session_id',
  'taskId': 'task_id',
  'requestId': 'request_id',
  'promiseId': 'promise_id',
  'errorCode': 'error_code',
  'errorMessage': 'error_message',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'newTask': 'new_task',
  'requestFiles': 'request_files',
  'architecturalFeatures': 'architectural_features',
};

/**
 * Legacy format patterns
 */
interface LegacyRequest {
  actions?: unknown[];
  proposedActions?: unknown[];
  subActions?: unknown[];
  executingAction?: string;
  dslScript?: string;
  [key: string]: unknown;
}

interface LegacyResponse {
  content?: string;
  action?: string;
  result?: unknown;
  [key: string]: unknown;
}

/**
 * Check if data is in legacy format
 */
export function isLegacyFormat(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const ctx = data as Record<string, unknown>;
  
  // Check for legacy action fields
  if (ctx.actions !== undefined ||
      ctx.proposedActions !== undefined ||
      ctx.subActions !== undefined ||
      ctx.executingAction !== undefined ||
      ctx.dslScript !== undefined) {
    return true;
  }
  
  // Check for legacy response format
  if (ctx.content !== undefined && ctx.action === undefined && ctx.result === undefined) {
    return true;
  }
  
  // Check for camelCase fields
  for (const key of Object.keys(ctx)) {
    if (LEGACY_FIELD_MAPPINGS[key]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Convert camelCase fields to snake_case
 */
export function convertCamelToSnake(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(convertCamelToSnake);
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const newKey = LEGACY_FIELD_MAPPINGS[key] || key;
      result[newKey] = convertCamelToSnake(value);
    }
    
    return result;
  }
  
  return data;
}

/**
 * Convert snake_case fields to camelCase
 */
export function convertSnakeToCamel(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(convertSnakeToCamel);
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    const reverseMappings: Record<string, string> = {};
    
    // Build reverse mapping
    for (const [key, value] of Object.entries(LEGACY_FIELD_MAPPINGS)) {
      reverseMappings[value] = key;
    }
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const newKey = reverseMappings[key] || key;
      result[newKey] = convertSnakeToCamel(value);
    }
    
    return result;
  }
  
  return data;
}

/**
 * Transform legacy request to current format
 */
export function transformLegacyRequest(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const ctx = data as LegacyRequest;
  const result: Record<string, unknown> = { ...ctx };
  
  // Handle legacy actions array
  if (ctx.actions !== undefined) {
    // Move actions to context
    result.context = {
      ...(result.context as Record<string, unknown>),
      actions: ctx.actions,
      version: CURRENT_PROTOCOL_VERSION
    };
    delete result.actions;
  }
  
  // Handle proposedActions
  if (ctx.proposedActions !== undefined) {
    result.context = {
      ...(result.context as Record<string, unknown>),
      proposedActions: ctx.proposedActions
    };
    delete result.proposedActions;
  }
  
  // Handle subActions
  if (ctx.subActions !== undefined) {
    result.context = {
      ...(result.context as Record<string, unknown>),
      subActions: ctx.subActions
    };
    delete result.subActions;
  }
  
  // Handle executingAction
  if (ctx.executingAction !== undefined) {
    result.context = {
      ...(result.context as Record<string, unknown>),
      executingAction: ctx.executingAction
    };
    delete result.executingAction;
  }
  
  // Handle dslScript
  if (ctx.dslScript !== undefined) {
    result.context = {
      ...(result.context as Record<string, unknown>),
      dslScript: ctx.dslScript
    };
    delete result.dslScript;
  }
  
  // Convert field names
  const converted = convertCamelToSnake(result);
  
  // Ensure version
  if (converted && typeof converted === 'object') {
    (converted as Record<string, unknown>)['version'] = CURRENT_PROTOCOL_VERSION;
  }
  
  return converted;
}

/**
 * Transform legacy response to current format
 */
export function transformLegacyResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const ctx = data as LegacyResponse;
  
  // Handle legacy content field
  if (ctx.content !== undefined && ctx.action === undefined && ctx.result === undefined) {
    // Convert to action-key shape
    const result: Record<string, unknown> = {
      version: CURRENT_PROTOCOL_VERSION
    };
    
    // Determine action type from content
    if (typeof ctx.content === 'string') {
      result.result = {
        message: { content: ctx.content }
      };
    } else if (typeof ctx.content === 'object') {
      result.result = ctx.content;
    } else {
      result.result = { content: ctx.content };
    }
    
    // Copy other fields
    for (const [key, value] of Object.entries(ctx)) {
      if (key !== 'content') {
        result[key] = value;
      }
    }
    
    return convertCamelToSnake(result);
  }
  
  return convertCamelToSnake(data);
}

/**
 * Compatibility options
 */
export interface CompatibilityOptions {
  targetVersion?: ProtocolVersion;
  convertFields?: boolean;
  transformLegacy?: boolean;
  strict?: boolean;
}

/**
 * Apply backwards compatibility transformations
 */
export function applyCompatibility(
  data: unknown,
  options: CompatibilityOptions = {}
): unknown {
  const {
    targetVersion = CURRENT_PROTOCOL_VERSION,
    convertFields = true,
    transformLegacy = true,
    strict = false
  } = options;
  
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  let result = data;
  
  // Transform legacy format
  if (transformLegacy && isLegacyFormat(data)) {
    const isRequest = (data as Record<string, unknown>).actions !== undefined ||
                      (data as Record<string, unknown>).proposedActions !== undefined;
    
    if (isRequest) {
      result = transformLegacyRequest(data);
    } else {
      result = transformLegacyResponse(data);
    }
  }
  
  // Convert field names
  if (convertFields) {
    result = convertCamelToSnake(result);
  }
  
  // Ensure version
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (!obj.version) {
      obj.version = targetVersion;
    }
  }
  
  return result;
}

/**
 * Check if version is deprecated
 */
export function isDeprecatedVersion(version: string): boolean {
  // 1.0 is not deprecated, but older patterns are
  return version === '0.9' || version === '0.8' || version.startsWith('0.');
}

/**
 * Get deprecation warning for version
 */
export function getDeprecationWarning(version: string): string | null {
  if (isDeprecatedVersion(version)) {
    return `Protocol version ${version} is deprecated. Please migrate to version ${CURRENT_PROTOCOL_VERSION}.`;
  }
  return null;
}

/**
 * Adapter for old action-key patterns
 */
export function adaptActionKey(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const ctx = data as Record<string, unknown>;
  
  // If already using action-key shape, return as-is
  const validKeys = ['form', 'script', 'read-file', 'write-file', 'rag-search', 'execute-command', 'message', 'choice'];
  for (const key of Object.keys(ctx)) {
    if (validKeys.includes(key)) {
      return data;
    }
  }
  
  // Legacy: wrap in appropriate action key
  if (ctx.action) {
    return { [ctx.action]: ctx.data || ctx };
  }
  
  if (ctx.content !== undefined) {
    return { message: { content: ctx.content } };
  }
  
  return data;
}
