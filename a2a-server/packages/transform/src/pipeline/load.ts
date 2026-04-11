/**
 * Load pipeline JSON from disk (file or simulation dir).
 */

import * as fs from 'node:fs/promises';
import * as path from 'path';
import type { TransformPipeline } from '../types.js';
import { ALLOWED_TRANSFORM_TYPES } from '../types.js';

/**
 * Load pipeline JSON from disk (file or simulation dir).
 * @param filePath - Absolute path to the pipeline JSON file.
 * @param allowedRoot - If provided, filePath must be contained within this directory (CWE-22/23).
 */
export async function loadTransformPipeline(
  filePath: string,
  allowedRoot?: string
): Promise<TransformPipeline> {
  // CWE-22/23: confine reads to allowedRoot when provided
  if (allowedRoot !== undefined) {
    const root = path.resolve(allowedRoot);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new Error(`Path traversal detected: ${filePath}`);
    }
  }

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
  type: 'request' | 'response',
  allowedRoot?: string
): Promise<TransformPipeline | null> {
  // CWE-22/23: validate type at runtime before interpolating into filename
  if (!ALLOWED_TRANSFORM_TYPES.has(type)) {
    throw new Error(`Invalid transform type: ${type}`);
  }

  // CWE-22/23: confine simulationDir to allowedRoot when provided
  if (allowedRoot !== undefined) {
    const root = path.resolve(allowedRoot);
    const resolved = path.resolve(simulationDir);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new Error(`Path traversal detected in simulationDir: ${simulationDir}`);
    }
  }

  const fileName = `server-transforms-${type}.json`;
  const filePath = path.resolve(simulationDir, fileName);

  try {
    return await loadTransformPipeline(filePath, allowedRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
