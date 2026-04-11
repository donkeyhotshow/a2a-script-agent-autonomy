/**
 * Run pipeline from resolved file paths (incl. simulation step bundles).
 */

import * as path from 'path';
import { loadTransformPipeline } from './load';
import { runTransformPipeline } from './run';
import type { TransformOptions, TransformResult } from '../types';

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

const ALLOWED_TYPES = new Set(['request', 'response']);

export async function runSimulationTransform(
  simulationDir: string,
  input: Record<string, unknown>,
  type: 'request' | 'response',
  options: TransformOptions = {}
): Promise<TransformResult> {
  // CWE-22/23: validate type at runtime before interpolating into filename
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error(`Invalid simulation transform type: ${type}`);
  }

  // CWE-22/23: confine simulationDir to the declared simulations root
  const simulationsRoot = path.resolve(
    options.simulationsRoot ?? process.cwd()
  );
  const resolvedDir = path.resolve(simulationDir);
  if (!resolvedDir.startsWith(simulationsRoot + path.sep) && resolvedDir !== simulationsRoot) {
    throw new Error(`Path traversal detected in simulationDir: ${simulationDir}`);
  }

  const transformPath = path.resolve(resolvedDir, `server-transforms-${type}.json`);

  return runTransformPipelineFromFile(transformPath, input, options);
}
