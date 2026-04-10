/**
 * Load pipeline JSON from disk (file or simulation dir).
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { TransformPipeline } from '../types.js';

export async function loadTransformPipeline(filePath: string): Promise<TransformPipeline> {
  const content = await fs.readFile(filePath, 'utf-8');
  const pipeline = JSON.parse(content) as TransformPipeline;

  if (pipeline.type !== 'pipeline') {
    throw new Error(`Invalid pipeline type: ${pipeline.type}. Expected 'pipeline'.`);
  }

  if (!Array.isArray(pipeline.steps) || pipeline.steps.length === 0) {
    throw new Error('Pipeline must have at least one step.');
  }

  return pipeline;
}

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
