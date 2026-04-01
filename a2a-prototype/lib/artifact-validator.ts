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
