/**
 * Action Validator - Execute Key Shape Validation Only
 * 
 * Validates action-key shape compliance (single key per execute/result).
 * Full schema validation handled by transforms pipeline.
 */

// Valid action keys for execute payloads
export const VALID_EXECUTE_KEYS = [
  'form', 'script', 'read-file', 'write-file', 'execute-command',
  'message', 'rag-search', 'list-directory', 'grep-search',
  'file-exists', 'edit-patch', 'run-script', 'dialog',
] as const;

// Valid result keys (execute keys + result-specific keys)
export const VALID_RESULT_KEYS = [...VALID_EXECUTE_KEYS, 'choice', 'completed'] as const;

export type ExecuteKey = typeof VALID_EXECUTE_KEYS[number];
export type ResultKey = typeof VALID_RESULT_KEYS[number];

/**
 * Validation result type
 */
import type { ActionValidationResult } from '@server/types/validation.interfaces.js';

/**
 * @deprecated Use canonical ActionValidationResult from @server/types
 */
export type ValidationResult = ActionValidationResult;

/**
 * Validate action-key shape (single key per execute/result).
 * Enforces A2A protocol: { "form": {...} } not { "action": "form", ... }
 */
export function validateActionKeyShape(obj: unknown, context: 'execute' | 'result'): ValidationResult {
  if (typeof obj !== 'object' || obj === null) {
    return { success: false, errors: ['Must be an object'] };
  }

  const validExecuteKeys = [...VALID_EXECUTE_KEYS];
  const validResultKeys = [...VALID_EXECUTE_KEYS, 'choice', 'completed'];
  const validKeys = context === 'execute' ? validExecuteKeys : validResultKeys;

  const keys = Object.keys(obj);
  const objRecord = obj as Record<string, unknown>;

  if (keys.includes('action') && typeof objRecord['action'] === 'string') {
    return { success: false, errors: [`Invalid ${context} structure: use action-key shape`] };
  }

  if (context === 'result' && keys.includes('content') && keys.length === 1) {
    return { success: false, errors: ['Invalid result structure: use action-key shape'] };
  }

  const hasValidKey = keys.some(k => validKeys.includes(k));
  if (!hasValidKey && keys.length > 0) {
    return { success: false, errors: [`No valid action key found`] };
  }

  return { success: true };
}

/**
 * Validate execute payload for tests and light runtime checks.
 * Contract: execute must be a single action-key object (e.g. `{ "rag-search": {...} }`).
 */
export function validateExecutePayloadDetailed(obj: unknown): ValidationResult {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { success: false, errors: ['execute payload must be an object'] };
  }

  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined);
  if (keys.length !== 1) {
    return { success: false, errors: ['execute payload must contain exactly one action key'] };
  }

  const key = keys[0]!;
  if (!VALID_EXECUTE_KEYS.includes(key as ExecuteKey)) {
    return { success: false, errors: [`Invalid execute action key: ${key}`] };
  }

  if (key === 'rag-search') {
    const v = o[key] as Record<string, unknown> | undefined;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      return { success: false, errors: ['rag-search payload must be an object'] };
    }
    if (typeof v.query !== 'string' || v.query.trim().length === 0) {
      return { success: false, errors: ['rag-search.query is required'] };
    }
  }

  if (key === 'message') {
    const v = o[key];
    // Accept either:
    // - string message
    // - { content: string, role?: string }
    if (typeof v === 'string') return { success: true };
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      return { success: false, errors: ['message must be a string or an object'] };
    }
    const vv = v as Record<string, unknown>;
    if (typeof vv.content !== 'string' || vv.content.trim().length === 0) {
      return { success: false, errors: ['message.content is required'] };
    }
  }

  return { success: true };
}

/**
 * Validate `/invoke` envelope response for tests.
 * Accepts both:
 * - completed responses that include `data.execute`
 * - pending responses that include `data.status === "pending"` + promiseId
 */
export function validateInvokeEnvelopeResponse(res: unknown): ValidationResult & { errors?: string[] } {
  if (!res || typeof res !== 'object' || Array.isArray(res)) {
    return { success: false, errors: ['Response must be an object'] };
  }
  const r = res as Record<string, unknown>;
  if (r.success !== true) {
    return { success: false, errors: ['Expected success: true'] };
  }

  if (r.data === undefined) {
    return { success: false, errors: ['Missing data field'] };
  }
  if (!r.data || typeof r.data !== 'object' || Array.isArray(r.data)) {
    return { success: false, errors: ['data must be an object'] };
  }

  const data = r.data as Record<string, unknown>;
  const status = data.status;
  if (typeof status !== 'string' || status.trim().length === 0) {
    return { success: false, errors: ['Missing or invalid data.status'] };
  }

  // Pending: only minimal fields required by tests
  if (status === 'pending') {
    if (typeof data.promiseId !== 'string' || data.promiseId.trim().length === 0) {
      return { success: false, errors: ['Missing data.promiseId for pending status'] };
    }
    return { success: true };
  }

  // Completed / executing / other statuses: accept execute if provided.
  if (data.execute !== undefined) {
    if (typeof data.execute !== 'object' || data.execute === null || Array.isArray(data.execute)) {
      return { success: false, errors: ['data.execute must be an object'] };
    }
  }

  return { success: true };
}
