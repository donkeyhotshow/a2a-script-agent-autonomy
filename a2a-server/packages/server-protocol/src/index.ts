/**
 * @a2a/server-protocol — canonical protocol types and validation
 *
 * Previously split across `protocol` (legacy rich types) and `server-protocol` (minimal stubs).
 * Merged as of 2026-04-19 — this is now the single source of truth.
 *
 * Full validation is handled by AJV schema in routes/index.ts.
 */
export function validateInvokeRequest(body: unknown): { valid: boolean; errors?: string[] } {
  if (body === null || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  return { valid: true };
}

// Re-export all canonical types from the types sub-module
export * from './types/index.js';
export * from './types/errors.js';
export * from './types/entity.types.js';
export * from './types/entity.guards.js';
export * from './types/knowledge.types.js';
