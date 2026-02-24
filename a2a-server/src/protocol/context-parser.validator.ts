/** Context block validation helpers. */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContextBlock(block: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof block !== 'object' || block === null) {
    return { valid: false, errors: ['Context block must be an object'] };
  }
  const b = block as Record<string, unknown>;
  if (typeof b.session_id !== 'string' || b.session_id.trim() === '') {
    errors.push('session_id is required and must be a non-empty string');
  }
  if (b.version !== '1.0') {
    errors.push("version must be '1.0'");
  }
  return { valid: errors.length === 0, errors };
}
