/**
 * AJV validation schemas for the top-5 artifact types (Part 9 / ADR-0071).
 *
 * Usage:
 *   import { validateArtifact } from '@/validation/artifact-schemas';
 *   const ok = validateArtifact(myArtifact);
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ── Shared sub-schemas ────────────────────────────────────────────────────

const TEST_SUITE_SCHEMA = {
  type: 'object',
  required: ['total', 'passed', 'failed', 'skipped'],
  properties: {
    total:   { type: 'integer', minimum: 0 },
    passed:  { type: 'integer', minimum: 0 },
    failed:  { type: 'integer', minimum: 0 },
    skipped: { type: 'integer', minimum: 0 },
  },
};

// ── Base artifact schema (all types share this) ───────────────────────────

const BASE_ARTIFACT_SCHEMA = {
  type: 'object',
  required: ['artifact_id', 'artifact_type', 'session_id', 'turn_id', 'created_at', 'schema_version', 'summary'],
  properties: {
    artifact_id:    { type: 'string', minLength: 1 },
    artifact_type:  { type: 'string', minLength: 1 },
    session_id:     { type: 'string', minLength: 1 },
    task_run_id:    { type: 'string' },
    turn_id:        { type: 'string', minLength: 1 },
    created_at:     { type: 'string', format: 'date-time' },
    schema_version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
    severity:       { type: 'string', enum: ['info', 'warning', 'critical'] },
    summary:        { type: 'string', minLength: 1 },
    consumed_by:    { type: 'array', items: { type: 'string' } },
    retained_until: { type: 'string' },
    data:           { type: 'object' },
  },
};

// ── Per-type schemas (data field) ─────────────────────────────────────────

export const CONFIDENCE_TRACE_SCHEMA = {
  ...BASE_ARTIFACT_SCHEMA,
  properties: {
    ...BASE_ARTIFACT_SCHEMA.properties,
    artifact_type: { type: 'string', const: 'CONFIDENCE_TRACE' },
    data: {
      type: 'object',
      required: ['confidence', 'gate_threshold', 'decision'],
      properties: {
        confidence:          { type: 'number', minimum: 0, maximum: 1 },
        gate_threshold:      { type: 'number', minimum: 0, maximum: 1 },
        decision:            { type: 'string', enum: ['proceed', 'wait', 'handoff', 'stop', 'downgrade'] },
        routing_point:       { type: 'string' },
        reason_code:         { type: 'string' },
        correction_attempts: { type: 'integer', minimum: 0, maximum: 3 },
        recommendation: {
          type: 'string',
          enum: ['PROCEED', 'SELF_CORRECT', 'WAIT_HUMAN', 'ABORT'],
        },
      },
    },
  },
};

export const WAITING_STATE_SCHEMA = {
  ...BASE_ARTIFACT_SCHEMA,
  properties: {
    ...BASE_ARTIFACT_SCHEMA.properties,
    artifact_type: { type: 'string', const: 'WAITING_STATE' },
    data: {
      type: 'object',
      required: ['reason', 'expires_at', 'humanlayer_approval_type', 'checkpoint_id'],
      properties: {
        reason:          { type: 'string', minLength: 1 },
        expires_at:      { type: 'string' },
        expiry_policy:   { type: 'string', enum: ['escalate', 'reroute', 'stop'] },
        resume_target:   { type: 'string' },
        checkpoint_id:   { type: 'string', minLength: 1 },
        humanlayer_approval_type: {
          type: 'string',
          enum: [
            'CRITICAL_PATH', 'EXTERNAL_CALL', 'DATA_ACCESS',
            'ESCALATION', 'DELEGATION', 'ACTION_APPROVAL', 'TEXT_APPROVAL',
          ],
        },
        required_inputs: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'label', 'type'],
            properties: {
              id:      { type: 'string' },
              label:   { type: 'string' },
              type:    { type: 'string', enum: ['text', 'choice', 'confirm'] },
              options: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

export const LOOP_SIGNAL_SCHEMA = {
  ...BASE_ARTIFACT_SCHEMA,
  properties: {
    ...BASE_ARTIFACT_SCHEMA.properties,
    artifact_type: { type: 'string', const: 'LOOP_SIGNAL' },
    data: {
      type: 'object',
      required: ['triple', 'repeat_count', 'severity'],
      properties: {
        triple:           { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
        repeat_count:     { type: 'integer', minimum: 1 },
        severity:         { type: 'string', enum: ['info', 'warning', 'critical'] },
        downgrade_action: { type: 'string' },
      },
    },
  },
};

export const VALIDATION_SUMMARY_SCHEMA = {
  ...BASE_ARTIFACT_SCHEMA,
  properties: {
    ...BASE_ARTIFACT_SCHEMA.properties,
    artifact_type: { type: 'string', const: 'VALIDATION_SUMMARY' },
    data: {
      type: 'object',
      required: [
        'validation_id', 'suites', 'coverage', 'all_passed', 'blocking_failures',
        'merge_ready', 'branch_safety', 'donecriteria_passed', 'manual_review_required',
      ],
      properties: {
        validation_id:          { type: 'string', minLength: 1 },
        suites: {
          type: 'object',
          required: ['unit', 'integration', 'simulation', 'regression'],
          properties: {
            unit:        TEST_SUITE_SCHEMA,
            integration: TEST_SUITE_SCHEMA,
            simulation:  TEST_SUITE_SCHEMA,
            regression:  TEST_SUITE_SCHEMA,
          },
        },
        coverage:               { type: 'number', minimum: 0, maximum: 100 },
        all_passed:             { type: 'boolean' },
        blocking_failures:      { type: 'array', items: { type: 'string' } },
        merge_ready:            { type: 'boolean' },
        branch_safety:          { type: 'string', enum: ['SAFE', 'UNSAFE', 'UNKNOWN'] },
        donecriteria_passed:    { type: 'boolean' },
        manual_review_required: { type: 'boolean' },
      },
    },
  },
};

export const MEMORY_INFLUENCE_SCHEMA = {
  ...BASE_ARTIFACT_SCHEMA,
  properties: {
    ...BASE_ARTIFACT_SCHEMA.properties,
    artifact_type: { type: 'string', const: 'MEMORY_INFLUENCE' },
    data: {
      type: 'object',
      required: [
        'episodic_recalls', 'pattern_injections',
        'total_influence_score', 'confidence_delta_from_memory',
      ],
      properties: {
        episodic_recalls: {
          type: 'array',
          items: {
            type: 'object',
            required: ['run_id', 'task_similarity', 'outcome', 'roi_metrics', 'applied_lessons'],
            properties: {
              run_id:           { type: 'string', minLength: 1 },
              task_similarity:  { type: 'number', minimum: 0, maximum: 1 },
              outcome:          { type: 'string', enum: ['SUCCESS', 'FAILED'] },
              roi_metrics: {
                type: 'object',
                required: ['time_saved_ms', 'errors_prevented'],
                properties: {
                  time_saved_ms:    { type: 'number', minimum: 0 },
                  errors_prevented: { type: 'integer', minimum: 0 },
                },
              },
              applied_lessons: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        pattern_injections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['pattern_id', 'pattern_name', 'anti_pattern', 'confidence', 'injection_effect'],
            properties: {
              pattern_id:       { type: 'string', minLength: 1 },
              pattern_name:     { type: 'string', minLength: 1 },
              anti_pattern:     { type: 'boolean' },
              confidence:       { type: 'number', minimum: 0, maximum: 1 },
              injection_effect: { type: 'string', minLength: 1 },
            },
          },
        },
        total_influence_score:        { type: 'number', minimum: 0, maximum: 1 },
        confidence_delta_from_memory: { type: 'number' },
      },
    },
  },
};

// ── Schema registry ───────────────────────────────────────────────────────

const SCHEMA_MAP: Record<string, object> = {
  CONFIDENCE_TRACE:  CONFIDENCE_TRACE_SCHEMA,
  WAITING_STATE:     WAITING_STATE_SCHEMA,
  LOOP_SIGNAL:       LOOP_SIGNAL_SCHEMA,
  VALIDATION_SUMMARY: VALIDATION_SUMMARY_SCHEMA,
  MEMORY_INFLUENCE:  MEMORY_INFLUENCE_SCHEMA,
};

// Compile all schemas eagerly
const compiledValidators = new Map<string, ReturnType<typeof ajv.compile>>();
for (const [type, schema] of Object.entries(SCHEMA_MAP)) {
  compiledValidators.set(type, ajv.compile(schema));
}

// ── Public API ────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate any artifact against its registered schema. */
export function validateArtifact(artifact: unknown): ValidationResult {
  if (!artifact || typeof artifact !== 'object') {
    return { valid: false, errors: ['Artifact must be an object'] };
  }
  const type = (artifact as Record<string, unknown>).artifact_type as string | undefined;
  const validator = type ? compiledValidators.get(type) : undefined;

  if (!validator) {
    // Fall back to base schema for unregistered types
    const baseValidator = ajv.compile(BASE_ARTIFACT_SCHEMA);
    const valid = baseValidator(artifact);
    return {
      valid: !!valid,
      errors: baseValidator.errors?.map((e) => `${e.instancePath || '(root)'} ${e.message}`) ?? [],
    };
  }

  const valid = validator(artifact);
  return {
    valid: !!valid,
    errors: validator.errors?.map((e) => `${e.instancePath || '(root)'} ${e.message}`) ?? [],
  };
}
