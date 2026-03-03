/**
 * Transform Pipeline Runner
 * 
 * Main entry point for running transform pipelines.
 * Reads server-transforms-*.json files and applies transformations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { applyOperation, createDefaultFileSystem } from './operations.js';
import { resolveTemplates } from './jsonpath.js';
import type { 
  TransformPipeline, 
  TransformContext, 
  TransformResult, 
  TransformOptions,
  TransformStep,
  TransformFileSystem
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
 * @param simulationDir - Path to the simulation directory (e.g., simulations/coder/3)
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
  
  const validOps = ['copy', 'set', 'append-to-array', 'parse-json-from-md', 'render-markdown', 'switch'];
  
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
    }
  }
  
  return errors;
}
