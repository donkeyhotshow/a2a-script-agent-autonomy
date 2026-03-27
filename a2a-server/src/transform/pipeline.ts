/**
 * Transform Pipeline Runner
 * 
 * Main entry point for running transform pipelines.
 * Reads server-transforms-*.json files and applies transformations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { applyOperation, createDefaultFileSystem } from './operations.js';
import { prepareInvokePayloadForLlmPrompt } from './materialize-result-for-llm.js';
import { attachFlowControlHintToInvokePayload } from '../prompts/flow-control-hints.js';
import { attachWorkbenchForLlmPrompt } from './workbench-normalize.js';
import type { 
  TransformPipeline, 
  TransformContext, 
  TransformResult, 
  TransformOptions
} from './types.js';

/**
 * Run a transform pipeline on an input document
 * 
 * @param pipeline - The transform pipeline definition
 * @param input - The input document to transform
 * @param options - Optional configuration options
 * @returns The transformed output document
 */
export async function runTransformPipeline(
  pipeline: TransformPipeline,
  input: Record<string, unknown>,
  options: TransformOptions = {}
): Promise<TransformResult> {
  // Initialize output with empty object
  const $out: Record<string, unknown> = {};
  
  // Create context
  const context: TransformContext = {
    input,
    $out,
    baseDir: options.baseDir,
    outputDir: options.outputDir,
    fs: options.fs || createDefaultFileSystem()
  };
  
  // Track written files
  const files: Record<string, string> = {};
  
  try {
    // Execute each step in sequence
    for (const step of pipeline.steps) {
      await applyOperation(step, context);
      
      // Collect any files that were written
      if (context.$out._files) {
        Object.assign(files, context.$out._files as Record<string, string>);
      }
    }
    
    // Remove internal _files property from output
    delete context.$out._files;
    
    return {
      output: context.$out,
      files: Object.keys(files).length > 0 ? files : undefined,
      success: true
    };
    
  } catch (error) {
    return {
      output: context.$out,
      files: Object.keys(files).length > 0 ? files : undefined,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load a transform pipeline from a JSON file
 * 
 * @param filePath - Path to the transform JSON file
 * @returns The loaded pipeline definition
 */
export async function loadTransformPipeline(filePath: string): Promise<TransformPipeline> {
  const content = await fs.readFile(filePath, 'utf-8');
  const pipeline = JSON.parse(content) as TransformPipeline;
  
  // Validate pipeline structure
  if (pipeline.type !== 'pipeline') {
    throw new Error(`Invalid pipeline type: ${pipeline.type}. Expected 'pipeline'.`);
  }
  
  if (!Array.isArray(pipeline.steps) || pipeline.steps.length === 0) {
    throw new Error('Pipeline must have at least one step.');
  }
  
  return pipeline;
}

/**
 * Load and run a transform pipeline from a JSON file
 * 
 * @param pipelinePath - Path to the transform JSON file
 * @param input - The input document to transform
 * @param options - Optional configuration options
 * @returns The transformed output document
 */
export async function runTransformPipelineFromFile(
  pipelinePath: string,
  input: Record<string, unknown>,
  options: TransformOptions = {}
): Promise<TransformResult> {
  const pipeline = await loadTransformPipeline(pipelinePath);
  
  // Set base directory to the directory containing the pipeline file if not specified
  const baseDir = options.baseDir || path.dirname(pipelinePath);
  
  return runTransformPipeline(pipeline, input, {
    ...options,
    baseDir
  });
}

/**
 * Find and load a transform file for a simulation step
 * 
 * Searches for server-transforms-request.json or server-transforms-response.json
 * in the simulation directory
 * 
 * @param simulationDir - Path to the simulation directory (e.g., simulations/agent-coder/3)
 * @param type - Type of transform: 'request' or 'response'
 * @returns The loaded pipeline or null if not found
 */
export async function loadSimulationTransform(
  simulationDir: string,
  type: 'request' | 'response'
): Promise<TransformPipeline | null> {
  const fileName = `server-transforms-${type}.json`;
  const filePath = path.resolve(simulationDir, fileName);
  
  try {
    return await loadTransformPipeline(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Run simulation transforms for a step
 * 
 * Loads and applies both request and response transforms for a simulation step
 * 
 * @param simulationDir - Path to the simulation directory
 * @param input - The input document
 * @param type - Which transform to run: 'request' or 'response'
 * @param options - Optional configuration options
 * @returns The transformed output document
 */
export async function runSimulationTransform(
  simulationDir: string,
  input: Record<string, unknown>,
  type: 'request' | 'response',
  options: TransformOptions = {}
): Promise<TransformResult> {
  const transformPath = path.resolve(
    simulationDir, 
    `server-transforms-${type}.json`
  );
  
  return runTransformPipelineFromFile(transformPath, input, options);
}

/**
 * Schema name → template file override. Convention: `{schema}-request.md`.
 * Only list schemas that deviate from the convention.
 */
const SCHEMA_TO_TEMPLATE_OVERRIDES: Record<string, string> = {
  'fix-vue-imports': '',           // DSL, no LLM
  'fix-vue-imports-decline': '',
  'fix-laravel-namespaces-and-uses': '',
};

function schemaToTemplate(schema: string): string {
  if (schema in SCHEMA_TO_TEMPLATE_OVERRIDES) return SCHEMA_TO_TEMPLATE_OVERRIDES[schema];
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
 * Uses PROMPTS_TRANSFORMS_PATH env or default: cwd/prompts/transforms
 */
export function getPromptsTransformsPath(): string {
  const envPath = process.env.PROMPTS_TRANSFORMS_PATH;
  if (envPath) return path.resolve(envPath);
  return path.resolve(process.cwd(), 'prompts', 'transforms');
}

/**
 * Find first existing transform file. Lookup order:
 * 1. {schema}-{step}-{type}.json
 * 2. {schema}-{type}.json
 * 3. server-transforms-{type}.json
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
  if (forceServerTransforms) {
    if (schemaName === 'coder' && type === 'request') {
      candidates.push(path.resolve(dir, 'coder-request.json'));
    }
    if (schemaName === 'dialog' && type === 'response') {
      candidates.push(path.resolve(dir, 'dialog-llm-response.json'));
    }
    candidates.push(path.resolve(dir, `server-transforms-${type}.json`));
  } else {
    if (step !== undefined && step > 0) {
      candidates.push(path.resolve(dir, `${schemaName}-${step}-${type}.json`));
    }
    candidates.push(path.resolve(dir, `${schemaName}-${type}.json`));
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
 * Uses same lookup order as runPromptsTransform.
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
 * Lookup: {schema}-{step}-{type}.json → {schema}-{type}.json → server-transforms-{type}.json
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
  const filePath = await resolveTransformFile(promptsTransformsDir, schemaName, step, type, forceServerTransforms);
  const content = await fs.readFile(filePath, 'utf-8');
  let pipeline = JSON.parse(content) as TransformPipeline;

  if (type === 'request') {
    const templateName = schemaToTemplate(schemaName);
    pipeline = substitutePipelineVars(pipeline, { TEMPLATE_NAME: templateName });
  }

  const baseDir = transformOptions.baseDir ?? path.resolve(promptsTransformsDir, '../../..');
  let pipelineInput: Record<string, unknown> = input;
  if (type === 'request') {
    const clone = prepareInvokePayloadForLlmPrompt(JSON.parse(JSON.stringify(input)) as Record<string, unknown>);
    attachFlowControlHintToInvokePayload(clone);
    attachWorkbenchForLlmPrompt(clone);
    pipelineInput = clone;
  }
  return runTransformPipeline(pipeline, pipelineInput, { ...transformOptions, baseDir });
}

/**
 * Validate a transform pipeline
 * 
 * @param pipeline - The pipeline to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePipeline(pipeline: unknown): string[] {
  const errors: string[] = [];
  
  if (!pipeline || typeof pipeline !== 'object') {
    errors.push('Pipeline must be an object');
    return errors;
  }
  
  const p = pipeline as Record<string, unknown>;
  
  if (p.type !== 'pipeline') {
    errors.push(`Invalid type: ${p.type}. Expected 'pipeline'.`);
  }
  
  if (!Array.isArray(p.steps)) {
    errors.push('Steps must be an array');
    return errors;
  }
  
  if (p.steps.length === 0) {
    errors.push('Pipeline must have at least one step');
  }
  
  const validOps = [
    'copy',
    'set',
    'append-to-array',
    'parse-json-from-md',
    'render-markdown',
    'switch',
    'apply-scratchpad-ops',
    'apply-workbench-section-ops',
    'truncate-section',
    'pick-context',
    'drop',
    'truncate-history',
    'include-if',
    'pick-files',
    'merge-files-to-context',
    'merge-workbench-sections',
    'summarize-files',
    'for-each'
  ];
  
  for (let i = 0; i < p.steps.length; i++) {
    const step = p.steps[i] as Record<string, unknown>;
    
    if (!step.op) {
      errors.push(`Step ${i}: Missing 'op' property`);
      continue;
    }
    
    if (!validOps.includes(step.op as string)) {
      errors.push(`Step ${i}: Unknown operation '${step.op}'`);
    }
    
    // Basic validation for each operation type
    switch (step.op) {
      case 'copy':
        if (!step.from) errors.push(`Step ${i} (copy): Missing 'from'`);
        if (!step.to) errors.push(`Step ${i} (copy): Missing 'to'`);
        break;
      case 'set':
        if (!step.path) errors.push(`Step ${i} (set): Missing 'path'`);
        if (step.value === undefined && !step.valueFrom) {
          errors.push(`Step ${i} (set): Must have either 'value' or 'valueFrom'`);
        }
        break;
      case 'append-to-array':
        if (!step.to) errors.push(`Step ${i} (append-to-array): Missing 'to'`);
        if (!step.value) errors.push(`Step ${i} (append-to-array): Missing 'value'`);
        break;
      case 'parse-json-from-md':
        if (!step.fromFile) errors.push(`Step ${i} (parse-json-from-md): Missing 'fromFile'`);
        if (!step.to) errors.push(`Step ${i} (parse-json-from-md): Missing 'to'`);
        break;
      case 'render-markdown':
        if (!step.templateRef) errors.push(`Step ${i} (render-markdown): Missing 'templateRef'`);
        if (!step.data) errors.push(`Step ${i} (render-markdown): Missing 'data'`);
        if (!step.outputFile) errors.push(`Step ${i} (render-markdown): Missing 'outputFile'`);
        break;
      case 'switch':
        if (!step.discriminator) errors.push(`Step ${i} (switch): Missing 'discriminator'`);
        if (!step.cases) errors.push(`Step ${i} (switch): Missing 'cases'`);
        break;
      case 'apply-scratchpad-ops':
        if (!step.from) errors.push(`Step ${i} (apply-scratchpad-ops): Missing 'from'`);
        break;
      case 'apply-workbench-section-ops':
        if (!step.from) errors.push(`Step ${i} (apply-workbench-section-ops): Missing 'from'`);
        break;
      case 'truncate-section':
        if (!step.path) errors.push(`Step ${i} (truncate-section): Missing 'path'`);
        if (step.maxChars === undefined || typeof step.maxChars !== 'number') {
          errors.push(`Step ${i} (truncate-section): Missing or invalid 'maxChars'`);
        }
        break;
      case 'pick-context':
        if (!Array.isArray(step.include) || step.include.length === 0) {
          errors.push(`Step ${i} (pick-context): Missing or empty 'include'`);
        }
        break;
      case 'drop':
        if (!step.path) errors.push(`Step ${i} (drop): Missing 'path'`);
        break;
      case 'truncate-history':
        if (typeof step.keep !== 'number') errors.push(`Step ${i} (truncate-history): Missing 'keep'`);
        break;
      case 'include-if':
        if (!step.path) errors.push(`Step ${i} (include-if): Missing 'path'`);
        if (!step.condition) errors.push(`Step ${i} (include-if): Missing 'condition'`);
        break;
      case 'pick-files':
        if (!step.paths) errors.push(`Step ${i} (pick-files): Missing 'paths'`);
        break;
      case 'merge-files-to-context':
        // no required params
        break;
      case 'merge-workbench-sections':
        if (!step.from) errors.push(`Step ${i} (merge-workbench-sections): Missing 'from'`);
        if (!step.to) errors.push(`Step ${i} (merge-workbench-sections): Missing 'to'`);
        break;
      case 'summarize-files':
        // no required params
        break;
      case 'for-each':
        if (!step.arrayPath) errors.push(`Step ${i} (for-each): Missing 'arrayPath'`);
        if (!step.as) errors.push(`Step ${i} (for-each): Missing 'as'`);
        if (!Array.isArray(step.steps) || step.steps.length === 0) {
          errors.push(`Step ${i} (for-each): Missing or empty 'steps'`);
        }
        break;
    }
  }
  
  return errors;
}
