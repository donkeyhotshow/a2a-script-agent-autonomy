import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ArtifactBase, ArtifactValidationResult } from './types';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Base schema shared by all artifacts
const BASE_SCHEMA = {
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
  additionalProperties: true,
} as const;

// Per-type data schemas
const DATA_SCHEMAS: Partial<Record<string, object>> = {
  CONFIDENCE_TRACE: {
    type: 'object',
    required: ['confidence', 'gate_threshold', 'decision'],
    properties: {
      confidence:     { type: 'number', minimum: 0, maximum: 1 },
      gate_threshold: { type: 'number', minimum: 0, maximum: 1 },
      decision:       { type: 'string', enum: ['proceed', 'wait', 'handoff', 'stop', 'downgrade'] },
      routing_point:  { type: 'string' },
    },
  },
  WAITING_STATE: {
    type: 'object',
    required: ['reason', 'expires_at', 'humanlayer_approval_type', 'checkpoint_id'],
    properties: {
      reason: { type: 'string' },
      expires_at: { type: 'string' },
      humanlayer_approval_type: {
        type: 'string',
        enum: ['CRITICAL_PATH', 'EXTERNAL_CALL', 'DATA_ACCESS', 'ESCALATION', 'DELEGATION', 'ACTION_APPROVAL', 'TEXT_APPROVAL'],
      },
      checkpoint_id: { type: 'string', minLength: 1 },
    },
  },
  LOOP_SIGNAL: {
    type: 'object',
    required: ['triple', 'repeat_count', 'severity'],
    properties: {
      triple:       { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
      repeat_count: { type: 'integer', minimum: 1 },
      severity:     { type: 'string', enum: ['info', 'warning', 'critical'] },
    },
  },
  EXECUTION_DECISION: {
    type: 'object',
    required: ['decision', 'confidence'],
    properties: {
      decision:       { type: 'string', enum: ['proceed', 'wait', 'handoff', 'stop', 'downgrade'] },
      confidence:     { type: 'number', minimum: 0, maximum: 1 },
      reason_code:    { type: 'string' },
      idempotency_key: { type: 'string' },
    },
  },
  VALIDATION_SUMMARY: {
    type: 'object',
    required: ['validation_id', 'suites', 'coverage', 'all_passed', 'blocking_failures',
               'merge_ready', 'branch_safety', 'donecriteria_passed', 'manual_review_required'],
    properties: {
      validation_id: { type: 'string', minLength: 1 },
      suites: {
        type: 'object',
        required: ['unit', 'integration', 'simulation', 'regression'],
        properties: {
          unit:        { $ref: '#/$defs/testSuite' },
          integration: { $ref: '#/$defs/testSuite' },
          simulation:  { $ref: '#/$defs/testSuite' },
          regression:  { $ref: '#/$defs/testSuite' },
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
    $defs: {
      testSuite: {
        type: 'object',
        required: ['total', 'passed', 'failed', 'skipped'],
        properties: {
          total:   { type: 'integer', minimum: 0 },
          passed:  { type: 'integer', minimum: 0 },
          failed:  { type: 'integer', minimum: 0 },
          skipped: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
  MEMORY_INFLUENCE: {
    type: 'object',
    required: ['episodic_recalls', 'pattern_injections', 'total_influence_score', 'confidence_delta_from_memory'],
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
                time_saved_ms:     { type: 'number', minimum: 0 },
                errors_prevented:  { type: 'integer', minimum: 0 },
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
      total_influence_score:         { type: 'number', minimum: 0, maximum: 1 },
      confidence_delta_from_memory:  { type: 'number' },
    },
  },
  SESSION_END_RECORD: {
    type: 'object',
    required: ['end_reason', 'duration_ms', 'total_loop_count', 'total_tool_calls',
               'total_human_interrupts', 'total_self_corrections', 'final_confidence',
               'donecriteria_completion_rate', 'branch_merged', 'roi_metrics',
               'fitness_violations', 'lessons_saved_to_memory'],
    properties: {
      end_reason: {
        type: 'string',
        enum: ['SUCCESS', 'FAILED', 'ABORTED', 'TIMEOUT', 'OPERATOR_STOPPED'],
      },
      duration_ms:                  { type: 'number', minimum: 0 },
      total_loop_count:             { type: 'integer', minimum: 0 },
      total_tool_calls:             { type: 'integer', minimum: 0 },
      total_human_interrupts:       { type: 'integer', minimum: 0 },
      total_self_corrections:       { type: 'integer', minimum: 0 },
      final_confidence:             { type: 'number', minimum: 0, maximum: 1 },
      donecriteria_completion_rate: { type: 'number', minimum: 0, maximum: 100 },
      branch_merged:                { type: 'boolean' },
      roi_metrics: {
        type: 'object',
        required: ['estimated_time_saved_ms', 'errors_prevented', 'suggestions_applied'],
        properties: {
          estimated_time_saved_ms: { type: 'number', minimum: 0 },
          errors_prevented:        { type: 'integer', minimum: 0 },
          suggestions_applied:     { type: 'integer', minimum: 0 },
        },
      },
      fitness_violations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['metric', 'threshold', 'actual'],
          properties: {
            metric:    { type: 'string', minLength: 1 },
            threshold: { type: 'number' },
            actual:    { type: 'number' },
          },
        },
      },
      lessons_saved_to_memory: { type: 'integer', minimum: 0 },
    },
  },
};

const baseValidator = ajv.compile(BASE_SCHEMA);

// Compile data validators lazily
const dataValidators = new Map<string, ReturnType<typeof ajv.compile>>();
function getDataValidator(type: string): ReturnType<typeof ajv.compile> | null {
  if (dataValidators.has(type)) return dataValidators.get(type)!;
  const schema = DATA_SCHEMAS[type];
  if (!schema) return null;
  const v = ajv.compile(schema);
  dataValidators.set(type, v);
  return v;
}

export function validateArtifact(artifact: unknown): ArtifactValidationResult {
  const baseValid = baseValidator(artifact);
  const errors: string[] = [];

  if (!baseValid && baseValidator.errors) {
    for (const err of baseValidator.errors) {
      errors.push(`${err.instancePath || '(root)'} ${err.message ?? 'invalid'}`);
    }
  }

  if (baseValid) {
    const a = artifact as ArtifactBase;
    const dataValidator = getDataValidator(a.artifact_type);
    if (dataValidator && a.data) {
      const dataValid = dataValidator(a.data);
      if (!dataValid && dataValidator.errors) {
        for (const err of dataValidator.errors) {
          errors.push(`data${err.instancePath || ''} ${err.message ?? 'invalid'}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export type { ArtifactValidationResult };
