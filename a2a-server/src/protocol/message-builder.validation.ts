/** Message validation helpers. */

export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMessageShape(msg: unknown): MessageValidationResult {
  const errors: string[] = [];
  if (typeof msg !== 'object' || msg === null) {
    return { valid: false, errors: ['Message must be an object'] };
  }
  const m = msg as Record<string, unknown>;
  if (typeof m.session_id !== 'string' && typeof m.sessionId !== 'string') {
    errors.push('Message must have session_id or sessionId');
  }
  return { valid: errors.length === 0, errors };
}
