/** Message payload validation. */

export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCreateMessageInput(input: unknown): MessageValidationResult {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] };
  }
  const o = input as Record<string, unknown>;
  if (typeof o.sessionId !== 'string' || o.sessionId.trim() === '') errors.push('sessionId is required');
  if (typeof o.direction !== 'string') errors.push('direction is required');
  if (o.content !== undefined && (typeof o.content !== 'object' || o.content === null)) {
    errors.push('content must be an object');
  }
  return { valid: errors.length === 0, errors };
}

