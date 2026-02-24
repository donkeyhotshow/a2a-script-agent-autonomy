/** ContextManager validation. */

import type { ContextType } from './context-manager.types.js';

const VALID_TYPES: ContextType[] = [
  'task', 'graph', 'frameworks', 'entities', 'questions',
  'request_files', 'activated_neurons', 'style', 'errors', 'history',
];

export function isValidContextType(t: string): t is ContextType {
  return (VALID_TYPES as string[]).includes(t);
}

export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContextEntry(type: string, _data: unknown): ContextValidationResult {
  const errors: string[] = [];
  if (!isValidContextType(type)) errors.push(`Invalid context type: ${type}`);
  return { valid: errors.length === 0, errors };
}

