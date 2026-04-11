/**
 * Transform Runtime Module
 * 
 * A runtime for executing JSON transform pipelines defined in server-transform.schema.json.
 * Supports operations (see `types.ts` discriminated union and `simulations/SCHEMA.md` § Transform operations):
 * copy, set, append-to-array, parse-json-from-md, render-markdown, switch,
 * apply-scratchpad-ops, apply-workbench-section-ops, truncate-section, pick-context, drop,
 * truncate-history, include-if, pick-files, merge-files-to-context, merge-workbench-sections,
 * merge-workbench-slots, summarize-files, for-each
 * 
 * @example
 * ```typescript
 * import { runTransformPipelineFromFile } from './index';
 * 
 * const result = await runTransformPipelineFromFile(
 *   'simulations/agent-coder/3/server-transforms-response.json',
 *   { context: { task: 'test' } }
 * );
 * 
 * console.log(result.output);
 * ```
 */

export * from './types';
export {
    INTERRUPT_TRACE_SLOT_KEY,
    INTERRUPT_TRACE_CONTEXT_PATH,
    GRAY_ROOM_SLOT_KEY,
    SERVER_OWNED_WORKBENCH_SLOT_KEYS,
    mergeInterruptTraceIntoContext,
    mergeGrayRoomSlotIntoContext,
} from './interrupt-trace-contract';
export {query, resolveTemplates} from './operations/json-path';
export * from './operations';
export * from './pipeline';
export {
  prepareInvokePayloadForLlmPrompt,
  materializeResultIntoHistoryForLlm,
  formatToolResultForHistory,
  syncLiveContextHistoryFromResultMessage,
} from './materialize-result-for-llm';
export * from './operation-history';
