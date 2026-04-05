/**
 * Prompts/transforms path resolution, schema maps, and runPromptsTransform.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { prepareInvokePayloadForLlmPrompt } from '../materialize-result-for-llm.js';
import { attachFlowControlHintToInvokePayload } from '../../prompts/flow-control-hints.js';
import { attachWorkbenchForLlmPrompt } from '../workbench-normalize.js';
import { loadTransformPipeline } from './load.js';
import { runTransformPipeline } from './run.js';
import type { TransformPipeline, TransformOptions, TransformResult } from '../types.js';

/**
 * Schema name → template file override. Convention: `{schema}-request.md`.
 * Only list schemas that deviate from the convention.
 */
const SCHEMA_TO_TEMPLATE_OVERRIDES: Record<string, string> = {
  'fix-vue-imports': '',
  'fix-vue-imports-decline': '',
  'fix-laravel-namespaces-and-uses': '',
};

function schemaToTemplate(schema: string): string {
  if (schema in SCHEMA_TO_TEMPLATE_OVERRIDES) {
    return SCHEMA_TO_TEMPLATE_OVERRIDES[schema] ?? '';
  }
  return `${schema}-request.md`;
}

/** Simulation name → schema name for prompts/transforms lookup */
export const SIMULATION_TO_SCHEMA: Record<string, string> = {
  dialog: 'dialog',
  'agent-analyze': 'agent',
  'agent-coder': 'agent',
  'agent-auto-ai': 'agent',
  'agent-coder-smart': 'agent',
  'coder-smart-v2': 'agent',
  analyze: 'agent',
  coder: 'agent',
  'auto-ai-v2': 'agent',
  'auto-ai': 'agent',
  'fix-vue-imports': 'fix-vue-imports',
  'fix-vue-imports-decline': 'fix-vue-imports-decline',
  'fix-vue-imports-batched': 'fix-vue-imports',
  'fix-laravel-namespaces-and-uses': 'fix-laravel-namespaces-and-uses',
  'task-decomposition': 'task-decomposition',
  'test-action-flow': 'test-action-flow',
  'phpunit-deprecations': 'coder',
};

function substitutePipelineVars(pipeline: TransformPipeline, vars: Record<string, string>): TransformPipeline {
  const str = JSON.stringify(pipeline);
  const substituted = Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    str
  );
  return JSON.parse(substituted) as TransformPipeline;
}

/**
 * Resolve path to prompts/transforms directory.
 *
 * Mode is "locked" to either:
 * - explicit PROMPTS_TRANSFORMS_PATH env (env-override), or
 * - bundled default relative to the compiled server sources (bundled-default).
 */
export function getPromptsTransformsPath(): string {
  const envPath = process.env.PROMPTS_TRANSFORMS_PATH;
  if (envPath) {
    return path.resolve(envPath);
  }

  const dir =
    typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

  // This file lives in src/transform/pipeline/ → three levels up is a2a-server/
  return path.resolve(dir, '../../../prompts/transforms');
}

/**
 * Find first existing transform file. Lookup order:
 * 1. prompts/{schema}/server-transforms-{type}.json (schema-local override)
 * 2. {schema}-{step}-{type}.json
 * 3. {schema}-{type}.json
 * 4. server-transforms-{type}.json
 * When forceServerTransforms: true, use server-transforms-{type}.json; **dialog** response also tries **dialog-llm-response.json** first (workbench + same parse/execute as generic).
 */
