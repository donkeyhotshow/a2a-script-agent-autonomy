/**
 * Transform Runtime Module
 * 
 * A runtime for executing JSON transform pipelines defined in server-transform.schema.json.
 * Supports operations: copy, set, append-to-array, parse-json-from-md, render-markdown, switch, apply-scratchpad-ops, apply-workbench-section-ops, truncate-section, pick-context, drop, truncate-history, include-if, pick-files
 * 
 * @example
 * ```typescript
 * import { runTransformPipelineFromFile } from './transform/index.js';
 * 
 * const result = await runTransformPipelineFromFile(
 *   'simulations/coder/3/server-transforms-response.json',
 *   { context: { task: 'test' } }
 * );
 * 
 * console.log(result.output);
 * ```
 */

export * from './types.js';
export * from './jsonpath.js';
export * from './operations.js';
export * from './pipeline.js';
export {
  prepareInvokePayloadForLlmPrompt,
  materializeResultIntoHistoryForLlm,
  formatToolResultForHistory
} from './materialize-result-for-llm.js';
