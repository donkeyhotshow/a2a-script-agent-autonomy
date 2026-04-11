/**
 * Core transform pipeline execution (context + step loop).
 */

import { applyOperation, createDefaultFileSystem } from '../operations';
import type {
  TransformPipeline,
  TransformContext,
  TransformResult,
  TransformOptions,
} from '../types';

export async function runTransformPipeline(
  pipeline: TransformPipeline,
  input: Record<string, unknown>,
  options: TransformOptions = {}
): Promise<TransformResult> {
  const $out: Record<string, unknown> = {};

  const context: TransformContext = {
    input,
    $out,
    baseDir: options.baseDir,
    outputDir: options.outputDir,
    fs: options.fs || createDefaultFileSystem(),
  };

  const files: Record<string, string> = {};

  // Validate pipeline structure
  if (!pipeline.steps || !Array.isArray(pipeline.steps)) {
    return {
      output: context.$out,
      files: undefined,
      success: false,
      error: 'Invalid pipeline: steps is not an array',
    };
  }

  try {
    for (const step of pipeline.steps) {
      await applyOperation(step, context);

      if (context.$out._files) {
        Object.assign(files, context.$out._files as Record<string, string>);
      }
    }

    delete context.$out._files;

    return {
      output: context.$out,
      files: Object.keys(files).length > 0 ? files : undefined,
      success: true,
    };
  } catch (error) {
    return {
      output: context.$out,
      files: Object.keys(files).length > 0 ? files : undefined,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
