/**
 * Server-side artifact validator — used by ArtifactStore (ADR-0053).
 *
 * Validates mandatory base fields that every artifact must carry.
 * Uses manual checks to avoid AJV ESM/CJS compat issues present
 * in the existing server codebase.
 */

export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_STRING_FIELDS = [
  'artifact_id',
  'artifact_type',
  'session_id',
  'turn_id',
  'schema_version',
  'summary',
] as const;

const VALID_SEVERITIES = new Set(['info', 'warning', 'critical']);
const SCHEMA_VERSION_RE = /^\d+\.\d+$/;
// Relaxed ISO 8601 date-time: validates structural prefix YYYY-MM-DDTHH:mm:ss.
// Intentionally does not validate calendar correctness (e.g. month 1-12) to
// avoid reimplementing a full date parser; real date-time correctness is
// guaranteed upstream by the server layer that stamps created_at.
const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d/;

export function validateArtifact(artifact: unknown): ArtifactValidationResult {
  const errors: string[] = [];

  if (typeof artifact !== 'object' || artifact === null) {
    return { valid: false, errors: ['(root) must be an object'] };
  }

  const a = artifact as Record<string, unknown>;

  // Required string fields — must be present and non-empty
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof a[field] !== 'string' || (a[field] as string).length === 0) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  // created_at — must be ISO 8601 date-time
  if (typeof a['created_at'] !== 'string' || !ISO_DATE_RE.test(a['created_at'])) {
    errors.push('created_at must be an ISO 8601 date-time string');
  }

  // schema_version — if present must match "N.N"
  if (
    typeof a['schema_version'] === 'string' &&
    !SCHEMA_VERSION_RE.test(a['schema_version'])
  ) {
    errors.push('schema_version must match pattern N.N (e.g. "1.0")');
  }

  // severity — optional, but if present must be a known value
  if (a['severity'] !== undefined && !VALID_SEVERITIES.has(a['severity'] as string)) {
    errors.push(`severity must be one of: ${[...VALID_SEVERITIES].join(', ')}`);
  }

  // consumed_by — optional array of strings
  if (a['consumed_by'] !== undefined) {
    if (!Array.isArray(a['consumed_by'])) {
      errors.push('consumed_by must be an array');
    } else {
      const cb = a['consumed_by'] as unknown[];
      for (let i = 0; i < cb.length; i++) {
        if (typeof cb[i] !== 'string') {
          errors.push(`consumed_by[${i}] must be a string`);
        }
      }
    }
  }

  // data — optional object (not array, not null)
  if (
    a['data'] !== undefined &&
    (typeof a['data'] !== 'object' || a['data'] === null || Array.isArray(a['data']))
  ) {
    errors.push('data must be an object');
  }

  return { valid: errors.length === 0, errors };
}
