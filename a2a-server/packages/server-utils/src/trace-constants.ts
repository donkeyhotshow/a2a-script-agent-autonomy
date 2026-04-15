/**
 * Cross-service trace correlation (Client API → A2A Server → AI Hub).
 * Keep header name aligned with `a2a-client/packages/shared/a2a-trace-constants.mjs`.
 */
export const A2A_TRACE_HEADER = "X-A2A-Trace-Id";

/** Invoke / Request Processor context key (never pass to LLM prompts — stripped in transform pipeline). */
export const A2A_TRACE_CONTEXT_KEY = "a2aTraceId";
