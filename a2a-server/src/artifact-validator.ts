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
// ISO 8601 date-time (relaxed: YYYY-MM-DDTHH:mm:ss with optional tz)
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

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