async function resolveTransformFile(
  dir: string,
  schemaName: string,
  step: number | undefined,
  type: 'request' | 'response',
  forceServerTransforms?: boolean
): Promise<string> {
  const candidates: string[] = [];

  // Map schema names to their transform files
  const schemaMapping: Record<string, string> = {
    'agent': 'agent',
    'task-decomposition': 'task-decomposition',
  };
  const mappedSchema = schemaMapping[schemaName] || schemaName;

  if (forceServerTransforms) {
    if (mappedSchema === 'coder' && type === 'request') {
      candidates.push(path.resolve(dir, 'coder-request.json'));
    }
    // Dialog request transform sets initial form (textarea) before LLM call
    if (mappedSchema === 'dialog' && type === 'request') {
      candidates.push(path.resolve(dir, 'dialog-request.json'));
    }
    if (mappedSchema === 'dialog' && type === 'response') {
      candidates.push(path.resolve(dir, 'dialog-llm-response.json'));
    }
    // Agent request transform sets initial form before LLM call
    if (mappedSchema === 'agent' && type === 'request') {
      candidates.push(path.resolve(dir, 'agent-request.json'));
    }
    candidates.push(path.resolve(dir, `server-transforms-${type}.json`));
  } else {
    // Schema-local override: prompts/{schema}/server-transforms-{type}.json
    candidates.push(path.resolve(dir, '..', mappedSchema, `server-transforms-${type}.json`));

    if (step !== undefined && step > 0) {
      candidates.push(path.resolve(dir, `${mappedSchema}-${step}-${type}.json`));
    }
    candidates.push(path.resolve(dir, `${mappedSchema}-${type}.json`));
    candidates.push(path.resolve(dir, `server-transforms-${type}.json`));
  }

  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  throw new Error(`No transform file found for ${schemaName}/${step ?? '?'} ${type}`);
}

/**
 * Load transform pipeline from prompts/transforms for a schema (and optional step).
 * Uses same lookup order as runPromptsTransform: schema-local → step-specific → schema-specific → global.
 */
export async function loadPromptsTransform(
  promptsTransformsDir: string,
  schemaName: string,
  type: 'request' | 'response',
  step?: number
): Promise<TransformPipeline | null> {
  try {
    const filePath = await resolveTransformFile(promptsTransformsDir, schemaName, step, type);
    return await loadTransformPipeline(filePath);
  } catch {
    return null;
  }
}

/**
 * Run transforms from prompts/transforms/
 * Lookup: prompts/{schema}/server-transforms-{type}.json → {schema}-{step}-{type}.json → {schema}-{type}.json → server-transforms-{type}.json
 * For request type: substitutes {{TEMPLATE_NAME}} when using server-transforms-request.json
 * forceServerTransforms: use server-transforms-*.json only (for LLM pipeline; dialog-request.json is form-only).
 *
 * @param promptsTransformsDir - Path to prompts/transforms
 * @param schemaName - Schema name (e.g. 'dialog')
 * @param input - Input document
 * @param type - 'request' or 'response'
 * @param options - Transform options; step, forceServerTransforms
 *
 * For `type === 'request'`, the input is cloned and `prepareInvokePayloadForLlmPrompt` runs first:
 * `result.message` → `context.history` as user; each other `result` key → system line; then `result` is cleared.
 * Then `attachFlowControlHintToInvokePayload` sets `flowControlHint` from `context.execution.action` + `step` for templates.
 * Then `attachWorkbenchForLlmPrompt` sets `context.workbench` and root `workbench` for templates (see workbench-normalize.ts).
 *
 * Router handoff (`result.choice` → `execution.action` + `step`) is handled via explicit transforms in the JSON pipeline.
 */
export async function runPromptsTransform(
  promptsTransformsDir: string,
  schemaName: string,
  input: Record<string, unknown>,
  type: 'request' | 'response',
  options: TransformOptions & { step?: number; forceServerTransforms?: boolean } = {}
): Promise<TransformResult> {
  const { step, forceServerTransforms, ...transformOptions } = options;
  const filePath = await resolveTransformFile(
    promptsTransformsDir,
    schemaName,
    step,
    type,
    forceServerTransforms
  );
  const content = await fs.readFile(filePath, 'utf-8');
  let pipeline = JSON.parse(content) as TransformPipeline;

  if (type === 'request') {
    const templateName = schemaToTemplate(schemaName);
    pipeline = substitutePipelineVars(pipeline, { TEMPLATE_NAME: templateName });
  }

  const baseDir = transformOptions.baseDir ?? path.resolve(promptsTransformsDir, '../../..');
  let pipelineInput: Record<string, unknown> = input;
  if (type === 'request') {
    const clone = prepareInvokePayloadForLlmPrompt(
      JSON.parse(JSON.stringify(input)) as Record<string, unknown>
    );
    attachFlowControlHintToInvokePayload(clone);
    attachWorkbenchForLlmPrompt(clone);
    pipelineInput = clone;
  }
  return runTransformPipeline(pipeline, pipelineInput, { ...transformOptions, baseDir });
}
