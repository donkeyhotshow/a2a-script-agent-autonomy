/**
 * Canonical validation interfaces for the entire system
 * Single source of truth for all validation result types
 */

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  path?: string[];
}

/**
 * Standard validation result with structured validation errors
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Legacy validation result variant for action validator compatibility
 * This is kept for backward compatibility only
 * @deprecated Use canonical ValidationResult instead
 */
export interface ActionValidationResult {
  success: boolean;
  errors?: string[];
}

// Backward compatibility aliases (exact names as previously defined)
export type CommandValidationResult = ValidationResult;
export type ArtifactValidationResult = ValidationResult;
export type FormValidationError = ValidationError;
