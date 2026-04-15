/**
 * Run pipeline from resolved file paths (incl. simulation step bundles).
 */

import * as path from 'path';
import { loadTransformPipeline } from './load.js';
import { runTransformPipeline } from './run.js';
import type { TransformOptions, TransformResult } from '../types.js';

export async function runTransformPipelineFromFile(
  pipelinePath: string,
  input: Record<string, unknown>,
  options: TransformOptions = {}
): Promise<TransformResult> {
  const pipeline = await loadTransformPipeline(pipelinePath);

  const baseDir = options.baseDir || path.dirname(pipelinePath);

  return runTransformPipeline(pipeline, input, {
    ...options,
    baseDir,
  });
}

export async function runSimulationTransform(
  simulationDir: string,
  input: Record<string, unknown>,
  type: 'request' | 'response',
  options: TransformOptions = {}
): Promise<TransformResult> {
  const transformPath = path.resolve(simulationDir, `server-transforms-${type}.json`);

  return runTransformPipelineFromFile(transformPath, input, options);
}
