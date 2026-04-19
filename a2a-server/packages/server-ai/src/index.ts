/**
 * @a2a/server-ai — LLM integration and transform pipeline
 *
 * Merged from @a2a/server-llm and @a2a/server-transform (2026-04-19).
 * Single source of truth for all AI/LLM and transform utilities.
 */

// LLM service and AI Hub connectivity
export { llmService, LlmService } from './llm/llm-service.js';
export type { LlmMessage, LlmRequest, LlmResponse, LLMMessage, LLMRequest, LLMResponse } from './llm/llm-service.js';
export { resolveAiHubBaseUrl, resolveAiHubBaseUrlWithModuleEnv, DEFAULT_AI_HUB_URL } from './llm/ai-hub-url.js';
export { fetchAiHubChatJson } from './llm/ai-hub-chat-sync.js';
export { fetchAiHubGenerateText } from './llm/ai-hub-generate.js';

// RAG utilities
export { mergeServerRagPageIntoContext } from './rag/auto-rag-page-server.js';
export { ProgressiveRetriever } from './rag/progressive-retriever.js';

// Prompts
export { getFlowControlHint, attachFlowControlHintToInvokePayload } from './prompts/flow-control-hints.js';

// Transform runtime — types, contracts, operations
export * from './types.js';
export {
  INTERRUPT_TRACE_SLOT_KEY,
  INTERRUPT_TRACE_CONTEXT_PATH,
  GRAY_ROOM_SLOT_KEY,
  SERVER_OWNED_WORKBENCH_SLOT_KEYS,
  mergeInterruptTraceIntoContext,
} from './interrupt-trace-contract.js';

// Transform pipeline — load, run, validate
export {
  runTransformPipeline,
} from './pipeline/run.js';
export {
  loadTransformPipeline,
  loadSimulationTransform,
} from './pipeline/load.js';
export {
  runTransformPipelineFromFile,
  runSimulationTransform,
} from './pipeline/file-runner.js';
export {
  SIMULATION_TO_SCHEMA,
  getPromptsTransformsPath,
  loadPromptsTransform,
  runPromptsTransform,
} from './pipeline/prompts.js';
export { validatePipeline } from './pipeline/validate.js';

// Materialization and normalization helpers
export * from './materialize-result-for-llm.js';
export * from './workbench-normalize.js';
export { mergeGrayRoomSlotIntoContext } from './invoke-shape.js';
export * from './operations.js';
